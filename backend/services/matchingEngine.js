const User = require('../models/User');
const Match = require('../models/Match');
const { calculateDistanceKm } = require('../utils/geoUtils');
const { calculateUrgency, isDonationExpired } = require('./urgencyEngine');

/**
 * Checks dietary compatibility between donation and NGO profile
 * @param {string} donationDiet 
 * @param {Array<string>} acceptedDiet 
 * @returns {number|null} score 0-100 or null if incompatible
 */
const checkDietaryCompatibility = (donationDiet, acceptedDiet) => {
  if (!acceptedDiet || acceptedDiet.length === 0 || acceptedDiet.includes('ANY')) {
    return 100;
  }

  const diet = donationDiet ? donationDiet.toUpperCase() : 'VEG';

  if (diet === 'VEGAN') {
    if (acceptedDiet.includes('VEGAN') || acceptedDiet.includes('VEG')) return 100;
    return null;
  }

  if (diet === 'VEG') {
    if (acceptedDiet.includes('VEG')) return 100;
    return null;
  }

  if (diet === 'NON_VEG') {
    if (acceptedDiet.includes('NON_VEG')) return 100;
    return null;
  }

  if (diet === 'MIXED') {
    if (acceptedDiet.includes('NON_VEG') && acceptedDiet.includes('VEG')) return 100;
    return null;
  }

  return 80;
};

/**
 * Finds and scores candidate NGOs for a given donation
 * 
 * Weights:
 * - Distance: 30%
 * - Urgency: 25%
 * - NGO capacity: 20%
 * - Food compatibility: 15%
 * - Driver availability: 10%
 * 
 * @param {Object} donation - Mongoose Donation document
 * @param {Array<string>} [excludeNgoIds=[]] - NGO IDs to exclude (for re-matching)
 * @returns {Promise<Array<Object>>} list of created Match proposals
 */
const runMatchingEngine = async (donation, excludeNgoIds = []) => {
  try {
    // 1. Check if donation is already expired
    if (isDonationExpired(donation)) {
      console.warn(`[MatchingEngine] Donation ${donation._id} is expired. Skipping matching.`);
      return [];
    }

    // 2. Fetch candidate NGOs
    const ngoQuery = { role: 'NGO' };
    if (process.env.NODE_ENV === 'production') {
      ngoQuery.isVerified = true;
    }
    if (excludeNgoIds && excludeNgoIds.length > 0) {
      ngoQuery._id = { $nin: excludeNgoIds };
    }

    const ngos = await User.find(ngoQuery);
    if (!ngos || ngos.length === 0) {
      console.warn('[MatchingEngine] No eligible NGOs found.');
      return [];
    }

    const pickupCoords = donation.pickupLocation?.location?.coordinates || [77.209, 28.6139];
    const donationServings = donation.quantity?.estimatedServings || 20;
    const requiresColdChain = donation.perishability?.requiresColdChain || false;

    // 3. Compute driver availability score platform-wide
    const availableDriversCount = await User.countDocuments({
      role: 'DRIVER',
      'driverProfile.isAvailable': true,
    });
    const driverScore = availableDriversCount > 2 ? 100 : availableDriversCount > 0 ? 80 : 20;

    // 4. Calculate Urgency score
    const urgencyData = calculateUrgency(donation.perishability?.expiryTime);
    if (urgencyData.isExpired) {
      return [];
    }
    const urgencyScore = urgencyData.score;

    // 5. Score eligible candidate NGOs
    const candidates = [];

    for (const ngo of ngos) {
      const ngoProfile = ngo.ngoProfile || {};

      // Filter: Food Type Compatibility
      if (
        ngoProfile.acceptedFoodTypes &&
        ngoProfile.acceptedFoodTypes.length > 0 &&
        !ngoProfile.acceptedFoodTypes.includes(donation.foodType)
      ) {
        continue;
      }

      // Filter: Cold-Chain Requirement
      if (requiresColdChain) {
        const hasCold = ngoProfile.storageFacilities?.hasRefrigeration || ngoProfile.storageFacilities?.hasFreezer;
        if (!hasCold) {
          continue;
        }
      }

      // Filter & Score: Dietary Compatibility
      const dietScore = checkDietaryCompatibility(
        donation.dietaryPreference,
        ngoProfile.dietaryRestrictionsAccepted
      );
      if (dietScore === null) {
        continue;
      }
      const compatibilityScore = dietScore;

      // Filter & Score: Capacity
      const dailyCap = ngoProfile.capacityDailyMeals || 100;
      const allocatedCap = ngoProfile.allocatedCapacity || 0;
      const availableCap = Math.max(0, dailyCap - allocatedCap);

      if (availableCap < donationServings) {
        continue; // Cannot take donation exceeding available capacity
      }

      const capacityRatio = Math.min(1, availableCap / (donationServings * 2));
      const capacityScore = Math.round(50 + capacityRatio * 50);

      // Score: Distance
      const ngoCoords = ngo.location?.coordinates || [77.209, 28.6139];
      const distKm = calculateDistanceKm(pickupCoords, ngoCoords);
      // Distance score: 100 at 0km, 0 at 25km
      const distanceScore = Math.max(0, Math.min(100, Math.round(100 - (distKm / 25) * 100)));

      // Composite Weighted Score:
      // Distance: 30%, Urgency: 25%, Capacity: 20%, Compatibility: 15%, Driver: 10%
      const totalScore = Math.round(
        distanceScore * 0.30 +
        urgencyScore * 0.25 +
        capacityScore * 0.20 +
        compatibilityScore * 0.15 +
        driverScore * 0.10
      );

      candidates.push({
        ngo,
        totalScore,
        scoreBreakdown: {
          distanceKm: distKm,
          distanceScore,
          urgencyScore,
          capacityScore,
          compatibilityScore,
          driverScore,
          totalScore,
        },
      });
    }

    if (candidates.length === 0) {
      console.warn('[MatchingEngine] No candidates passed compatibility and capacity filters.');
      return [];
    }

    // 6. Sort by highest score first
    candidates.sort((a, b) => b.totalScore - a.totalScore);

    // 7. Create or update Match proposal for the best candidate(s)
    // We propose to the top match (or top candidates)
    const topCandidates = candidates.slice(0, 3);
    const matchesCreated = [];

    for (const cand of topCandidates) {
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute response window

      let match = await Match.findOne({
        donationId: donation._id,
        ngoId: cand.ngo._id,
      });

      if (!match) {
        match = await Match.create({
          donationId: donation._id,
          ngoId: cand.ngo._id,
          matchScore: cand.totalScore,
          scoreBreakdown: cand.scoreBreakdown,
          status: 'PROPOSED',
          expiresAt,
        });
      } else if (match.status === 'PROPOSED') {
        match.matchScore = cand.totalScore;
        match.scoreBreakdown = cand.scoreBreakdown;
        match.expiresAt = expiresAt;
        await match.save();
      }

      matchesCreated.push(match);
    }

    return matchesCreated;
  } catch (error) {
    console.error('Error running matching engine:', error);
    throw error;
  }
};

module.exports = {
  runMatchingEngine,
  checkDietaryCompatibility,
};

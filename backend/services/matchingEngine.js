const User = require('../models/User');
const Match = require('../models/Match');

const {
  calculateDistanceKm,
} = require('../utils/geoUtils');

const {
  calculateUrgency,
  isDonationExpired,
} = require('./urgencyEngine');

/**
 * Checks dietary compatibility between a donation
 * and an NGO's accepted dietary preferences.
 *
 * @param {string} donationDiet
 * @param {Array<string>} acceptedDiet
 * @returns {number|null} score from 0-100, or null if incompatible
 */
const checkDietaryCompatibility = (
  donationDiet,
  acceptedDiet
) => {
  const accepted = Array.isArray(acceptedDiet)
    ? acceptedDiet.map((value) =>
        typeof value === 'string'
          ? value.trim().toUpperCase()
          : ''
      )
    : [];

  if (
    accepted.length === 0 ||
    accepted.includes('ANY')
  ) {
    return 100;
  }

  const diet =
    typeof donationDiet === 'string' &&
    donationDiet.trim()
      ? donationDiet.trim().toUpperCase()
      : 'VEG';

  if (diet === 'VEGAN') {
    if (
      accepted.includes('VEGAN') ||
      accepted.includes('VEG')
    ) {
      return 100;
    }

    return null;
  }

  if (diet === 'VEG') {
    return accepted.includes('VEG')
      ? 100
      : null;
  }

  if (diet === 'NON_VEG') {
    return accepted.includes('NON_VEG')
      ? 100
      : null;
  }

  if (diet === 'MIXED') {
    const acceptsVeg = accepted.includes('VEG');
    const acceptsNonVeg =
      accepted.includes('NON_VEG');

    return acceptsVeg && acceptsNonVeg
      ? 100
      : null;
  }

  return null;
};

/**
 * Validates GeoJSON coordinates.
 *
 * Coordinates must be:
 * [longitude, latitude]
 */
const isValidCoordinates = (coordinates) => {
  if (
    !Array.isArray(coordinates) ||
    coordinates.length !== 2
  ) {
    return false;
  }

  const [longitude, latitude] = coordinates;

  return (
    typeof longitude === 'number' &&
    typeof latitude === 'number' &&
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
};

/**
 * Normalizes IDs used by the exclusion list.
 */
const normalizeExcludedNgoIds = (ids) => {
  if (!Array.isArray(ids)) {
    return [];
  }

  return ids
    .filter(Boolean)
    .map((id) => id.toString());
};

/**
 * Finds and scores eligible NGOs for a donation.
 *
 * Weights:
 * - Distance: 30%
 * - Urgency: 25%
 * - NGO capacity: 20%
 * - Food compatibility: 15%
 * - Driver availability: 10%
 *
 * @param {Object} donation Mongoose Donation document
 * @param {Array<string>} excludeNgoIds NGO IDs to exclude
 * @returns {Promise<Array<Object>>} created/updated Match proposals
 */
const runMatchingEngine = async (
  donation,
  excludeNgoIds = []
) => {
  try {
    if (!donation?._id) {
      throw new Error(
        'A valid donation is required for matching.'
      );
    }

    /*
     * Matching should only happen while the donation is
     * waiting for an NGO.
     */
    if (donation.status !== 'PENDING_MATCH') {
      console.log(
        `[MatchingEngine] Donation ${donation._id} is in status ${donation.status}. Skipping matching.`
      );

      return [];
    }

    /*
     * Never match expired donations.
     */
    if (isDonationExpired(donation)) {
      console.warn(
        `[MatchingEngine] Donation ${donation._id} is expired. Skipping matching.`
      );

      return [];
    }

    /*
     * Pickup coordinates are mandatory for distance-based
     * matching. Never substitute fake coordinates.
     */
    const pickupCoords =
      donation.pickupLocation?.location
        ?.coordinates;

    if (!isValidCoordinates(pickupCoords)) {
      console.warn(
        `[MatchingEngine] Donation ${donation._id} has invalid pickup coordinates.`
      );

      return [];
    }

    const donationServings = Number(
      donation.quantity?.estimatedServings
    );

    if (
      !Number.isFinite(donationServings) ||
      donationServings <= 0
    ) {
      console.warn(
        `[MatchingEngine] Donation ${donation._id} has invalid serving quantity.`
      );

      return [];
    }

    const requiresColdChain =
      donation.perishability
        ?.requiresColdChain === true;

    /*
     * Always require verified NGOs.
     *
     * Verification is a business rule, not a production-only
     * security feature, because unverified NGOs are prevented
     * from accepting matches elsewhere in the application.
     */
    const ngoQuery = {
      role: 'NGO',
      isVerified: true,
    };

    const excludedIds =
      normalizeExcludedNgoIds(excludeNgoIds);

    if (excludedIds.length > 0) {
      ngoQuery._id = {
        $nin: excludedIds,
      };
    }

    const ngos = await User.find(ngoQuery).lean();

    if (!ngos.length) {
      console.warn(
        '[MatchingEngine] No eligible verified NGOs found.'
      );

      return [];
    }

    /*
     * Only verified and available drivers should influence
     * the driver-availability score.
     */
    const availableDriversCount =
      await User.countDocuments({
        role: 'DRIVER',
        isVerified: true,
        'driverProfile.isAvailable': true,
      });

    const driverScore =
      availableDriversCount > 2
        ? 100
        : availableDriversCount > 0
          ? 80
          : 20;

    /*
     * Calculate urgency once for all candidates.
     */
    const urgencyData = calculateUrgency(
      donation.perishability?.expiryTime
    );

    if (urgencyData.isExpired) {
      return [];
    }

    const urgencyScore =
      Math.max(
        0,
        Math.min(
          100,
          Number(urgencyData.score) || 0
        )
      );

    const candidates = [];

    for (const ngo of ngos) {
      const ngoProfile = ngo.ngoProfile || {};

      /*
       * NGO location is required for distance matching.
       * Do not use a fake/default location.
       */
      const ngoCoords =
        ngo.location?.coordinates;

      if (!isValidCoordinates(ngoCoords)) {
        continue;
      }

      /*
       * Food-type compatibility.
       *
       * An NGO with an empty acceptedFoodTypes array is
       * treated as accepting all supported food types.
       */
      const acceptedFoodTypes =
        Array.isArray(
          ngoProfile.acceptedFoodTypes
        )
          ? ngoProfile.acceptedFoodTypes
          : [];

      if (
        acceptedFoodTypes.length > 0 &&
        !acceptedFoodTypes.includes(
          donation.foodType
        )
      ) {
        continue;
      }

      /*
       * Cold-chain compatibility.
       */
      if (requiresColdChain) {
        const hasRefrigeration =
          ngoProfile.storageFacilities
            ?.hasRefrigeration === true;

        const hasFreezer =
          ngoProfile.storageFacilities
            ?.hasFreezer === true;

        if (
          !hasRefrigeration &&
          !hasFreezer
        ) {
          continue;
        }
      }

      /*
       * Dietary compatibility.
       */
      const compatibilityScore =
        checkDietaryCompatibility(
          donation.dietaryPreference,
          ngoProfile.dietaryRestrictionsAccepted
        );

      if (compatibilityScore === null) {
        continue;
      }

      /*
       * Capacity compatibility.
       */
      const dailyCapacity = Number(
        ngoProfile.capacityDailyMeals
      );

      const allocatedCapacity = Number(
        ngoProfile.allocatedCapacity
      );

      const safeDailyCapacity =
        Number.isFinite(dailyCapacity) &&
        dailyCapacity >= 0
          ? dailyCapacity
          : 0;

      const safeAllocatedCapacity =
        Number.isFinite(allocatedCapacity) &&
        allocatedCapacity >= 0
          ? allocatedCapacity
          : 0;

      const availableCapacity = Math.max(
        0,
        safeDailyCapacity - safeAllocatedCapacity
      );

      if (
        availableCapacity < donationServings
      ) {
        continue;
      }

      /*
       * Capacity score:
       * - 50 when available capacity is exactly
       *   the donation size
       * - up to 100 when capacity is at least
       *   twice the donation size
       */
      const capacityRatio =
        Math.min(
          1,
          availableCapacity /
            (donationServings * 2)
        );

      const capacityScore = Math.round(
        50 + capacityRatio * 50
      );

      /*
       * Distance score:
       * - 100 at 0 km
       * - 0 at 25 km or more
       */
      const distanceKm =
        calculateDistanceKm(
          pickupCoords,
          ngoCoords
        );

      if (
        !Number.isFinite(distanceKm) ||
        distanceKm < 0
      ) {
        continue;
      }

      const distanceScore = Math.max(
        0,
        Math.min(
          100,
          Math.round(
            100 -
              (distanceKm / 25) * 100
          )
        )
      );

      /*
       * Weighted composite score.
       */
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
          distanceKm,
          distanceScore,
          urgencyScore,
          capacityScore,
          compatibilityScore,
          driverScore,
          totalScore,
        },
      });
    }

    if (!candidates.length) {
      console.warn(
        '[MatchingEngine] No candidates passed compatibility, capacity, and location filters.'
      );

      return [];
    }

    /*
     * Highest score first.
     *
     * Use NGO ID as a deterministic tie-breaker so equal
     * scores do not produce unpredictable ordering.
     */
    candidates.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }

      return a.ngo._id
        .toString()
        .localeCompare(
          b.ngo._id.toString()
        );
    });

    /*
     * Propose to the top three candidates.
     *
     * The acceptance controller decides which NGO actually
     * gets the donation and atomically reserves capacity.
     */
    const topCandidates =
      candidates.slice(0, 3);

    const matchesCreated = [];

    for (const candidate of topCandidates) {
      /*
       * Check the donation again before each proposal.
       *
       * This protects against a match engine that continues
       * after another process has already accepted a match.
       */
      const currentDonationStatus =
        await require('../models/Donation')
          .findById(donation._id)
          .select('status')
          .lean();

      if (
        !currentDonationStatus ||
        currentDonationStatus.status !==
          'PENDING_MATCH'
      ) {
        break;
      }

      const expiresAt = new Date(
        Date.now() + 15 * 60 * 1000
      );

      /*
       * Upsert avoids the find-then-create race that can
       * occur when two matching jobs run simultaneously.
       */
      const match =
        await Match.findOneAndUpdate(
          {
            donationId: donation._id,
            ngoId: candidate.ngo._id,
          },
          {
            $set: {
              matchScore:
                candidate.totalScore,
              scoreBreakdown:
                candidate.scoreBreakdown,
              expiresAt,
            },
            $setOnInsert: {
              status: 'PROPOSED',
            },
          },
          {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true,
          }
        );

      /*
       * Do not overwrite an already accepted/declined/
       * expired match.
       *
       * The query above can return such an existing match,
       * so only return active PROPOSED matches.
       */
      if (match.status === 'PROPOSED') {
        matchesCreated.push(match);
      }
    }

    return matchesCreated;
  } catch (error) {
    console.error(
      '[MatchingEngine] Error running matching engine:',
      error
    );

    throw error;
  }
};

module.exports = {
  runMatchingEngine,
  checkDietaryCompatibility,
};
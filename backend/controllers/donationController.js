const mongoose = require('mongoose');
const Donation = require('../models/Donation');
const { runMatchingEngine } = require('../services/matchingEngine');
const { calculateUrgency, enrichDonationWithUrgency } = require('../services/urgencyEngine');
const { sanitizeDonation, sanitizeDonationsList } = require('../utils/sanitize');
const { emitDonationCreated, emitMatchProposed } = require('../utils/socketEmitter');

// Helper to generate a 4-digit OTP
const generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString();

// @desc Create a surplus food donation
// @route POST /api/donations
const createDonation = async (req, res) => {
  try {
    const {
      title,
      description,
      foodType,
      dietaryPreference,
      quantity,
      perishability,
      pickupLocation,
      images,
    } = req.body;

    if (!title || !foodType || !quantity?.amount) {
      return res.status(400).json({ success: false, message: 'Please provide title, food type, and quantity.' });
    }

    const estimatedServings = quantity.estimatedServings || Math.round(quantity.amount * 2);
    const estimatedWeightKg = quantity.estimatedWeightKg || (quantity.unit === 'KG' ? quantity.amount : Math.round(quantity.amount * 0.4));

    // Calculate expiry date
    const expiryHours = perishability?.expiryHours || 4;
    const expiryTime = perishability?.expiryTime ? new Date(perishability.expiryTime) : new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    if (expiryTime.getTime() <= Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create an expired donation. Expiry time must be in the future.',
      });
    }

    const urgencyData = calculateUrgency(expiryTime);

    const coords = pickupLocation?.coordinates && pickupLocation.coordinates.length === 2
      ? pickupLocation.coordinates
      : req.user.location?.coordinates || [77.209, 28.6139];

    const donation = await Donation.create({
      donorId: req.user._id,
      title,
      description: description || '',
      foodType,
      dietaryPreference: dietaryPreference || 'VEG',
      quantity: {
        amount: quantity.amount,
        unit: quantity.unit || 'SERVINGS',
        estimatedServings,
        estimatedWeightKg,
      },
      perishability: {
        preparedAt: perishability?.preparedAt || new Date(),
        expiryTime,
        requiresColdChain: perishability?.requiresColdChain || false,
      },
      urgencyLevel: urgencyData.level,
      pickupLocation: {
        address: pickupLocation?.address || req.user.address?.formattedAddress || 'Main Street, City Center',
        contactPhone: pickupLocation?.contactPhone || req.user.phone,
        instructions: pickupLocation?.instructions || '',
        location: {
          type: 'Point',
          coordinates: coords,
        },
      },
      images: images || [],
      status: 'PENDING_MATCH',
      pickupOtp: generateOtp(),
      deliveryOtp: generateOtp(),
    });

    // Run matching engine
    const matches = await runMatchingEngine(donation);

    // Emit socket notifications
    emitDonationCreated(donation);
    for (const match of matches) {
      await emitMatchProposed(match, donation, match.ngoId);
    }

    const enriched = enrichDonationWithUrgency(donation);
    const sanitized = sanitizeDonation(enriched, req.user);

    return res.status(201).json({
      success: true,
      donation: sanitized,
      matchesFound: matches.length,
      urgency: urgencyData,
      message: `Donation created and matched with ${matches.length} candidate shelter(s).`,
    });
  } catch (error) {
    console.error('Create donation error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get donations for the authenticated donor
// @route GET /api/donations/my
const getMyDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ donorId: req.user._id })
      .populate('matchedNgoId', 'name phone address location')
      .populate('assignedDriverId', 'name phone driverProfile')
      .populate('activeDeliveryId')
      .sort({ createdAt: -1 });

    const enriched = donations.map((d) => enrichDonationWithUrgency(d));
    const sanitized = sanitizeDonationsList(enriched, req.user);

    return res.status(200).json({ success: true, donations: sanitized });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get all donations (with optional filter)
// @route GET /api/donations
const getAllDonations = async (req, res) => {
  try {
    const { status, foodType } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (foodType) filter.foodType = foodType;

    const donations = await Donation.find(filter)
      .populate('donorId', 'name phone address')
      .populate('matchedNgoId', 'name phone address')
      .populate('assignedDriverId', 'name phone driverProfile')
      .sort({ createdAt: -1 });

    const enriched = donations.map((d) => enrichDonationWithUrgency(d));
    const sanitized = sanitizeDonationsList(enriched, req.user);

    return res.status(200).json({ success: true, donations: sanitized });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get single donation
// @route GET /api/donations/:id
const getDonationById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid donation ID.' });
    }

    const donation = await Donation.findById(req.params.id)
      .populate('donorId', 'name phone address location')
      .populate('matchedNgoId', 'name phone address location')
      .populate('assignedDriverId', 'name phone driverProfile')
      .populate('activeDeliveryId');

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found.' });
    }

    const enriched = enrichDonationWithUrgency(donation);
    const sanitized = sanitizeDonation(enriched, req.user);

    return res.status(200).json({ success: true, donation: sanitized });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createDonation,
  getMyDonations,
  getAllDonations,
  getDonationById,
};

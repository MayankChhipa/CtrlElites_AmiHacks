const mongoose = require('mongoose');
const crypto = require('crypto');

const Donation = require('../models/Donation');
const { runMatchingEngine } = require('../services/matchingEngine');
const {
  calculateUrgency,
  enrichDonationWithUrgency,
} = require('../services/urgencyEngine');
const {
  sanitizeDonation,
  sanitizeDonationsList,
} = require('../utils/sanitize');
const {
  emitDonationCreated,
  emitMatchProposed,
} = require('../utils/socketEmitter');

/**
 * Generate a cryptographically stronger 4-digit OTP.
 */
const generateOtp = () =>
  crypto.randomInt(1000, 10000).toString();

/**
 * Get authenticated user's ID regardless of whether
 * req.user is a Mongoose document or JWT payload.
 */
const getUserId = (req) =>
  req.user?._id || req.user?.id || null;

/**
 * Validate GeoJSON-style coordinates.
 *
 * Format:
 * [longitude, latitude]
 */
const isValidCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
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
 * Convert values to positive numbers safely.
 */
const toPositiveNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) && number > 0
    ? number
    : null;
};

/**
 * Safely parse a date.
 */
const parseDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
};

/**
 * Send a generic server error instead of leaking
 * internal/database error details.
 */
const sendServerError = (res, error, context) => {
  console.error(`${context}:`, error);

  return res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred.',
  });
};

/**
 * Check whether a user can access a specific donation.
 */
const canAccessDonation = (donation, user) => {
  if (!donation || !user) return false;

  const role = String(user.role || '').toUpperCase();

  if (role === 'ADMIN') {
    return true;
  }

  const userId = String(user._id || user.id || '');

  if (!userId) return false;

  const donorId = donation.donorId?._id || donation.donorId;
  const matchedNgoId =
    donation.matchedNgoId?._id || donation.matchedNgoId;
  const assignedDriverId =
    donation.assignedDriverId?._id || donation.assignedDriverId;

  return (
    String(donorId || '') === userId ||
    String(matchedNgoId || '') === userId ||
    String(assignedDriverId || '') === userId
  );
};

/**
 * @desc Create a surplus food donation
 * @route POST /api/donations
 */
const createDonation = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const {
      title,
      description,
      foodType,
      dietaryPreference,
      quantity,
      perishability,
      pickupLocation,
      images,
    } = req.body || {};

    // ---------------------------------------------------------
    // Basic validation
    // ---------------------------------------------------------

    if (
      typeof title !== 'string' ||
      !title.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Donation title is required.',
      });
    }

    if (
      typeof foodType !== 'string' ||
      !foodType.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Food type is required.',
      });
    }

    if (!quantity || typeof quantity !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Quantity information is required.',
      });
    }

    const amount = toPositiveNumber(quantity.amount);

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Quantity amount must be greater than zero.',
      });
    }

    // ---------------------------------------------------------
    // Quantity calculations
    // ---------------------------------------------------------

    const unit =
      typeof quantity.unit === 'string' &&
      quantity.unit.trim()
        ? quantity.unit.trim().toUpperCase()
        : 'SERVINGS';

    const providedServings = Number(
      quantity.estimatedServings
    );

    const estimatedServings =
      Number.isFinite(providedServings) &&
      providedServings > 0
        ? Math.round(providedServings)
        : Math.max(1, Math.round(amount * 2));

    const providedWeight = Number(
      quantity.estimatedWeightKg
    );

    const estimatedWeightKg =
      Number.isFinite(providedWeight) &&
      providedWeight > 0
        ? providedWeight
        : unit === 'KG'
          ? amount
          : Math.max(0.1, Number((amount * 0.4).toFixed(2)));

    // ---------------------------------------------------------
    // Perishability / expiry validation
    // ---------------------------------------------------------

    const expiryHours =
      perishability?.expiryHours !== undefined
        ? Number(perishability.expiryHours)
        : 4;

    if (
      perishability?.expiryHours !== undefined &&
      (!Number.isFinite(expiryHours) || expiryHours <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Expiry hours must be greater than zero.',
      });
    }

    let expiryTime;

    if (perishability?.expiryTime) {
      expiryTime = parseDate(perishability.expiryTime);

      if (!expiryTime) {
        return res.status(400).json({
          success: false,
          message: 'Invalid expiry time.',
        });
      }
    } else {
      expiryTime = new Date(
        Date.now() + expiryHours * 60 * 60 * 1000
      );
    }

    if (expiryTime.getTime() <= Date.now()) {
      return res.status(400).json({
        success: false,
        message:
          'Expiry time must be in the future.',
      });
    }

    const preparedAt = perishability?.preparedAt
      ? parseDate(perishability.preparedAt)
      : new Date();

    if (!preparedAt) {
      return res.status(400).json({
        success: false,
        message: 'Invalid preparation time.',
      });
    }

    if (preparedAt.getTime() > Date.now()) {
      return res.status(400).json({
        success: false,
        message:
          'Preparation time cannot be in the future.',
      });
    }

    // ---------------------------------------------------------
    // Pickup location validation
    // ---------------------------------------------------------

    const suppliedCoordinates =
      pickupLocation?.coordinates;

    const userCoordinates =
      req.user?.location?.coordinates;

    let coordinates;

    if (suppliedCoordinates !== undefined) {
      if (!isValidCoordinates(suppliedCoordinates)) {
        return res.status(400).json({
          success: false,
          message:
            'Pickup coordinates must be [longitude, latitude].',
        });
      }

      coordinates = suppliedCoordinates;
    } else if (isValidCoordinates(userCoordinates)) {
      coordinates = userCoordinates;
    } else {
      return res.status(400).json({
        success: false,
        message:
          'A valid pickup location is required.',
      });
    }

    // ---------------------------------------------------------
    // Pickup address / contact validation
    // ---------------------------------------------------------

    const pickupAddress =
      typeof pickupLocation?.address === 'string' &&
      pickupLocation.address.trim()
        ? pickupLocation.address.trim()
        : req.user?.address?.formattedAddress;

    if (
      typeof pickupAddress !== 'string' ||
      !pickupAddress.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'A pickup address is required.',
      });
    }

    const contactPhone =
      typeof pickupLocation?.contactPhone === 'string' &&
      pickupLocation.contactPhone.trim()
        ? pickupLocation.contactPhone.trim()
        : req.user?.phone;

    if (
      typeof contactPhone !== 'string' ||
      !contactPhone.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'A pickup contact phone number is required.',
      });
    }

    // ---------------------------------------------------------
    // Images validation
    // ---------------------------------------------------------

    if (
      images !== undefined &&
      !Array.isArray(images)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Images must be an array.',
      });
    }

    const donationImages = Array.isArray(images)
      ? images
      : [];

    // ---------------------------------------------------------
    // Urgency calculation
    // ---------------------------------------------------------

    const urgencyData =
      calculateUrgency(expiryTime);

    // ---------------------------------------------------------
    // Create donation
    // ---------------------------------------------------------

    const donation = await Donation.create({
      donorId: userId,

      title: title.trim(),

      description:
        typeof description === 'string'
          ? description.trim()
          : '',

      foodType: foodType.trim(),

      dietaryPreference:
        typeof dietaryPreference === 'string' &&
        dietaryPreference.trim()
          ? dietaryPreference.trim().toUpperCase()
          : 'VEG',

      quantity: {
        amount,
        unit,
        estimatedServings,
        estimatedWeightKg,
      },

      perishability: {
        preparedAt,
        expiryTime,
        requiresColdChain:
          perishability?.requiresColdChain === true,
      },

      urgencyLevel: urgencyData.level,

      pickupLocation: {
        address: pickupAddress.trim(),
        contactPhone: contactPhone.trim(),
        instructions:
          typeof pickupLocation?.instructions === 'string'
            ? pickupLocation.instructions.trim()
            : '',
        location: {
          type: 'Point',
          coordinates,
        },
      },

      images: donationImages,

      status: 'PENDING_MATCH',

      pickupOtp: generateOtp(),
      deliveryOtp: generateOtp(),
    });

    // ---------------------------------------------------------
    // Run matching engine
    // ---------------------------------------------------------

    let matches = [];

    try {
      matches = await runMatchingEngine(donation);

      if (!Array.isArray(matches)) {
        matches = [];
      }
    } catch (matchingError) {
      console.error(
        'Donation matching engine error:',
        matchingError
      );

      // Donation itself was successfully created.
      // Do not pretend creation failed merely because
      // matching could not be completed.
      matches = [];
    }

    // ---------------------------------------------------------
    // Socket notifications
    // ---------------------------------------------------------

    try {
      emitDonationCreated(donation);

      for (const match of matches) {
        if (!match?.ngoId) continue;

        await emitMatchProposed(
          match,
          donation,
          match.ngoId
        );
      }
    } catch (socketError) {
      // Socket failures should not invalidate a successful
      // database operation.
      console.error(
        'Donation socket notification error:',
        socketError
      );
    }

    // ---------------------------------------------------------
    // Response
    // ---------------------------------------------------------

    const enriched =
      enrichDonationWithUrgency(donation);

    const sanitized =
      sanitizeDonation(enriched, req.user);

    return res.status(201).json({
      success: true,
      donation: sanitized,
      matchesFound: matches.length,
      urgency: urgencyData,
      message:
        matches.length > 0
          ? `Donation created and matched with ${matches.length} candidate shelter(s).`
          : 'Donation created successfully. No matching shelter was found yet.',
    });
  } catch (error) {
    // Duplicate/validation errors from Mongo/Mongoose
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          'A donation with the provided information already exists.',
      });
    }

    if (error?.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message:
          'Donation data failed validation.',
      });
    }

    return sendServerError(
      res,
      error,
      'Create donation error'
    );
  }
};

/**
 * @desc Get donations for the authenticated donor
 * @route GET /api/donations/my
 */
const getMyDonations = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const donations = await Donation.find({
      donorId: userId,
    })
      .populate(
        'matchedNgoId',
        'name phone address location'
      )
      .populate(
        'assignedDriverId',
        'name phone driverProfile'
      )
      .populate('activeDeliveryId')
      .sort({ createdAt: -1 });

    const enriched = donations.map((donation) =>
      enrichDonationWithUrgency(donation)
    );

    const sanitized = sanitizeDonationsList(
      enriched,
      req.user
    );

    return res.status(200).json({
      success: true,
      donations: sanitized,
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      'Get my donations error'
    );
  }
};

/**
 * @desc Get all donations with optional filters
 * @route GET /api/donations
 */
const getAllDonations = async (req, res) => {
  try {
    const {
      status,
      foodType,
    } = req.query;

    const filter = {};

    if (
      typeof status === 'string' &&
      status.trim()
    ) {
      filter.status = status.trim().toUpperCase();
    }

    if (
      typeof foodType === 'string' &&
      foodType.trim()
    ) {
      filter.foodType = foodType.trim();
    }

    const donations = await Donation.find(filter)
      .populate(
        'donorId',
        'name phone address'
      )
      .populate(
        'matchedNgoId',
        'name phone address'
      )
      .populate(
        'assignedDriverId',
        'name phone driverProfile'
      )
      .sort({ createdAt: -1 });

    const enriched = donations.map((donation) =>
      enrichDonationWithUrgency(donation)
    );

    const sanitized = sanitizeDonationsList(
      enriched,
      req.user
    );

    return res.status(200).json({
      success: true,
      donations: sanitized,
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      'Get all donations error'
    );
  }
};

/**
 * @desc Get a single donation
 * @route GET /api/donations/:id
 */
const getDonationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid donation ID.',
      });
    }

    const donation = await Donation.findById(id)
      .populate(
        'donorId',
        'name phone address location'
      )
      .populate(
        'matchedNgoId',
        'name phone address location'
      )
      .populate(
        'assignedDriverId',
        'name phone driverProfile'
      )
      .populate('activeDeliveryId');

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found.',
      });
    }

    // Prevent arbitrary authenticated users from
    // viewing another user's donation.
    if (!canAccessDonation(donation, req.user)) {
      return res.status(403).json({
        success: false,
        message:
          'You are not authorized to view this donation.',
      });
    }

    const enriched =
      enrichDonationWithUrgency(donation);

    const sanitized =
      sanitizeDonation(enriched, req.user);

    return res.status(200).json({
      success: true,
      donation: sanitized,
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      'Get donation by ID error'
    );
  }
};

module.exports = {
  createDonation,
  getMyDonations,
  getAllDonations,
  getDonationById,
};
const mongoose = require('mongoose');

const Delivery = require('../models/Delivery');
const Donation = require('../models/Donation');
const User = require('../models/User');
const ImpactLog = require('../models/ImpactLog');

const { calculateRouteAndEta } = require('../services/routingService');
const {
  sanitizeDonation,
  sanitizeDonationsList,
} = require('../utils/sanitize');

const {
  emitDriverAssigned,
  emitDriverEnRoute,
  emitDriverArrived,
  emitPickupConfirmed,
  emitDeliveryInTransit,
  emitDeliveryCompleted,
  emitDeliveryVerified,
} = require('../utils/socketEmitter');

// --------------------------------------------------
// DELIVERY STATUS TRANSITIONS
// --------------------------------------------------

const LEGAL_TRANSITIONS = {
  ASSIGNED: ['EN_ROUTE_TO_PICKUP', 'CANCELLED'],
  EN_ROUTE_TO_PICKUP: ['ARRIVED_AT_PICKUP', 'CANCELLED'],
  ARRIVED_AT_PICKUP: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['EN_ROUTE_TO_DELIVERY', 'CANCELLED'],
  EN_ROUTE_TO_DELIVERY: ['ARRIVED_AT_DROPOFF', 'CANCELLED'],
  ARRIVED_AT_DROPOFF: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['VERIFIED'],
  VERIFIED: [],
  CANCELLED: [],
};

const ACTIVE_DELIVERY_STATUSES = [
  'ASSIGNED',
  'EN_ROUTE_TO_PICKUP',
  'ARRIVED_AT_PICKUP',
  'PICKED_UP',
  'EN_ROUTE_TO_DELIVERY',
  'ARRIVED_AT_DROPOFF',
];

const getUserId = (req) => req.user?._id || req.user?.id;

const isAdmin = (req) => req.user?.role === 'ADMIN';

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const validateTransition = (currentStatus, targetStatus) => {
  const allowed = LEGAL_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
};

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

const canAccessDelivery = (delivery, req) => {
  if (isAdmin(req)) {
    return true;
  }

  const userId = getUserId(req);

  if (!userId) {
    return false;
  }

  const userIdString = String(userId);

  return [
    delivery.driverId,
    delivery.donorId,
    delivery.ngoId,
  ].some(
    (id) => id && String(id) === userIdString
  );
};

const isAssignedDriver = (delivery, req) => {
  const userId = getUserId(req);

  return (
    userId &&
    delivery.driverId &&
    String(delivery.driverId) === String(userId)
  );
};

const isOtpBypassAllowed = () =>
  process.env.NODE_ENV !== 'production' &&
  process.env.ALLOW_OTP_BYPASS === 'true';

const sendServerError = (res, error, context) => {
  console.error(`${context}:`, error);

  return res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred.',
  });
};

// --------------------------------------------------
// GET AVAILABLE DELIVERIES
// --------------------------------------------------

// @desc Get available deliveries for drivers
// @route GET /api/deliveries/available
const getAvailableDeliveries = async (req, res) => {
  try {
    const donations = await Donation.find({
      status: 'MATCHED',
      $or: [
        { assignedDriverId: null },
        { assignedDriverId: { $exists: false } },
      ],
    })
      .populate('donorId', 'name phone address location')
      .populate('matchedNgoId', 'name phone address location')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      available: sanitizeDonationsList(donations, req.user),
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      'Error fetching available deliveries'
    );
  }
};

// --------------------------------------------------
// CLAIM DELIVERY
// --------------------------------------------------

// @desc Driver claims a matched donation
// @route POST /api/deliveries/:donationId/claim
const claimDelivery = async (req, res) => {
  let donation = null;
  let delivery = null;
  let driverId = null;

  try {
    const { donationId } = req.params;
    driverId = getUserId(req);

    if (!isValidObjectId(donationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid donation ID.',
      });
    }

    if (!driverId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // --------------------------------------------------
    // 1. Verify driver
    // --------------------------------------------------

    const driver = await User.findById(driverId);

    if (!driver || driver.role !== 'DRIVER') {
      return res.status(403).json({
        success: false,
        message: 'Only drivers can claim deliveries.',
      });
    }

    if (
      driver.driverProfile?.isAvailable === false ||
      driver.driverProfile?.activeDeliveryId
    ) {
      return res.status(400).json({
        success: false,
        message:
          'You already have an active assigned delivery. Complete or cancel it before claiming another.',
      });
    }

    // --------------------------------------------------
    // 2. Atomically claim the donation
    // --------------------------------------------------

    donation = await Donation.findOneAndUpdate(
      {
        _id: donationId,
        status: 'MATCHED',
        $or: [
          { assignedDriverId: null },
          { assignedDriverId: { $exists: false } },
        ],
      },
      {
        $set: {
          status: 'DRIVER_ASSIGNED',
          assignedDriverId: driverId,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate('donorId')
      .populate('matchedNgoId');

    if (!donation) {
      return res.status(409).json({
        success: false,
        message:
          'This delivery is no longer available or was already claimed by another driver.',
      });
    }

    // --------------------------------------------------
    // 3. Validate coordinates
    // --------------------------------------------------

    const pickupCoords =
      donation.pickupLocation?.location?.coordinates;

    const dropoffCoords =
      donation.matchedNgoId?.location?.coordinates;

    if (!isValidCoordinates(pickupCoords)) {
      await Donation.findOneAndUpdate(
        {
          _id: donation._id,
          assignedDriverId: driverId,
          status: 'DRIVER_ASSIGNED',
        },
        {
          $set: {
            status: 'MATCHED',
            assignedDriverId: null,
            activeDeliveryId: null,
          },
        }
      );

      return res.status(400).json({
        success: false,
        message:
          'The donation pickup location is missing or invalid.',
      });
    }

    if (!isValidCoordinates(dropoffCoords)) {
      await Donation.findOneAndUpdate(
        {
          _id: donation._id,
          assignedDriverId: driverId,
          status: 'DRIVER_ASSIGNED',
        },
        {
          $set: {
            status: 'MATCHED',
            assignedDriverId: null,
            activeDeliveryId: null,
          },
        }
      );

      return res.status(400).json({
        success: false,
        message:
          'The receiving shelter location is missing or invalid.',
      });
    }

    // --------------------------------------------------
    // 4. Calculate route
    // --------------------------------------------------

    const routeSummary = await calculateRouteAndEta(
      pickupCoords,
      dropoffCoords
    );

    // --------------------------------------------------
    // 5. OPTION ONE:
    // Reuse an existing cancelled Delivery
    // --------------------------------------------------

    delivery = await Delivery.findOneAndUpdate(
      {
        donationId: donation._id,
        status: 'CANCELLED',
      },
      {
        $set: {
          driverId,
          donorId: donation.donorId._id,
          ngoId: donation.matchedNgoId._id,
          status: 'ASSIGNED',
          pickupCoords,
          dropoffCoords,
          routeSummary,
          currentLocation: {
            type: 'Point',
            coordinates: pickupCoords,
          },
          breadcrumbs: [],
          pickupConfirmedAt: null,
          deliveredConfirmedAt: null,
          proofOfDelivery: {},
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    // --------------------------------------------------
    // 6. If no cancelled delivery exists, create one
    // --------------------------------------------------

    if (!delivery) {
      try {
        delivery = await Delivery.create({
          donationId: donation._id,
          driverId,
          donorId: donation.donorId._id,
          ngoId: donation.matchedNgoId._id,
          status: 'ASSIGNED',
          pickupCoords,
          dropoffCoords,
          routeSummary,
          currentLocation: {
            type: 'Point',
            coordinates: pickupCoords,
          },
          breadcrumbs: [],
        });
      } catch (createError) {
        /*
         * Because donationId is unique in Delivery, a duplicate-key
         * error can happen if a cancelled Delivery appeared between
         * the previous lookup and creation.
         *
         * Try to reuse that cancelled Delivery.
         */
        if (createError.code === 11000) {
          delivery = await Delivery.findOneAndUpdate(
            {
              donationId: donation._id,
              status: 'CANCELLED',
            },
            {
              $set: {
                driverId,
                donorId: donation.donorId._id,
                ngoId: donation.matchedNgoId._id,
                status: 'ASSIGNED',
                pickupCoords,
                dropoffCoords,
                routeSummary,
                currentLocation: {
                  type: 'Point',
                  coordinates: pickupCoords,
                },
                breadcrumbs: [],
                pickupConfirmedAt: null,
                deliveredConfirmedAt: null,
                proofOfDelivery: {},
              },
            },
            {
              new: true,
              runValidators: true,
            }
          );
        }

        if (!delivery) {
          throw createError;
        }
      }
    }

    // --------------------------------------------------
    // 7. Link active delivery to donation
    // --------------------------------------------------

    donation.activeDeliveryId = delivery._id;
    await donation.save();

    // --------------------------------------------------
    // 8. Mark driver unavailable
    // --------------------------------------------------

    await User.findByIdAndUpdate(
      driverId,
      {
        $set: {
          'driverProfile.isAvailable': false,
          'driverProfile.activeDeliveryId': delivery._id,
        },
      },
      {
        runValidators: true,
      }
    );

    // --------------------------------------------------
    // 9. Emit event
    // --------------------------------------------------

    await emitDriverAssigned(delivery, donation);

    return res.status(201).json({
      success: true,
      message:
        'Delivery claimed successfully! Head to the pickup location.',
      delivery,
      donation: sanitizeDonation(donation, req.user),
    });
  } catch (error) {
    console.error('Error claiming delivery:', error);

    /*
     * Roll back the donation claim if something failed after the
     * atomic assignment.
     */
    if (donation?._id && driverId) {
      try {
        await Donation.findOneAndUpdate(
          {
            _id: donation._id,
            assignedDriverId: driverId,
            status: 'DRIVER_ASSIGNED',
          },
          {
            $set: {
              status: 'MATCHED',
              assignedDriverId: null,
              activeDeliveryId: null,
            },
          }
        );

        if (delivery?._id) {
          await Delivery.findOneAndUpdate(
            {
              _id: delivery._id,
              driverId,
            },
            {
              $set: {
                status: 'CANCELLED',
              },
            }
          );
        }

        await User.findByIdAndUpdate(driverId, {
          $set: {
            'driverProfile.isAvailable': true,
            'driverProfile.activeDeliveryId': null,
          },
        });
      } catch (rollbackError) {
        console.error(
          'Delivery claim rollback failed:',
          rollbackError
        );
      }
    }

    return sendServerError(
      res,
      error,
      'Error claiming delivery'
    );
  }
};

// --------------------------------------------------
// START EN ROUTE TO PICKUP
// --------------------------------------------------

// @desc Driver starts route to pickup location
// @route POST /api/deliveries/:deliveryId/en-route-pickup
const startEnRoutePickup = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    if (!isValidObjectId(deliveryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery ID.',
      });
    }

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found.',
      });
    }

    if (
      !isAssignedDriver(delivery, req) &&
      !isAdmin(req)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized.',
      });
    }

    if (
      !validateTransition(
        delivery.status,
        'EN_ROUTE_TO_PICKUP'
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Illegal transition from ${delivery.status} to EN_ROUTE_TO_PICKUP.`,
      });
    }

    delivery.status = 'EN_ROUTE_TO_PICKUP';
    await delivery.save();

    await emitDriverEnRoute(
      delivery,
      'PICKUP',
      delivery.donationId
    );

    return res.status(200).json({
      success: true,
      message: 'En route to pickup location.',
      delivery,
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      'Error starting pickup route'
    );
  }
};

// --------------------------------------------------
// ARRIVE AT PICKUP
// --------------------------------------------------

// @desc Driver arrives at pickup location
// @route POST /api/deliveries/:deliveryId/arrived-pickup
const arriveAtPickup = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    if (!isValidObjectId(deliveryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery ID.',
      });
    }

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found.',
      });
    }

    if (
      !isAssignedDriver(delivery, req) &&
      !isAdmin(req)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized.',
      });
    }

    if (
      !validateTransition(
        delivery.status,
        'ARRIVED_AT_PICKUP'
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Illegal transition from ${delivery.status} to ARRIVED_AT_PICKUP.`,
      });
    }

    delivery.status = 'ARRIVED_AT_PICKUP';
    await delivery.save();

    await emitDriverArrived(
      delivery,
      'PICKUP',
      delivery.donationId
    );

    return res.status(200).json({
      success: true,
      message:
        'Arrived at pickup location. Please request the Pickup OTP from the donor.',
      delivery,
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      'Error arriving at pickup'
    );
  }
};

// --------------------------------------------------
// CONFIRM PICKUP
// --------------------------------------------------

// @desc Driver confirms food pickup from donor
// @route POST /api/deliveries/:deliveryId/pickup
const confirmPickup = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { otp } = req.body;

    if (!isValidObjectId(deliveryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery ID.',
      });
    }

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found.',
      });
    }

    if (
      !isAssignedDriver(delivery, req) &&
      !isAdmin(req)
    ) {
      return res.status(403).json({
        success: false,
        message:
          'You are not assigned to this delivery.',
      });
    }

    if (
      !validateTransition(
        delivery.status,
        'PICKED_UP'
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Illegal transition from ${delivery.status} to PICKED_UP.`,
      });
    }

    const donation = await Donation.findById(
      delivery.donationId
    );

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Associated donation not found.',
      });
    }

    // OTP Enforcement
    if (!isOtpBypassAllowed()) {
      if (
        !otp ||
        String(otp).trim() !==
          String(donation.pickupOtp || '').trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid or missing Pickup OTP. Please obtain the 4-digit OTP from the donor.',
        });
      }
    }

    delivery.status = 'PICKED_UP';
    delivery.pickupConfirmedAt = new Date();

    await delivery.save();

    donation.status = 'PICKED_UP';
    await donation.save();

    await emitPickupConfirmed(
      delivery,
      donation
    );

    return res.status(200).json({
      success: true,
      message:
        'Pickup confirmed! Food is ready for transit to the shelter.',
      delivery,
      donation: sanitizeDonation(
        donation,
        req.user
      ),
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      'Error confirming pickup'
    );
  }
};

// --------------------------------------------------
// START EN ROUTE TO DELIVERY
// --------------------------------------------------

// @desc Driver starts route to NGO / shelter
// @route POST /api/deliveries/:deliveryId/en-route-delivery
const startEnRouteDelivery = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    if (!isValidObjectId(deliveryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery ID.',
      });
    }

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found.',
      });
    }

    if (
      !isAssignedDriver(delivery, req) &&
      !isAdmin(req)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized.',
      });
    }

    if (
      !validateTransition(
        delivery.status,
        'EN_ROUTE_TO_DELIVERY'
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Illegal transition from ${delivery.status} to EN_ROUTE_TO_DELIVERY.`,
      });
    }

    delivery.status = 'EN_ROUTE_TO_DELIVERY';
    await delivery.save();

    const donation = await Donation.findById(
      delivery.donationId
    );

    if (donation) {
      donation.status = 'IN_TRANSIT';
      await donation.save();

      await emitDeliveryInTransit(
        delivery,
        donation
      );
    }

    return res.status(200).json({
      success: true,
      message:
        'En route to shelter dropoff location.',
      delivery,
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      'Error starting delivery route'
    );
  }
};

// --------------------------------------------------
// ARRIVE AT DROPOFF
// --------------------------------------------------

// @desc Driver arrives at NGO dropoff location
// @route POST /api/deliveries/:deliveryId/arrived-dropoff
const arriveAtDropoff = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    if (!isValidObjectId(deliveryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery ID.',
      });
    }

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found.',
      });
    }

    if (
      !isAssignedDriver(delivery, req) &&
      !isAdmin(req)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized.',
      });
    }

    if (
      !validateTransition(
        delivery.status,
        'ARRIVED_AT_DROPOFF'
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Illegal transition from ${delivery.status} to ARRIVED_AT_DROPOFF.`,
      });
    }

    delivery.status = 'ARRIVED_AT_DROPOFF';
    await delivery.save();

    await emitDriverArrived(
      delivery,
      'DROPOFF',
      delivery.donationId
    );

    return res.status(200).json({
      success: true,
      message:
        'Arrived at shelter! Request the Delivery OTP from the shelter manager.',
      delivery,
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      'Error arriving at dropoff'
    );
  }
};

// --------------------------------------------------
// CONFIRM DELIVERY
// --------------------------------------------------

// @desc Driver confirms food delivery to NGO / shelter
// @route POST /api/deliveries/:deliveryId/deliver
const confirmDelivery = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { otp, notes, photoUrl } = req.body;

    if (!isValidObjectId(deliveryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery ID.',
      });
    }

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found.',
      });
    }

    if (
      !isAssignedDriver(delivery, req) &&
      !isAdmin(req)
    ) {
      return res.status(403).json({
        success: false,
        message:
          'You are not assigned to this delivery.',
      });
    }

    if (
      !validateTransition(
        delivery.status,
        'DELIVERED'
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Illegal transition from ${delivery.status} to DELIVERED.`,
      });
    }

    const donation = await Donation.findById(
      delivery.donationId
    );

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found.',
      });
    }

    // OTP Enforcement
    if (!isOtpBypassAllowed()) {
      if (
        !otp ||
        String(otp).trim() !==
          String(donation.deliveryOtp || '').trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid or missing Delivery OTP. Please obtain the 4-digit OTP from the shelter.',
        });
      }
    }

    delivery.status = 'DELIVERED';
    delivery.deliveredConfirmedAt = new Date();

    if (notes || photoUrl) {
      delivery.proofOfDelivery = {
        ...(delivery.proofOfDelivery || {}),
        photoUrl:
          photoUrl ||
          delivery.proofOfDelivery?.photoUrl,
        ngoFeedbackNote:
          notes ||
          delivery.proofOfDelivery?.ngoFeedbackNote,
      };
    }

    await delivery.save();

    donation.status = 'DELIVERED';
    await donation.save();

    // --------------------------------------------------
    // Free driver
    // --------------------------------------------------

    await User.findByIdAndUpdate(
      delivery.driverId,
      {
        $set: {
          'driverProfile.isAvailable': true,
          'driverProfile.activeDeliveryId': null,
        },
      },
      {
        runValidators: true,
      }
    );

    // --------------------------------------------------
    // Impact telemetry
    // --------------------------------------------------

    const mealsRescued =
      Number(donation.quantity?.estimatedServings) || 20;

    const weightKgSaved =
      Number(donation.quantity?.estimatedWeightKg) || 10;

    const co2PreventedKg =
      Math.round(weightKgSaved * 2.5 * 10) / 10;

    await ImpactLog.create({
      donationId: donation._id,
      donorId: donation.donorId,
      ngoId: donation.matchedNgoId,
      driverId: delivery.driverId,
      mealsRescued,
      weightKgSaved,
      co2PreventedKg,
      completedAt: new Date(),
    });

    await emitDeliveryCompleted(
      delivery,
      donation
    );

    return res.status(200).json({
      success: true,
      message:
        'Delivery completed successfully! Food rescued & impact registered.',
      delivery,
      donation: sanitizeDonation(
        donation,
        req.user
      ),
      impact: {
        mealsRescued,
        weightKgSaved,
        co2PreventedKg,
      },
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      'Error confirming delivery'
    );
  }
};

// --------------------------------------------------
// VERIFY DELIVERY
// --------------------------------------------------

// @desc NGO verifies food receipt and quality rating
// @route POST /api/deliveries/:deliveryId/verify
const verifyDelivery = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { rating, feedbackNote } = req.body;

    if (!isValidObjectId(deliveryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery ID.',
      });
    }

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found.',
      });
    }

    const donation = await Donation.findById(
      delivery.donationId
    );

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found.',
      });
    }

    const userId = getUserId(req);

    const isMatchedNgo =
      donation.matchedNgoId &&
      userId &&
      String(donation.matchedNgoId) ===
        String(userId);

    if (!isMatchedNgo && !isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message:
          'Only the receiving shelter or admin can verify delivery.',
      });
    }

    if (delivery.status !== 'DELIVERED') {
      return res.status(400).json({
        success: false,
        message:
          `Cannot verify delivery with status '${delivery.status}'. Must be 'DELIVERED'.`,
      });
    }

    if (donation.status !== 'DELIVERED') {
      return res.status(400).json({
        success: false,
        message:
          `Cannot verify donation with status '${donation.status}'. Must be 'DELIVERED'.`,
      });
    }

    let normalizedRating = 5;

    if (rating !== undefined && rating !== null && rating !== '') {
      normalizedRating = Number(rating);

      if (
        !Number.isFinite(normalizedRating) ||
        normalizedRating < 1 ||
        normalizedRating > 5
      ) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be a number between 1 and 5.',
        });
      }

      normalizedRating = Math.round(
        normalizedRating * 10
      ) / 10;
    }

    donation.status = 'VERIFIED';
    await donation.save();

    delivery.status = 'VERIFIED';

    delivery.proofOfDelivery = {
      ...(delivery.proofOfDelivery || {}),
      foodConditionRating: normalizedRating,
      ngoFeedbackNote:
        feedbackNote ||
        delivery.proofOfDelivery?.ngoFeedbackNote,
    };

    await delivery.save();

    // --------------------------------------------------
    // Release NGO allocated capacity
    // --------------------------------------------------

    const servings =
      Number(donation.quantity?.estimatedServings) || 0;

    if (donation.matchedNgoId && servings > 0) {
      await User.findByIdAndUpdate(
        donation.matchedNgoId,
        {
          $inc: {
            'ngoProfile.allocatedCapacity': -servings,
          },
        }
      );

      // Safety clamp
      await User.updateOne(
        {
          _id: donation.matchedNgoId,
          'ngoProfile.allocatedCapacity': {
            $lt: 0,
          },
        },
        {
          $set: {
            'ngoProfile.allocatedCapacity': 0,
          },
        }
      );
    }

    await emitDeliveryVerified(
      delivery,
      donation
    );

    return res.status(200).json({
      success: true,
      message:
        'Delivery verified by shelter. Thank you for closing the food rescue cycle!',
      donation: sanitizeDonation(
        donation,
        req.user
      ),
      delivery,
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      'Error verifying delivery'
    );
  }
};

// --------------------------------------------------
// CANCEL DELIVERY
// --------------------------------------------------

// @desc Cancel delivery and free driver
// @route POST /api/deliveries/:deliveryId/cancel
const cancelDelivery = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { reason } = req.body;

    if (!isValidObjectId(deliveryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery ID.',
      });
    }

    const delivery = await Delivery.findById(
      deliveryId
    );

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found.',
      });
    }

    if (
      !isAssignedDriver(delivery, req) &&
      !isAdmin(req)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized.',
      });
    }

    if (
      ['DELIVERED', 'VERIFIED'].includes(
        delivery.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Cannot cancel an already completed delivery.',
      });
    }

    if (delivery.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Delivery is already cancelled.',
      });
    }

    delivery.status = 'CANCELLED';

    if (reason) {
      delivery.proofOfDelivery = {
        ...(delivery.proofOfDelivery || {}),
        ngoFeedbackNote: `Cancelled: ${String(reason).trim()}`,
      };
    }

    await delivery.save();

    // --------------------------------------------------
    // Free driver
    // --------------------------------------------------

    await User.findByIdAndUpdate(
      delivery.driverId,
      {
        $set: {
          'driverProfile.isAvailable': true,
          'driverProfile.activeDeliveryId': null,
        },
      },
      {
        runValidators: true,
      }
    );

    // --------------------------------------------------
    // Make donation available again
    // --------------------------------------------------

    const donation = await Donation.findById(
      delivery.donationId
    );

    if (
      donation &&
      !['DELIVERED', 'VERIFIED'].includes(
        donation.status
      )
    ) {
      donation.status = 'MATCHED';
      donation.assignedDriverId = null;
      donation.activeDeliveryId = null;

      await donation.save();

      // --------------------------------------------------
      // Notify drivers
      // --------------------------------------------------

      try {
        const { getIO } = require('../config/socket');

        const io = getIO();

        io.to('role:DRIVER').emit(
          'delivery_available',
          {
            donationId: donation._id,
            pickupLocation:
              donation.pickupLocation,
          }
        );
      } catch (socketError) {
        console.error(
          'Failed to emit delivery_available:',
          socketError
        );
      }
    }

    return res.status(200).json({
      success: true,
      message:
        'Delivery cancelled. Driver is now available.',
      delivery,
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      'Error cancelling delivery'
    );
  }
};

// --------------------------------------------------
// DRIVER ACTIVE DELIVERIES
// --------------------------------------------------

// @desc Get driver's active deliveries
// @route GET /api/deliveries/my-active
const getMyActiveDeliveries = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const deliveries = await Delivery.find({
      driverId: userId,
      status: {
        $in: ACTIVE_DELIVERY_STATUSES,
      },
    })
      .populate({
        path: 'donationId',
        populate: [
          {
            path: 'donorId',
            select:
              'name phone address location',
          },
          {
            path: 'matchedNgoId',
            select:
              'name phone address location',
          },
        ],
      })
      .sort({ createdAt: -1 })
      .lean();

    const sanitizedDeliveries = deliveries.map(
      (delivery) => {
        if (delivery.donationId) {
          delivery.donationId =
            sanitizeDonation(
              delivery.donationId,
              req.user
            );
        }

        return delivery;
      }
    );

    return res.status(200).json({
      success: true,
      deliveries: sanitizedDeliveries,
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      'Error fetching active deliveries'
    );
  }
};

// --------------------------------------------------
// GET DELIVERY BY ID
// --------------------------------------------------

// @desc Get single delivery by ID
// @route GET /api/deliveries/:deliveryId
const getDeliveryById = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    if (!isValidObjectId(deliveryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery ID.',
      });
    }

    const delivery = await Delivery.findById(
      deliveryId
    )
      .populate({
        path: 'donationId',
        populate: [
          {
            path: 'donorId',
            select:
              'name phone address location',
          },
          {
            path: 'matchedNgoId',
            select:
              'name phone address location',
          },
        ],
      })
      .populate(
        'driverId',
        'name phone driverProfile'
      );

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found.',
      });
    }

    // --------------------------------------------------
    // Authorization
    // --------------------------------------------------

    if (!canAccessDelivery(delivery, req)) {
      return res.status(403).json({
        success: false,
        message:
          'You are not authorized to view this delivery.',
      });
    }

    const plain = delivery.toObject();

    if (plain.donationId) {
      plain.donationId = sanitizeDonation(
        plain.donationId,
        req.user
      );
    }

    return res.status(200).json({
      success: true,
      delivery: plain,
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      'Error fetching delivery'
    );
  }
};

// --------------------------------------------------
// EXPORTS
// --------------------------------------------------

module.exports = {
  getAvailableDeliveries,
  claimDelivery,
  startEnRoutePickup,
  arriveAtPickup,
  confirmPickup,
  startEnRouteDelivery,
  arriveAtDropoff,
  confirmDelivery,
  verifyDelivery,
  cancelDelivery,
  getMyActiveDeliveries,
  getDeliveryById,
};
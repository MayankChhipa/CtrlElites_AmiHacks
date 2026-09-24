const mongoose = require('mongoose');
const Delivery = require('../models/Delivery');
const Donation = require('../models/Donation');
const User = require('../models/User');
const ImpactLog = require('../models/ImpactLog');
const { calculateRouteAndEta } = require('../services/routingService');
const { sanitizeDonation, sanitizeDonationsList } = require('../utils/sanitize');
const {
  emitDriverAssigned,
  emitDriverEnRoute,
  emitDriverArrived,
  emitPickupConfirmed,
  emitDeliveryInTransit,
  emitDeliveryCompleted,
  emitDeliveryVerified,
} = require('../utils/socketEmitter');

// Legal status transitions for Delivery
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

const validateTransition = (currentStatus, targetStatus) => {
  const allowed = LEGAL_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
};

// @desc Get available deliveries for drivers (matched donations needing transport)
// @route GET /api/deliveries/available
const getAvailableDeliveries = async (req, res) => {
  try {
    const donations = await Donation.find({ status: 'MATCHED' })
      .populate('donorId', 'name phone address location')
      .populate('matchedNgoId', 'name phone address location')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      available: sanitizeDonationsList(donations, req.user),
    });
  } catch (error) {
    console.error('Error fetching available deliveries:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Driver claims a matched donation
// @route POST /api/deliveries/:donationId/claim
const claimDelivery = async (req, res) => {
  try {
    const { donationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(donationId)) {
      return res.status(400).json({ success: false, message: 'Invalid donation ID.' });
    }

    // 1. Verify driver is available
    const driver = await User.findById(req.user._id);
    if (!driver || driver.role !== 'DRIVER') {
      return res.status(403).json({ success: false, message: 'Only drivers can claim deliveries.' });
    }

    if (driver.driverProfile && driver.driverProfile.isAvailable === false) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active assigned delivery. Complete it before claiming another.',
      });
    }

    // 2. Atomic find and update to prevent race conditions between two drivers
    const donation = await Donation.findOneAndUpdate(
      {
        _id: donationId,
        status: 'MATCHED',
        assignedDriverId: { $in: [null, undefined] },
      },
      {
        status: 'DRIVER_ASSIGNED',
        assignedDriverId: req.user._id,
      },
      { returnDocument: 'after' }
    )
      .populate('donorId')
      .populate('matchedNgoId');

    if (!donation) {
      return res.status(409).json({
        success: false,
        message: 'This delivery is no longer available or was already claimed by another driver.',
      });
    }

    const pickupCoords = donation.pickupLocation?.location?.coordinates || [77.209, 28.6139];
    const dropoffCoords = donation.matchedNgoId?.location?.coordinates || [77.22, 28.62];

    // 3. Calculate route and ETA
    const routeSummary = await calculateRouteAndEta(pickupCoords, dropoffCoords);

    // 4. Create Delivery record
    const delivery = await Delivery.create({
      donationId: donation._id,
      driverId: req.user._id,
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
    });

    // 5. Update donation activeDeliveryId
    donation.activeDeliveryId = delivery._id;
    await donation.save();

    // 6. Mark driver as unavailable while on delivery
    await User.findByIdAndUpdate(req.user._id, {
      'driverProfile.isAvailable': false,
      'driverProfile.activeDeliveryId': delivery._id,
    });

    // 7. Emit Socket & notification events
    await emitDriverAssigned(delivery, donation);

    return res.status(201).json({
      success: true,
      message: 'Delivery claimed successfully! Head to the pickup location.',
      delivery,
      donation: sanitizeDonation(donation, req.user),
    });
  } catch (error) {
    console.error('Error claiming delivery:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Driver starts route to pickup location
// @route POST /api/deliveries/:deliveryId/en-route-pickup
const startEnRoutePickup = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found.' });
    }

    if (delivery.driverId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    if (!validateTransition(delivery.status, 'EN_ROUTE_TO_PICKUP')) {
      return res.status(400).json({
        success: false,
        message: `Illegal transition from ${delivery.status} to EN_ROUTE_TO_PICKUP.`,
      });
    }

    delivery.status = 'EN_ROUTE_TO_PICKUP';
    await delivery.save();

    emitDriverEnRoute(delivery, 'PICKUP', delivery.donationId);

    return res.status(200).json({
      success: true,
      message: 'En route to pickup location.',
      delivery,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Driver arrives at pickup location
// @route POST /api/deliveries/:deliveryId/arrived-pickup
const arriveAtPickup = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found.' });
    }

    if (delivery.driverId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    if (!validateTransition(delivery.status, 'ARRIVED_AT_PICKUP')) {
      return res.status(400).json({
        success: false,
        message: `Illegal transition from ${delivery.status} to ARRIVED_AT_PICKUP.`,
      });
    }

    delivery.status = 'ARRIVED_AT_PICKUP';
    await delivery.save();

    emitDriverArrived(delivery, 'PICKUP', delivery.donationId);

    return res.status(200).json({
      success: true,
      message: 'Arrived at pickup location. Please request the Pickup OTP from the donor.',
      delivery,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Driver confirms food pickup from Donor (Requires OTP)
// @route POST /api/deliveries/:deliveryId/pickup
const confirmPickup = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { otp } = req.body;

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found.' });
    }

    if (delivery.driverId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'You are not assigned to this delivery.' });
    }

    if (!validateTransition(delivery.status, 'PICKED_UP')) {
      return res.status(400).json({
        success: false,
        message: `Illegal transition from ${delivery.status} to PICKED_UP.`,
      });
    }

    const donation = await Donation.findById(delivery.donationId);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Associated donation not found.' });
    }

    // OTP Enforcement
    const bypassOtp = process.env.ALLOW_OTP_BYPASS === 'true';
    if (!bypassOtp) {
      if (!otp || String(otp).trim() !== String(donation.pickupOtp).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or missing Pickup OTP. Please obtain the 4-digit OTP from the donor.',
        });
      }
    }

    delivery.status = 'PICKED_UP';
    delivery.pickupConfirmedAt = new Date();
    await delivery.save();

    donation.status = 'PICKED_UP';
    await donation.save();

    await emitPickupConfirmed(delivery, donation);

    return res.status(200).json({
      success: true,
      message: 'Pickup confirmed! Food is ready for transit to the shelter.',
      delivery,
      donation: sanitizeDonation(donation, req.user),
    });
  } catch (error) {
    console.error('Error confirming pickup:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Driver starts route to NGO / Shelter dropoff
// @route POST /api/deliveries/:deliveryId/en-route-delivery
const startEnRouteDelivery = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found.' });
    }

    if (delivery.driverId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    if (!validateTransition(delivery.status, 'EN_ROUTE_TO_DELIVERY')) {
      return res.status(400).json({
        success: false,
        message: `Illegal transition from ${delivery.status} to EN_ROUTE_TO_DELIVERY.`,
      });
    }

    delivery.status = 'EN_ROUTE_TO_DELIVERY';
    await delivery.save();

    const donation = await Donation.findById(delivery.donationId);
    if (donation) {
      donation.status = 'IN_TRANSIT';
      await donation.save();
      emitDeliveryInTransit(delivery, donation);
    }

    return res.status(200).json({
      success: true,
      message: 'En route to shelter dropoff location.',
      delivery,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Driver arrives at NGO dropoff location
// @route POST /api/deliveries/:deliveryId/arrived-dropoff
const arriveAtDropoff = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found.' });
    }

    if (delivery.driverId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    if (!validateTransition(delivery.status, 'ARRIVED_AT_DROPOFF')) {
      return res.status(400).json({
        success: false,
        message: `Illegal transition from ${delivery.status} to ARRIVED_AT_DROPOFF.`,
      });
    }

    delivery.status = 'ARRIVED_AT_DROPOFF';
    await delivery.save();

    emitDriverArrived(delivery, 'DROPOFF', delivery.donationId);

    return res.status(200).json({
      success: true,
      message: 'Arrived at shelter! Request the Delivery OTP from the shelter manager.',
      delivery,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Driver confirms food delivery to NGO / Shelter (Requires OTP)
// @route POST /api/deliveries/:deliveryId/deliver
const confirmDelivery = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { otp, notes, photoUrl } = req.body;

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found.' });
    }

    if (delivery.driverId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'You are not assigned to this delivery.' });
    }

    if (!validateTransition(delivery.status, 'DELIVERED')) {
      return res.status(400).json({
        success: false,
        message: `Illegal transition from ${delivery.status} to DELIVERED.`,
      });
    }

    const donation = await Donation.findById(delivery.donationId);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found.' });
    }

    // OTP Enforcement
    const bypassOtp = process.env.ALLOW_OTP_BYPASS === 'true';
    if (!bypassOtp) {
      if (!otp || String(otp).trim() !== String(donation.deliveryOtp).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or missing Delivery OTP. Please obtain the 4-digit OTP from the shelter.',
        });
      }
    }

    delivery.status = 'DELIVERED';
    delivery.deliveredConfirmedAt = new Date();
    if (notes || photoUrl) {
      delivery.proofOfDelivery = {
        ...delivery.proofOfDelivery,
        photoUrl: photoUrl || delivery.proofOfDelivery?.photoUrl,
        ngoFeedbackNote: notes || delivery.proofOfDelivery?.ngoFeedbackNote,
      };
    }
    await delivery.save();

    donation.status = 'DELIVERED';
    await donation.save();

    // Free driver availability
    await User.findByIdAndUpdate(delivery.driverId, {
      'driverProfile.isAvailable': true,
      'driverProfile.activeDeliveryId': null,
    });

    // UPDATE IMPACT TELEMETRY
    const mealsRescued = donation.quantity.estimatedServings || 20;
    const weightKgSaved = donation.quantity.estimatedWeightKg || 10;
    const co2PreventedKg = Math.round(weightKgSaved * 2.5 * 10) / 10;

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

    await emitDeliveryCompleted(delivery, donation);

    return res.status(200).json({
      success: true,
      message: 'Delivery completed successfully! Food rescued & impact registered.',
      delivery,
      donation: sanitizeDonation(donation, req.user),
      impact: {
        mealsRescued,
        weightKgSaved,
        co2PreventedKg,
      },
    });
  } catch (error) {
    console.error('Error confirming delivery:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc NGO verifies food receipt and quality rating (Releases capacity!)
// @route POST /api/deliveries/:deliveryId/verify
const verifyDelivery = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { rating, feedbackNote } = req.body;

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found.' });
    }

    const donation = await Donation.findById(delivery.donationId);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found.' });
    }

    // NGO or Admin authorization
    const isMatchedNgo = donation.matchedNgoId && donation.matchedNgoId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'ADMIN';

    if (!isMatchedNgo && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only the receiving shelter or admin can verify delivery.' });
    }

    if (donation.status !== 'DELIVERED') {
      return res.status(400).json({
        success: false,
        message: `Cannot verify donation with status '${donation.status}'. Must be 'DELIVERED'.`,
      });
    }

    donation.status = 'VERIFIED';
    await donation.save();

    delivery.status = 'VERIFIED';
    delivery.proofOfDelivery = {
      ...delivery.proofOfDelivery,
      foodConditionRating: rating ? Math.min(5, Math.max(1, Number(rating))) : 5,
      ngoFeedbackNote: feedbackNote || delivery.proofOfDelivery?.ngoFeedbackNote,
    };
    await delivery.save();

    // Release NGO allocated capacity
    const servings = donation.quantity?.estimatedServings || 0;
    if (donation.matchedNgoId) {
      await User.findByIdAndUpdate(donation.matchedNgoId, {
        $inc: { 'ngoProfile.allocatedCapacity': -servings },
      });
      // Safety clamp
      await User.updateOne(
        { _id: donation.matchedNgoId, 'ngoProfile.allocatedCapacity': { $lt: 0 } },
        { $set: { 'ngoProfile.allocatedCapacity': 0 } }
      );
    }

    await emitDeliveryVerified(delivery, donation);

    return res.status(200).json({
      success: true,
      message: 'Delivery verified by shelter. Thank you for closing the food rescue cycle!',
      donation: sanitizeDonation(donation, req.user),
      delivery,
    });
  } catch (error) {
    console.error('Error verifying delivery:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Cancel delivery and free driver
// @route POST /api/deliveries/:deliveryId/cancel
const cancelDelivery = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { reason } = req.body;

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found.' });
    }

    if (delivery.driverId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    if (['DELIVERED', 'VERIFIED'].includes(delivery.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel an already completed delivery.' });
    }

    delivery.status = 'CANCELLED';
    if (reason) {
      delivery.proofOfDelivery = { ...delivery.proofOfDelivery, ngoFeedbackNote: `Cancelled: ${reason}` };
    }
    await delivery.save();

    // Free driver
    await User.findByIdAndUpdate(delivery.driverId, {
      'driverProfile.isAvailable': true,
      'driverProfile.activeDeliveryId': null,
    });

    // Reset donation to MATCHED so another driver can claim it
    const donation = await Donation.findById(delivery.donationId);
    if (donation && !['DELIVERED', 'VERIFIED'].includes(donation.status)) {
      donation.status = 'MATCHED';
      donation.assignedDriverId = null;
      donation.activeDeliveryId = null;
      await donation.save();

      // Emit to drivers that this delivery is available again
      const { getIO } = require('../config/socket');
      try {
        const io = getIO();
        if (io) {
          io.to('role:DRIVER').emit('delivery_available', {
            donationId: donation._id,
            pickupLocation: donation.pickupLocation,
          });
        }
      } catch (_) {}
    }

    return res.status(200).json({
      success: true,
      message: 'Delivery cancelled. Driver is now available.',
      delivery,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get driver's active deliveries
// @route GET /api/deliveries/my-active
const getMyActiveDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find({
      driverId: req.user._id,
      status: {
        $in: [
          'ASSIGNED',
          'EN_ROUTE_TO_PICKUP',
          'ARRIVED_AT_PICKUP',
          'PICKED_UP',
          'EN_ROUTE_TO_DELIVERY',
          'ARRIVED_AT_DROPOFF',
        ],
      },
    })
      .populate({
        path: 'donationId',
        populate: [
          { path: 'donorId', select: 'name phone address location' },
          { path: 'matchedNgoId', select: 'name phone address location' },
        ],
      })
      .sort({ createdAt: -1 });

    const sanitizedDeliveries = deliveries.map((d) => {
      const plain = d.toObject();
      if (plain.donationId) {
        plain.donationId = sanitizeDonation(plain.donationId, req.user);
      }
      return plain;
    });

    return res.status(200).json({ success: true, deliveries: sanitizedDeliveries });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get single delivery by ID
// @route GET /api/deliveries/:deliveryId
const getDeliveryById = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.deliveryId)
      .populate({
        path: 'donationId',
        populate: [
          { path: 'donorId', select: 'name phone address location' },
          { path: 'matchedNgoId', select: 'name phone address location' },
        ],
      })
      .populate('driverId', 'name phone driverProfile');

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found.' });
    }

    const plain = delivery.toObject();
    if (plain.donationId) {
      plain.donationId = sanitizeDonation(plain.donationId, req.user);
    }

    return res.status(200).json({ success: true, delivery: plain });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

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

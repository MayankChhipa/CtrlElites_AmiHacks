const mongoose = require('mongoose');
const User = require('../models/User');
const Donation = require('../models/Donation');
const Delivery = require('../models/Delivery');
const Match = require('../models/Match');
const ImpactLog = require('../models/ImpactLog');
const { enrichDonationWithUrgency, calculateUrgency } = require('../services/urgencyEngine');

// @desc List all users with filters & pagination
// @route GET /api/admin/users
const listUsers = async (req, res) => {
  try {
    const { role, isVerified, search, page = 1, limit = 25 } = req.query;
    const query = {};

    if (role) query.role = role;
    if (isVerified !== undefined) query.isVerified = isVerified === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(query).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      users,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc View single user by ID
// @route GET /api/admin/users/:id
const getUserById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    }

    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Verify or reject an NGO or Driver
// @route PATCH /api/admin/users/:id/verify
const verifyUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    }

    const { isVerified = true } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isVerified: Boolean(isVerified) },
      { returnDocument: 'after' }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      message: `User ${user.isVerified ? 'verified' : 'rejected / unverified'} successfully.`,
      user,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc List all donations with filters
// @route GET /api/admin/donations
const listAllDonations = async (req, res) => {
  try {
    const { status, foodType, page = 1, limit = 25 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (foodType) query.foodType = foodType;

    const skip = (Number(page) - 1) * Number(limit);
    const [donations, total] = await Promise.all([
      Donation.find(query)
        .populate('donorId', 'name email phone address')
        .populate('matchedNgoId', 'name email phone address')
        .populate('assignedDriverId', 'name phone driverProfile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Donation.countDocuments(query),
    ]);

    const enriched = donations.map((d) => enrichDonationWithUrgency(d));

    return res.status(200).json({
      success: true,
      donations: enriched,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc View active deliveries
// @route GET /api/admin/deliveries/active
const getActiveDeliveries = async (req, res) => {
  try {
    const activeStatuses = [
      'ASSIGNED',
      'EN_ROUTE_TO_PICKUP',
      'ARRIVED_AT_PICKUP',
      'PICKED_UP',
      'EN_ROUTE_TO_DELIVERY',
      'ARRIVED_AT_DROPOFF',
    ];

    const deliveries = await Delivery.find({ status: { $in: activeStatuses } })
      .populate('driverId', 'name phone driverProfile')
      .populate('donorId', 'name phone address location')
      .populate('ngoId', 'name phone address location')
      .populate('donationId')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: deliveries.length, deliveries });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc View expiring donations (less than 2 hours remaining)
// @route GET /api/admin/donations/expiring
const getExpiringDonations = async (req, res) => {
  try {
    // Donations that are still active (not yet delivered/verified/cancelled/expired)
    const donations = await Donation.find({
      status: { $in: ['PENDING_MATCH', 'MATCHED', 'DRIVER_ASSIGNED'] },
    })
      .populate('donorId', 'name phone address')
      .populate('matchedNgoId', 'name phone address')
      .sort({ 'perishability.expiryTime': 1 });

    // Filter by remaining time <= 120 mins
    const expiring = donations
      .map((d) => enrichDonationWithUrgency(d))
      .filter((d) => ['CRITICAL', 'HIGH'].includes(d.urgency) || (d.timeRemainingMinutes && d.timeRemainingMinutes < 120));

    return res.status(200).json({ success: true, count: expiring.length, expiringDonations: expiring });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc View failed or unmatched donations
// @route GET /api/admin/matches/failed
const getFailedMatches = async (req, res) => {
  try {
    // Donations in PENDING_MATCH that have at least one declined/expired match
    const declinedMatches = await Match.find({ status: { $in: ['DECLINED', 'EXPIRED'] } });
    const donationIds = [...new Set(declinedMatches.map((m) => m.donationId.toString()))];

    const donations = await Donation.find({
      _id: { $in: donationIds },
      status: 'PENDING_MATCH',
    })
      .populate('donorId', 'name phone address')
      .sort({ createdAt: -1 });

    const enriched = donations.map((d) => enrichDonationWithUrgency(d));

    return res.status(200).json({ success: true, count: enriched.length, failedDonations: enriched });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc View overall platform statistics
// @route GET /api/admin/statistics
const getPlatformStatistics = async (req, res) => {
  try {
    const [
      totalUsers,
      donorsCount,
      ngosCount,
      driversCount,
      verifiedNgos,
      verifiedDrivers,
      totalDonations,
      activeDonations,
      deliveredDonations,
      activeDeliveries,
      logs,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'DONOR' }),
      User.countDocuments({ role: 'NGO' }),
      User.countDocuments({ role: 'DRIVER' }),
      User.countDocuments({ role: 'NGO', isVerified: true }),
      User.countDocuments({ role: 'DRIVER', isVerified: true }),
      Donation.countDocuments(),
      Donation.countDocuments({ status: { $in: ['PENDING_MATCH', 'MATCHED', 'DRIVER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] } }),
      Donation.countDocuments({ status: { $in: ['DELIVERED', 'VERIFIED'] } }),
      Delivery.countDocuments({ status: { $in: ['ASSIGNED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'EN_ROUTE_TO_DELIVERY', 'ARRIVED_AT_DROPOFF'] } }),
      ImpactLog.find(),
    ]);

    const totalMealsRescued = logs.reduce((sum, l) => sum + (l.mealsRescued || 0), 0);
    const totalWeightKgSaved = logs.reduce((sum, l) => sum + (l.weightKgSaved || 0), 0);
    const totalCo2PreventedKg = Math.round(logs.reduce((sum, l) => sum + (l.co2PreventedKg || 0), 0) * 10) / 10;

    return res.status(200).json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          donors: donorsCount,
          ngos: ngosCount,
          drivers: driversCount,
          verifiedNgos,
          verifiedDrivers,
        },
        donations: {
          total: totalDonations,
          active: activeDonations,
          delivered: deliveredDonations,
        },
        deliveries: {
          active: activeDeliveries,
          completed: logs.length,
        },
        impact: {
          totalMealsRescued,
          totalWeightKgSaved,
          totalCo2PreventedKg,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc View recent impact logs
// @route GET /api/admin/impact-logs
const getRecentImpactLogs = async (req, res) => {
  try {
    const logs = await ImpactLog.find()
      .populate('donorId', 'name email address')
      .populate('ngoId', 'name email address')
      .populate('driverId', 'name phone driverProfile')
      .populate('donationId', 'title foodType quantity')
      .sort({ completedAt: -1 })
      .limit(50);

    return res.status(200).json({ success: true, count: logs.length, logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  listUsers,
  getUserById,
  verifyUser,
  listAllDonations,
  getActiveDeliveries,
  getExpiringDonations,
  getFailedMatches,
  getPlatformStatistics,
  getRecentImpactLogs,
};

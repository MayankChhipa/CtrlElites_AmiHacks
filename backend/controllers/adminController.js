const mongoose = require('mongoose');

const User = require('../models/User');
const Donation = require('../models/Donation');
const Delivery = require('../models/Delivery');
const Match = require('../models/Match');
const ImpactLog = require('../models/ImpactLog');

const {
  enrichDonationWithUrgency,
} = require('../services/urgencyEngine');

/**
 * Safely parse pagination parameters.
 */
const getPagination = (page, limit) => {
  const parsedPage = Number.parseInt(page, 10);
  const parsedLimit = Number.parseInt(limit, 10);

  const currentPage =
    Number.isFinite(parsedPage) && parsedPage > 0
      ? parsedPage
      : 1;

  const pageLimit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 25;

  return {
    page: currentPage,
    limit: pageLimit,
    skip: (currentPage - 1) * pageLimit,
  };
};

/**
 * Escape user input before using it in a MongoDB regex.
 */
const escapeRegex = (value) => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
};

// @desc List all users with filters & pagination
// @route GET /api/admin/users
const listUsers = async (req, res) => {
  try {
    const {
      role,
      isVerified,
      search,
      page = 1,
      limit = 25,
    } = req.query;

    const query = {};

    if (role) {
      query.role = role;
    }

    if (isVerified !== undefined) {
      if (
        isVerified !== 'true' &&
        isVerified !== 'false'
      ) {
        return res.status(400).json({
          success: false,
          message: 'isVerified must be true or false.',
        });
      }

      query.isVerified = isVerified === 'true';
    }

    if (search && String(search).trim()) {
      const safeSearch = escapeRegex(
        String(search).trim()
      );

      query.$or = [
        {
          name: {
            $regex: safeSearch,
            $options: 'i',
          },
        },
        {
          email: {
            $regex: safeSearch,
            $options: 'i',
          },
        },
      ];
    }

    const pagination = getPagination(page, limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),

      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      users,
      total,
      page: pagination.page,
      pages: Math.ceil(
        total / pagination.limit
      ),
    });
  } catch (error) {
    console.error('listUsers error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch users.',
    });
  }
};

// @desc View single user by ID
// @route GET /api/admin/users/:id
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.',
      });
    }

    const user = await User.findById(id)
      .select('-passwordHash')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('getUserById error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user.',
    });
  }
};

// @desc Verify or reject an NGO or Driver
// @route PATCH /api/admin/users/:id/verify
const verifyUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.',
      });
    }

    const { isVerified = true } = req.body;

    if (typeof isVerified !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isVerified must be a boolean.',
      });
    }

    const existingUser = await User.findById(id);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Only NGO and DRIVER accounts require this verification flow.
    if (
      !['NGO', 'DRIVER'].includes(existingUser.role)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Only NGO and DRIVER accounts can be verified through this endpoint.',
      });
    }

    existingUser.isVerified = isVerified;

    await existingUser.save();

    const user = existingUser
      .toObject();

    delete user.passwordHash;

    return res.status(200).json({
      success: true,
      message: `User ${isVerified
          ? 'verified'
          : 'rejected / unverified'
        } successfully.`,
      user,
    });
  } catch (error) {
    console.error('verifyUser error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update user verification.',
    });
  }
};

// @desc List all donations with filters
// @route GET /api/admin/donations
const listAllDonations = async (req, res) => {
  try {
    const {
      status,
      foodType,
      page = 1,
      limit = 25,
    } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (foodType) {
      query.foodType = foodType;
    }

    const pagination = getPagination(page, limit);

    const [donations, total] =
      await Promise.all([
        Donation.find(query)
          .populate(
            'donorId',
            'name email phone address'
          )
          .populate(
            'matchedNgoId',
            'name email phone address'
          )
          .populate(
            'assignedDriverId',
            'name phone driverProfile'
          )
          .sort({ createdAt: -1 })
          .skip(pagination.skip)
          .limit(pagination.limit),

        Donation.countDocuments(query),
      ]);

    const enriched = donations.map(
      (donation) =>
        enrichDonationWithUrgency(donation)
    );

    return res.status(200).json({
      success: true,
      donations: enriched,
      total,
      page: pagination.page,
      pages: Math.ceil(
        total / pagination.limit
      ),
    });
  } catch (error) {
    console.error(
      'listAllDonations error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch donations.',
    });
  }
};

// @desc View active deliveries
// @route GET /api/admin/deliveries/active
const getActiveDeliveries = async (
  req,
  res
) => {
  try {
    const activeStatuses = [
      'ASSIGNED',
      'EN_ROUTE_TO_PICKUP',
      'ARRIVED_AT_PICKUP',
      'PICKED_UP',
      'EN_ROUTE_TO_DELIVERY',
      'ARRIVED_AT_DROPOFF',
    ];

    const deliveries =
      await Delivery.find({
        status: {
          $in: activeStatuses,
        },
      })
        .populate(
          'driverId',
          'name phone driverProfile'
        )
        .populate(
          'donorId',
          'name phone address location'
        )
        .populate(
          'ngoId',
          'name phone address location'
        )
        .populate('donationId')
        .sort({ createdAt: -1 })
        .lean();

    return res.status(200).json({
      success: true,
      count: deliveries.length,
      deliveries,
    });
  } catch (error) {
    console.error(
      'getActiveDeliveries error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch active deliveries.',
    });
  }
};

// @desc View expiring donations
// @route GET /api/admin/donations/expiring
const getExpiringDonations = async (
  req,
  res
) => {
  try {
    const donations =
      await Donation.find({
        status: {
          $in: [
            'PENDING_MATCH',
            'MATCHED',
            'DRIVER_ASSIGNED',
          ],
        },
      })
        .populate(
          'donorId',
          'name phone address'
        )
        .populate(
          'matchedNgoId',
          'name phone address'
        )
        .sort({
          'perishability.expiryTime': 1,
        });

    const expiring = donations
      .map((donation) =>
        enrichDonationWithUrgency(donation)
      )
      .filter((donation) => {
        const remaining =
          donation.timeRemainingMinutes;

        return (
          ['CRITICAL', 'HIGH'].includes(
            donation.urgency
          ) ||
          (
            typeof remaining === 'number' &&
            remaining <= 120
          )
        );
      });

    return res.status(200).json({
      success: true,
      count: expiring.length,
      expiringDonations: expiring,
    });
  } catch (error) {
    console.error(
      'getExpiringDonations error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch expiring donations.',
    });
  }
};

// @desc View failed or unmatched donations
// @route GET /api/admin/matches/failed
const getFailedMatches = async (
  req,
  res
) => {
  try {
    const donationIds =
      await Match.distinct(
        'donationId',
        {
          status: {
            $in: [
              'DECLINED',
              'EXPIRED',
            ],
          },
        }
      );

    if (!donationIds.length) {
      return res.status(200).json({
        success: true,
        count: 0,
        failedDonations: [],
      });
    }

    const donations =
      await Donation.find({
        _id: {
          $in: donationIds,
        },
        status: 'PENDING_MATCH',
      })
        .populate(
          'donorId',
          'name phone address'
        )
        .sort({ createdAt: -1 });

    const enriched = donations.map(
      (donation) =>
        enrichDonationWithUrgency(donation)
    );

    return res.status(200).json({
      success: true,
      count: enriched.length,
      failedDonations: enriched,
    });
  } catch (error) {
    console.error(
      'getFailedMatches error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch failed matches.',
    });
  }
};

// @desc View overall platform statistics
// @route GET /api/admin/statistics
const getPlatformStatistics = async (
  req,
  res
) => {
  try {
    const activeDonationStatuses = [
      'PENDING_MATCH',
      'MATCHED',
      'DRIVER_ASSIGNED',
      'PICKED_UP',
      'IN_TRANSIT',
    ];

    const activeDeliveryStatuses = [
      'ASSIGNED',
      'EN_ROUTE_TO_PICKUP',
      'ARRIVED_AT_PICKUP',
      'PICKED_UP',
      'EN_ROUTE_TO_DELIVERY',
      'ARRIVED_AT_DROPOFF',
    ];

    const completedDeliveryStatuses = [
      'DELIVERED',
      'COMPLETED',
    ];

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
      completedDeliveries,
      impactTotals,
    ] = await Promise.all([
      User.countDocuments(),

      User.countDocuments({
        role: 'DONOR',
      }),

      User.countDocuments({
        role: 'NGO',
      }),

      User.countDocuments({
        role: 'DRIVER',
      }),

      User.countDocuments({
        role: 'NGO',
        isVerified: true,
      }),

      User.countDocuments({
        role: 'DRIVER',
        isVerified: true,
      }),

      Donation.countDocuments(),

      Donation.countDocuments({
        status: {
          $in: activeDonationStatuses,
        },
      }),

      Donation.countDocuments({
        status: {
          $in: [
            'DELIVERED',
            'VERIFIED',
          ],
        },
      }),

      Delivery.countDocuments({
        status: {
          $in: activeDeliveryStatuses,
        },
      }),

      Delivery.countDocuments({
        status: {
          $in: completedDeliveryStatuses,
        },
      }),

      ImpactLog.aggregate([
        {
          $group: {
            _id: null,
            totalMealsRescued: {
              $sum: {
                $ifNull: [
                  '$mealsRescued',
                  0,
                ],
              },
            },
            totalWeightKgSaved: {
              $sum: {
                $ifNull: [
                  '$weightKgSaved',
                  0,
                ],
              },
            },
            totalCo2PreventedKg: {
              $sum: {
                $ifNull: [
                  '$co2PreventedKg',
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const impact = impactTotals[0] || {};

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
          completed:
            completedDeliveries,
        },

        impact: {
          totalMealsRescued:
            impact.totalMealsRescued || 0,

          totalWeightKgSaved:
            impact.totalWeightKgSaved || 0,

          totalCo2PreventedKg:
            Math.round(
              (impact.totalCo2PreventedKg || 0) *
              10
            ) / 10,
        },
      },
    });
  } catch (error) {
    console.error(
      'getPlatformStatistics error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch platform statistics.',
    });
  }
};

// @desc View recent impact logs
// @route GET /api/admin/impact-logs
const getRecentImpactLogs = async (
  req,
  res
) => {
  try {
    const logs =
      await ImpactLog.find()
        .populate(
          'donorId',
          'name email address'
        )
        .populate(
          'ngoId',
          'name email address'
        )
        .populate(
          'driverId',
          'name phone driverProfile'
        )
        .populate(
          'donationId',
          'title foodType quantity'
        )
        .sort({ completedAt: -1 })
        .limit(50)
        .lean();

    return res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error(
      'getRecentImpactLogs error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch impact logs.',
    });
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
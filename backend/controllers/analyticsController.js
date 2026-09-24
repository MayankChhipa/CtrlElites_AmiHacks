const ImpactLog = require('../models/ImpactLog');
const Donation = require('../models/Donation');
const User = require('../models/User');

// @desc Get platform-wide aggregated impact stats and charts breakdown
// @route GET /api/analytics/impact
const getImpactSummary = async (req, res) => {
  try {
    const activeDonationStatuses = [
      'PENDING_MATCH',
      'MATCHED',
      'DRIVER_ASSIGNED',
      'PICKED_UP',
      'IN_TRANSIT',
    ];

    /*
     * Run independent queries in parallel.
     */
    const [
      impactTotals,
      userStats,
      activeDonationsCount,
      foodTypeStats,
      statusStats,
      impactOverTime,
      recentRescues,
    ] = await Promise.all([
      // Overall impact totals
      ImpactLog.aggregate([
        {
          $group: {
            _id: null,

            totalMealsRescued: {
              $sum: {
                $ifNull: ['$mealsRescued', 0],
              },
            },

            totalWeightKgSaved: {
              $sum: {
                $ifNull: ['$weightKgSaved', 0],
              },
            },

            totalCo2PreventedKg: {
              $sum: {
                $ifNull: ['$co2PreventedKg', 0],
              },
            },

            totalRescuesCompleted: {
              $sum: 1,
            },
          },
        },
      ]),

      // Users by role
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
          },
        },
      ]),

      // Active donations
      Donation.countDocuments({
        status: {
          $in: activeDonationStatuses,
        },
      }),

      // Donations by food type
      Donation.aggregate([
        {
          $group: {
            _id: '$foodType',

            count: {
              $sum: 1,
            },

            totalServings: {
              $sum: {
                $ifNull: [
                  '$quantity.estimatedServings',
                  0,
                ],
              },
            },

            totalWeightKg: {
              $sum: {
                $ifNull: [
                  '$quantity.estimatedWeightKg',
                  0,
                ],
              },
            },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]),

      // Donations by status
      Donation.aggregate([
        {
          $group: {
            _id: '$status',
            count: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]),

      // Impact over time
      ImpactLog.aggregate([
        {
          $match: {
            completedAt: {
              $ne: null,
            },
          },
        },

        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$completedAt',
                timezone: 'Asia/Kolkata',
              },
            },

            mealsRescued: {
              $sum: {
                $ifNull: ['$mealsRescued', 0],
              },
            },

            weightKgSaved: {
              $sum: {
                $ifNull: ['$weightKgSaved', 0],
              },
            },

            co2PreventedKg: {
              $sum: {
                $ifNull: ['$co2PreventedKg', 0],
              },
            },

            rescuesCount: {
              $sum: 1,
            },
          },
        },

        {
          $project: {
            _id: 0,
            date: '$_id',
            mealsRescued: 1,
            weightKgSaved: 1,
            co2PreventedKg: {
              $round: ['$co2PreventedKg', 1],
            },
            rescuesCount: 1,
          },
        },

        {
          $sort: {
            date: 1,
          },
        },
      ]),

      // Recent rescue logs
      ImpactLog.find()
        .populate('donorId', 'name')
        .populate('ngoId', 'name')
        .populate('driverId', 'name')
        .populate(
          'donationId',
          'title foodType'
        )
        .sort({ completedAt: -1 })
        .limit(8)
        .lean(),
    ]);

    /*
     * Convert role aggregation into the response format
     * expected by the frontend.
     */
    const usersByRole = {
      DONOR: 0,
      NGO: 0,
      DRIVER: 0,
      ADMIN: 0,
    };

    for (const item of userStats) {
      if (
        Object.prototype.hasOwnProperty.call(
          usersByRole,
          item._id
        )
      ) {
        usersByRole[item._id] = item.count;
      }
    }

    const totals = impactTotals[0] || {
      totalMealsRescued: 0,
      totalWeightKgSaved: 0,
      totalCo2PreventedKg: 0,
      totalRescuesCompleted: 0,
    };

    return res.status(200).json({
      success: true,

      impact: {
        totalMealsRescued:
          totals.totalMealsRescued || 0,

        totalWeightKgSaved:
          totals.totalWeightKgSaved || 0,

        totalCo2PreventedKg:
          Math.round(
            (totals.totalCo2PreventedKg || 0) * 10
          ) / 10,

        totalRescuesCompleted:
          totals.totalRescuesCompleted || 0,

        totalDonors: usersByRole.DONOR,
        totalNgos: usersByRole.NGO,
        totalDrivers: usersByRole.DRIVER,
        totalAdmins: usersByRole.ADMIN,

        activeDonationsCount,
      },

      usersByRole,

      donationsByFoodType:
        foodTypeStats.map((item) => ({
          foodType: item._id || 'OTHER',
          count: item.count || 0,
          servings: item.totalServings || 0,
          weightKg: item.totalWeightKg || 0,
        })),

      donationsByStatus:
        statusStats.map((item) => ({
          status: item._id || 'UNKNOWN',
          count: item.count || 0,
        })),

      impactOverTime,

      recentRescues,
    });
  } catch (error) {
    console.error(
      'Error fetching impact summary:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch impact analytics.',
    });
  }
};

module.exports = {
  getImpactSummary,
};
const ImpactLog = require('../models/ImpactLog');
const Donation = require('../models/Donation');
const User = require('../models/User');

// @desc Get platform-wide aggregated impact stats and charts breakdown
// @route GET /api/analytics/impact
const getImpactSummary = async (req, res) => {
  try {
    const logs = await ImpactLog.find().sort({ completedAt: 1 });

    const totalMealsRescued = logs.reduce((acc, curr) => acc + (curr.mealsRescued || 0), 0);
    const totalWeightKgSaved = logs.reduce((acc, curr) => acc + (curr.weightKgSaved || 0), 0);
    const totalCo2PreventedKg = Math.round(
      logs.reduce((acc, curr) => acc + (curr.co2PreventedKg || 0), 0) * 10
    ) / 10;
    const totalRescuesCompleted = logs.length;

    const [totalDonors, totalNgos, totalDrivers, totalAdmins] = await Promise.all([
      User.countDocuments({ role: 'DONOR' }),
      User.countDocuments({ role: 'NGO' }),
      User.countDocuments({ role: 'DRIVER' }),
      User.countDocuments({ role: 'ADMIN' }),
    ]);

    const activeDonationsCount = await Donation.countDocuments({
      status: { $in: ['PENDING_MATCH', 'MATCHED', 'DRIVER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] },
    });

    // 1. Donations by food type breakdown
    const foodTypeStats = await Donation.aggregate([
      {
        $group: {
          _id: '$foodType',
          count: { $sum: 1 },
          totalServings: { $sum: '$quantity.estimatedServings' },
          totalWeightKg: { $sum: '$quantity.estimatedWeightKg' },
        },
      },
    ]);

    const donationsByFoodType = foodTypeStats.map((item) => ({
      foodType: item._id || 'OTHER',
      count: item.count,
      servings: item.totalServings,
      weightKg: item.totalWeightKg,
    }));

    // 2. Donations by status breakdown
    const statusStats = await Donation.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const donationsByStatus = statusStats.map((item) => ({
      status: item._id,
      count: item.count,
    }));

    // 3. Impact Over Time (daily buckets for chart display)
    const timeMap = {};
    for (const log of logs) {
      const dateKey = log.completedAt ? new Date(log.completedAt).toISOString().split('T')[0] : 'Unknown';
      if (!timeMap[dateKey]) {
        timeMap[dateKey] = { date: dateKey, mealsRescued: 0, weightKgSaved: 0, co2PreventedKg: 0, rescuesCount: 0 };
      }
      timeMap[dateKey].mealsRescued += log.mealsRescued || 0;
      timeMap[dateKey].weightKgSaved += log.weightKgSaved || 0;
      timeMap[dateKey].co2PreventedKg = Math.round((timeMap[dateKey].co2PreventedKg + (log.co2PreventedKg || 0)) * 10) / 10;
      timeMap[dateKey].rescuesCount += 1;
    }

    const impactOverTime = Object.values(timeMap);

    // 4. Recent rescue logs
    const recentRescues = await ImpactLog.find()
      .populate('donorId', 'name')
      .populate('ngoId', 'name')
      .populate('driverId', 'name')
      .populate('donationId', 'title foodType')
      .sort({ completedAt: -1 })
      .limit(8);

    return res.status(200).json({
      success: true,
      impact: {
        totalMealsRescued,
        totalWeightKgSaved,
        totalCo2PreventedKg,
        totalRescuesCompleted,
        totalDonors,
        totalNgos,
        totalDrivers,
        totalAdmins,
        activeDonationsCount,
      },
      usersByRole: {
        DONOR: totalDonors,
        NGO: totalNgos,
        DRIVER: totalDrivers,
        ADMIN: totalAdmins,
      },
      donationsByFoodType,
      donationsByStatus,
      impactOverTime,
      recentRescues,
    });
  } catch (error) {
    console.error('Error fetching impact summary:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getImpactSummary };

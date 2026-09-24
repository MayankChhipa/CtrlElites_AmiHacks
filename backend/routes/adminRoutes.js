const express = require('express');
const router = express.Router();
const {
  listUsers,
  getUserById,
  verifyUser,
  listAllDonations,
  getActiveDeliveries,
  getExpiringDonations,
  getFailedMatches,
  getPlatformStatistics,
  getRecentImpactLogs,
} = require('../controllers/adminController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// Protect all routes: ADMIN only
router.use(protect, authorize('ADMIN'));

router.get('/users', listUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/verify', verifyUser);

router.get('/donations', listAllDonations);
router.get('/donations/expiring', getExpiringDonations);

router.get('/deliveries/active', getActiveDeliveries);
router.get('/matches/failed', getFailedMatches);

router.get('/statistics', getPlatformStatistics);
router.get('/impact-logs', getRecentImpactLogs);

module.exports = router;

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

/*
 * All admin routes require:
 *
 * 1. A valid JWT
 * 2. An ADMIN role
 *
 * protect() loads the current User from MongoDB.
 * authorize('ADMIN') then checks the user's role.
 */
router.use(protect);
router.use(authorize('ADMIN'));

/*
 * User management
 */
router.get('/users', listUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/verify', verifyUser);

/*
 * Donation monitoring
 */
router.get('/donations', listAllDonations);
router.get('/donations/expiring', getExpiringDonations);

/*
 * Delivery monitoring
 */
router.get('/deliveries/active', getActiveDeliveries);

/*
 * Match monitoring
 */
router.get('/matches/failed', getFailedMatches);

/*
 * Platform analytics
 */
router.get('/statistics', getPlatformStatistics);

/*
 * Impact reporting
 */
router.get('/impact-logs', getRecentImpactLogs);

module.exports = router;
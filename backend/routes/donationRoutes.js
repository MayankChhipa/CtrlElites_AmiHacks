const express = require('express');

const router = express.Router();

const {
  createDonation,
  getMyDonations,
  getAllDonations,
  getDonationById,
  getNearbyDonations,
} = require('../controllers/donationController');

<<<<<<< HEAD
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
=======
const {
  protect,
} = require('../middlewares/authMiddleware');

const {
  authorize,
  requireVerified,
} = require('../middlewares/roleMiddleware');

/*
 * Create a donation.
 *
 * Only donors can create donations.
 * Admin is allowed for administrative operations/testing.
 */
router.post(
  '/',
  protect,
  authorize('DONOR', 'ADMIN'),
  requireVerified,
  createDonation
);
>>>>>>> 426e454d6872deeff76f5ef1d8759398ed1cb131

/*
 * Get the authenticated donor's own donations.
 * Must be defined BEFORE /:id to prevent Express from treating "my" as an ID.
 */
router.get('/my', protect, authorize('DONOR', 'ADMIN'), getMyDonations);

/*
 * Get nearby donations for real-time map views.
 * Open to NGOs, Drivers, and Admins.
 */
router.get('/nearby', protect, authorize('NGO', 'DRIVER', 'ADMIN'), getNearbyDonations);

/*
 * Base route for /api/donations:
 * - POST: Create a donation (Donors & Admins only)
 * - GET: Get all donations with filters
 */
router.route('/')
  .post(protect, authorize('DONOR', 'ADMIN'), createDonation)
  .get(protect, getAllDonations);

/*
 * Get one donation by ID.
 * The controller performs resource-level access checks.
 */
router.route('/:id')
  .get(protect, getDonationById);

module.exports = router;
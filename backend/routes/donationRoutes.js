const express = require('express');

const router = express.Router();

const {
  createDonation,
  getMyDonations,
  getAllDonations,
  getDonationById,
} = require('../controllers/donationController');

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

/*
 * Get the authenticated donor's own donations.
 */
router.get(
  '/my',
  protect,
  authorize('DONOR', 'ADMIN'),
  getMyDonations
);

/*
 * Get donations visible to the authenticated user.
 *
 * The controller should apply the appropriate filtering/
 * access rules based on the user's role.
 */
router.get(
  '/',
  protect,
  getAllDonations
);

/*
 * Get one donation.
 *
 * The controller performs the resource-level access check
 * for donor / matched NGO / assigned driver / admin.
 */
router.get(
  '/:id',
  protect,
  getDonationById
);

module.exports = router;

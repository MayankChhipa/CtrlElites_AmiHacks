const express = require('express');
const router = express.Router();
const {
  createDonation,
  getMyDonations,
  getAllDonations,
  getDonationById,
} = require('../controllers/donationController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

router.post('/', protect, authorize('DONOR', 'ADMIN'), createDonation);
router.get('/my', protect, getMyDonations);
router.get('/', protect, getAllDonations);
router.get('/:id', protect, getDonationById);

module.exports = router;

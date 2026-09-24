const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/deliveryController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize, requireVerified } = require('../middlewares/roleMiddleware');

router.use(protect);

// Driver & Admin Routes
router.get('/available', authorize('DRIVER', 'ADMIN'), getAvailableDeliveries);
router.get('/my-active', authorize('DRIVER', 'ADMIN'), getMyActiveDeliveries);
router.get('/:deliveryId', getDeliveryById);

router.post('/:donationId/claim', authorize('DRIVER', 'ADMIN'), requireVerified, claimDelivery);
router.post('/:deliveryId/en-route-pickup', authorize('DRIVER', 'ADMIN'), startEnRoutePickup);
router.post('/:deliveryId/arrived-pickup', authorize('DRIVER', 'ADMIN'), arriveAtPickup);
router.post('/:deliveryId/pickup', authorize('DRIVER', 'ADMIN'), confirmPickup);
router.post('/:deliveryId/en-route-delivery', authorize('DRIVER', 'ADMIN'), startEnRouteDelivery);
router.post('/:deliveryId/arrived-dropoff', authorize('DRIVER', 'ADMIN'), arriveAtDropoff);
router.post('/:deliveryId/deliver', authorize('DRIVER', 'ADMIN'), confirmDelivery);
router.post('/:deliveryId/cancel', authorize('DRIVER', 'ADMIN'), cancelDelivery);

// Shelter / NGO & Admin Verification
router.post('/:deliveryId/verify', authorize('NGO', 'ADMIN'), verifyDelivery);

module.exports = router;

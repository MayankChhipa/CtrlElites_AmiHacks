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

const {
  protect,
} = require('../middlewares/authMiddleware');

const {
  authorize,
  requireVerified,
} = require('../middlewares/roleMiddleware');

/*
 * Every delivery route requires authentication.
 */
router.use(protect);

/*
 * Available donations/deliveries that can be claimed.
 *
 * Admins may access this for monitoring/testing.
 */
router.get(
  '/available',
  authorize('DRIVER', 'ADMIN'),
  getAvailableDeliveries
);

/*
 * Current driver's active deliveries.
 */
router.get(
  '/my-active',
  authorize('DRIVER', 'ADMIN'),
  getMyActiveDeliveries
);

/*
 * Get a specific delivery.
 *
 * The controller performs the resource-level access check
 * for driver / donor / NGO / admin.
 */
router.get(
  '/:deliveryId',
  getDeliveryById
);

/*
 * Claim a donation and create/reuse its Delivery record.
 *
 * Only verified drivers should claim food.
 * Admin is allowed without the verification gate.
 */
router.post(
  '/:donationId/claim',
  authorize('DRIVER', 'ADMIN'),
  requireVerified,
  claimDelivery
);

/*
 * Driver delivery state transitions.
 *
 * Verified DRIVERs only.
 * ADMINs can perform these operations for administrative
 * intervention/testing.
 */
router.post(
  '/:deliveryId/en-route-pickup',
  authorize('DRIVER', 'ADMIN'),
  requireVerified,
  startEnRoutePickup
);

router.post(
  '/:deliveryId/arrived-pickup',
  authorize('DRIVER', 'ADMIN'),
  requireVerified,
  arriveAtPickup
);

router.post(
  '/:deliveryId/pickup',
  authorize('DRIVER', 'ADMIN'),
  requireVerified,
  confirmPickup
);

router.post(
  '/:deliveryId/en-route-delivery',
  authorize('DRIVER', 'ADMIN'),
  requireVerified,
  startEnRouteDelivery
);

router.post(
  '/:deliveryId/arrived-dropoff',
  authorize('DRIVER', 'ADMIN'),
  requireVerified,
  arriveAtDropoff
);

router.post(
  '/:deliveryId/deliver',
  authorize('DRIVER', 'ADMIN'),
  requireVerified,
  confirmDelivery
);

router.post(
  '/:deliveryId/cancel',
  authorize('DRIVER', 'ADMIN'),
  requireVerified,
  cancelDelivery
);

/*
 * NGO confirms the delivered food.
 *
 * NGO must be verified.
 * Admin can verify administratively.
 */
router.post(
  '/:deliveryId/verify',
  authorize('NGO', 'ADMIN'),
  requireVerified,
  verifyDelivery
);

module.exports = router;
const express = require('express');

const router = express.Router();

const {
  getNgoProposals,
  getNgoCapacity,
  acceptMatch,
  declineMatch,
} = require('../controllers/matchController');

const {
  protect,
} = require('../middlewares/authMiddleware');

const {
  authorize,
  requireVerified,
} = require('../middlewares/roleMiddleware');

/*
 * All match routes require authentication.
 */
router.use(protect);

/*
 * NGO proposals.
 *
 * Admins can access these for administrative monitoring.
 */
router.get(
  '/proposals',
  authorize('NGO', 'ADMIN'),
  getNgoProposals
);

/*
 * NGO capacity information.
 */
router.get(
  '/capacity',
  authorize('NGO', 'ADMIN'),
  getNgoCapacity
);

/*
 * Accepting a match consumes NGO capacity,
 * so the NGO must be verified.
 */
router.patch(
  '/:matchId/accept',
  authorize('NGO', 'ADMIN'),
  requireVerified,
  acceptMatch
);

/*
 * Declining a match changes the matching workflow
 * and may trigger rematching.
 *
 * Therefore only verified NGOs should perform it.
 */
router.patch(
  '/:matchId/decline',
  authorize('NGO', 'ADMIN'),
  requireVerified,
  declineMatch
);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  getNgoProposals,
  getNgoCapacity,
  acceptMatch,
  declineMatch,
} = require('../controllers/matchController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

router.use(protect);

router.get('/proposals', authorize('NGO', 'ADMIN'), getNgoProposals);
router.get('/capacity', authorize('NGO', 'ADMIN'), getNgoCapacity);
router.patch('/:matchId/accept', authorize('NGO', 'ADMIN'), acceptMatch);
router.patch('/:matchId/decline', authorize('NGO', 'ADMIN'), declineMatch);

module.exports = router;

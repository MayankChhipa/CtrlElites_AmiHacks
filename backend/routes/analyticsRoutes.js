const express = require('express');

const router = express.Router();

const {
  getImpactSummary,
} = require('../controllers/analyticsController');

const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');


router.use(protect);

router.get('/impact', getImpactSummary);

module.exports = router;

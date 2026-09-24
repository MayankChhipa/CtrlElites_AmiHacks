const express = require('express');
const router = express.Router();
const { getImpactSummary } = require('../controllers/analyticsController');

router.get('/impact', getImpactSummary);

module.exports = router;

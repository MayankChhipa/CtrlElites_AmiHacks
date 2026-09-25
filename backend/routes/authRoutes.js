const express = require('express');

const router = express.Router();

const {
  register,
  login,
  getMe,
} = require('../controllers/authController');

const {
  protect,
} = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

/*
 * Public authentication routes
 */
router.post('/register', upload.single('verificationDocument'), register);
router.post('/login', login);

/*
 * Authenticated user route
 */
router.get('/me', protect, getMe);

module.exports = router;

const express = require('express');

const router = express.Router();

const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} = require('../controllers/notificationController');

const {
  protect,
} = require('../middlewares/authMiddleware');

/*
 * All notification endpoints require authentication.
 */
router.use(protect);

/*
 * Get the authenticated user's notifications.
 */
router.get(
  '/',
  getMyNotifications
);

/*
 * Get the authenticated user's unread notification count.
 *
 * Keep this before /:id/read so it is handled explicitly
 * rather than being interpreted as an ID.
 */
router.get(
  '/unread-count',
  getUnreadCount
);

/*
 * Mark all notifications belonging to the authenticated
 * user as read.
 */
router.patch(
  '/read-all',
  markAllAsRead
);

/*
 * Mark one notification as read.
 *
 * The controller verifies that the notification belongs
 * to the authenticated user.
 */
router.patch(
  '/:id/read',
  markAsRead
);

module.exports = router;
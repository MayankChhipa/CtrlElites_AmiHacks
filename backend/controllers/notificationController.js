const mongoose = require('mongoose');
const Notification = require('../models/Notification');

/**
 * Get authenticated user's ID safely.
 */
const getUserId = (req) =>
  req.user?._id || req.user?.id || null;

/**
 * Parse and clamp pagination values.
 */
const parsePagination = (pageValue, limitValue) => {
  let page = Number.parseInt(pageValue, 10);
  let limit = Number.parseInt(limitValue, 10);

  if (!Number.isInteger(page) || page < 1) {
    page = 1;
  }

  if (!Number.isInteger(limit) || limit < 1) {
    limit = 20;
  }

  // Prevent clients from requesting huge result sets.
  limit = Math.min(limit, 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

/**
 * Generic server error response.
 */
const sendServerError = (res, error, context) => {
  console.error(`${context}:`, error);

  return res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred.',
  });
};

/**
 * @desc Get current user's notifications
 * @route GET /api/notifications
 */
const getMyNotifications = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const {
      page,
      limit,
      skip,
    } = parsePagination(
      req.query.page,
      req.query.limit
    );

    const query = {
      recipientId: userId,
    };

    if (req.query.unreadOnly === 'true') {
      query.isRead = false;
    }

    /*
     * total should represent the currently requested
     * filter, while unreadCount should always represent
     * ALL unread notifications for this user.
     */
    const [
      notifications,
      total,
      unreadCount,
    ] = await Promise.all([
      Notification.find(query)
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Notification.countDocuments(query),

      Notification.countDocuments({
        recipientId: userId,
        isRead: false,
      }),
    ]);

    return res.status(200).json({
      success: true,
      notifications,
      total,
      unreadCount,
      page,
      pages: Math.ceil(total / limit),
      limit,
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      'Get notifications error'
    );
  }
};

/**
 * @desc Mark a notification as read
 * @route PATCH /api/notifications/:id/read
 */
const markAsRead = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID.',
      });
    }

    /*
     * recipientId is included in the query so a user
     * cannot mark somebody else's notification as read.
     */
    const notification =
      await Notification.findOneAndUpdate(
        {
          _id: id,
          recipientId: userId,
        },
        {
          $set: {
            isRead: true,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      ).lean();

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      });
    }

    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      'Mark notification as read error'
    );
  }
};

/**
 * @desc Mark all notifications as read
 * @route PATCH /api/notifications/read-all
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const result =
      await Notification.updateMany(
        {
          recipientId: userId,
          isRead: false,
        },
        {
          $set: {
            isRead: true,
          },
        }
      );

    return res.status(200).json({
      success: true,
      message:
        'All notifications marked as read.',
      modifiedCount: result.modifiedCount || 0,
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      'Mark all notifications as read error'
    );
  }
};

/**
 * @desc Get unread notification count
 * @route GET /api/notifications/unread-count
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const count =
      await Notification.countDocuments({
        recipientId: userId,
        isRead: false,
      });

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      'Get unread notification count error'
    );
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
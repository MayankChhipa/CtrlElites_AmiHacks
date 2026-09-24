const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    type: {
      type: String,
      enum: [
        'DONATION',
        'MATCH',
        'DELIVERY',
        'SYSTEM',
        'URGENCY',
      ],
      default: 'SYSTEM',
      required: true,
      index: true,
    },

    data: {
      donationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donation',
      },

      matchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Match',
      },

      deliveryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Delivery',
      },
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Main query used by getMyNotifications().
 *
 * This allows:
 *   recipientId + newest notifications
 */
NotificationSchema.index({
  recipientId: 1,
  createdAt: -1,
});

/*
 * Efficient unread notification queries.
 */
NotificationSchema.index({
  recipientId: 1,
  isRead: 1,
  createdAt: -1,
});

/*
 * Useful when filtering notifications by type.
 */
NotificationSchema.index({
  recipientId: 1,
  type: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  'Notification',
  NotificationSchema
);
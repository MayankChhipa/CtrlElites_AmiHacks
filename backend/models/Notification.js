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
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['DONATION', 'MATCH', 'DELIVERY', 'SYSTEM', 'URGENCY'],
      default: 'SYSTEM',
    },
    data: {
      donationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation' },
      matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
      deliveryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery' },
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', NotificationSchema);

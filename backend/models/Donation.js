const mongoose = require('mongoose');

const DonationSchema = new mongoose.Schema(
  {
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    description: String,
    foodType: {
      type: String,
      enum: ['COOKED_MEALS', 'RAW_PRODUCE', 'PACKAGED_FOOD', 'BAKERY', 'DAIRY'],
      required: true,
    },
    dietaryPreference: {
      type: String,
      enum: ['VEG', 'NON_VEG', 'VEGAN', 'MIXED'],
      default: 'VEG',
    },
    quantity: {
      amount: { type: Number, required: true },
      unit: { type: String, enum: ['KG', 'SERVINGS', 'BOXES', 'PACKETS'], default: 'SERVINGS' },
      estimatedServings: { type: Number, required: true },
      estimatedWeightKg: { type: Number, required: true },
    },
    perishability: {
      preparedAt: { type: Date, default: Date.now },
      expiryTime: { type: Date, required: true, index: true },
      requiresColdChain: { type: Boolean, default: false },
    },
    pickupLocation: {
      address: { type: String, required: true },
      contactPhone: String,
      instructions: String,
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true }, // [longitude, latitude]
      },
    },
    images: [{ type: String }],
    status: {
      type: String,
      enum: [
        'DRAFT',
        'PENDING_MATCH',
        'MATCHED',
        'DRIVER_ASSIGNED',
        'PICKED_UP',
        'IN_TRANSIT',
        'DELIVERED',
        'VERIFIED',
        'EXPIRED',
        'CANCELLED',
      ],
      default: 'PENDING_MATCH',
      index: true,
    },
    urgencyLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'EXPIRED'],
      default: 'MEDIUM',
      index: true,
    },
    matchedNgoId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedDriverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    activeDeliveryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery' },

    // Handshake verification codes
    pickupOtp: { type: String },
    deliveryOtp: { type: String },

    // AI Parser metadata
    aiExtracted: {
      confidence: { type: Number, default: 0 },
      extractedFrom: { type: String, enum: ['IMAGE', 'TEXT', 'NONE'], default: 'NONE' },
    },
  },
  { timestamps: true }
);

DonationSchema.index({ 'pickupLocation.location': '2dsphere' });

module.exports = mongoose.model('Donation', DonationSchema);

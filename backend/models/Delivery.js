const mongoose = require('mongoose');

const DeliverySchema = new mongoose.Schema(
  {
    donationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation', required: true, unique: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    status: {
      type: String,
      enum: [
        'ASSIGNED',
        'EN_ROUTE_TO_PICKUP',
        'ARRIVED_AT_PICKUP',
        'PICKED_UP',
        'EN_ROUTE_TO_DELIVERY',
        'ARRIVED_AT_DROPOFF',
        'DELIVERED',
        'VERIFIED',
        'CANCELLED',
      ],
      default: 'ASSIGNED',
      index: true,
    },

    pickupCoords: { type: [Number], required: true }, // [longitude, latitude]
    dropoffCoords: { type: [Number], required: true }, // [longitude, latitude]

    routeSummary: {
      distanceKm: Number,
      durationMinutes: Number,
      encodedGeometry: String,
      geojson: mongoose.Schema.Types.Mixed,
    },

    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number],
    },
    breadcrumbs: [
      {
        coordinates: [Number],
        timestamp: { type: Date, default: Date.now },
      },
    ],

    pickupConfirmedAt: Date,
    deliveredConfirmedAt: Date,

    proofOfDelivery: {
      photoUrl: String,
      ngoFeedbackNote: String,
      foodConditionRating: { type: Number, min: 1, max: 5 },
    },
  },
  { timestamps: true }
);

DeliverySchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('Delivery', DeliverySchema);

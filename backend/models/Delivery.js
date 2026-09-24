const mongoose = require('mongoose');

const coordinatesValidator = {
  validator: function (value) {
    if (!Array.isArray(value) || value.length !== 2) {
      return false;
    }

    const [longitude, latitude] = value;

    return (
      typeof longitude === 'number' &&
      typeof latitude === 'number' &&
      Number.isFinite(longitude) &&
      Number.isFinite(latitude) &&
      longitude >= -180 &&
      longitude <= 180 &&
      latitude >= -90 &&
      latitude <= 90
    );
  },
  message:
    'Coordinates must be [longitude, latitude] with valid geographic values.',
};

const DeliverySchema = new mongoose.Schema(
  {
    /*
     * One donation can have only one Delivery document.
     *
     * CANCELLED deliveries are reused by the delivery controller
     * when another driver claims the same donation.
     */
    donationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      required: true,
      unique: true,
      index: true,
    },

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

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
      required: true,
      index: true,
    },

    /*
     * [longitude, latitude]
     */
    pickupCoords: {
      type: [Number],
      required: true,
      validate: coordinatesValidator,
    },

    /*
     * [longitude, latitude]
     */
    dropoffCoords: {
      type: [Number],
      required: true,
      validate: coordinatesValidator,
    },

    routeSummary: {
      distanceKm: {
        type: Number,
        min: 0,
      },

      durationMinutes: {
        type: Number,
        min: 0,
      },

      encodedGeometry: {
        type: String,
        trim: true,
      },

      geojson: {
        type: mongoose.Schema.Types.Mixed,
      },
    },

    /*
     * Driver's latest GPS position.
     *
     * GeoJSON Point format:
     * {
     *   type: 'Point',
     *   coordinates: [longitude, latitude]
     * }
     */
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },

      coordinates: {
        type: [Number],
        validate: coordinatesValidator,
      },
    },

    /*
     * Historical GPS positions collected during delivery.
     */
    breadcrumbs: [
      {
        coordinates: {
          type: [Number],
          validate: coordinatesValidator,
        },

        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    /*
     * Set when the driver confirms pickup.
     */
    pickupConfirmedAt: {
      type: Date,
    },

    /*
     * Set when the driver confirms delivery.
     */
    deliveredConfirmedAt: {
      type: Date,
    },

    /*
     * Proof submitted at delivery time.
     */
    proofOfDelivery: {
      photoUrl: {
        type: String,
        trim: true,
      },

      ngoFeedbackNote: {
        type: String,
        trim: true,
        maxlength: 2000,
      },

      foodConditionRating: {
        type: Number,
        min: 1,
        max: 5,
      },
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Allows MongoDB geospatial queries against the driver's
 * current location.
 */
DeliverySchema.index({
  currentLocation: '2dsphere',
});

/*
 * Useful for finding active deliveries for a driver.
 */
DeliverySchema.index({
  driverId: 1,
  status: 1,
});

/*
 * Useful for finding deliveries associated with an NGO.
 */
DeliverySchema.index({
  ngoId: 1,
  status: 1,
});

/*
 * Useful for donor delivery history.
 */
DeliverySchema.index({
  donorId: 1,
  createdAt: -1,
});

module.exports = mongoose.model('Delivery', DeliverySchema);
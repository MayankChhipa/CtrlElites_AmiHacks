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

const DonationSchema = new mongoose.Schema(
  {
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 5000,
    },

    foodType: {
      type: String,
      enum: [
        'COOKED_MEALS',
        'RAW_PRODUCE',
        'PACKAGED_FOOD',
        'BAKERY',
        'DAIRY',
      ],
      required: true,
      index: true,
    },

    dietaryPreference: {
      type: String,
      enum: ['VEG', 'NON_VEG', 'VEGAN', 'MIXED'],
      default: 'VEG',
    },

    quantity: {
      amount: {
        type: Number,
        required: true,
        min: 0.01,
      },

      unit: {
        type: String,
        enum: [
          'KG',
          'SERVINGS',
          'BOXES',
          'PACKETS',
        ],
        default: 'SERVINGS',
      },

      estimatedServings: {
        type: Number,
        required: true,
        min: 1,
      },

      estimatedWeightKg: {
        type: Number,
        required: true,
        min: 0.01,
      },
    },

    perishability: {
      preparedAt: {
        type: Date,
        default: Date.now,
      },

      expiryTime: {
        type: Date,
        required: true,
        index: true,
      },

      requiresColdChain: {
        type: Boolean,
        default: false,
      },
    },

    pickupLocation: {
      address: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000,
      },

      contactPhone: {
        type: String,
        trim: true,
        maxlength: 30,
      },

      instructions: {
        type: String,
        trim: true,
        maxlength: 2000,
      },

      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },

        coordinates: {
          type: [Number],
          required: true,
          validate: coordinatesValidator,
        },
      },
    },

    images: [
      {
        type: String,
        trim: true,
      },
    ],

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
      required: true,
      index: true,
    },

    urgencyLevel: {
      type: String,
      enum: [
        'LOW',
        'MEDIUM',
        'HIGH',
        'CRITICAL',
        'EXPIRED',
      ],
      default: 'MEDIUM',
      index: true,
    },

    matchedNgoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    assignedDriverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    activeDeliveryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Delivery',
      index: true,
    },

    /*
     * Handshake verification codes.
     *
     * These should ideally be stored as hashes if the OTPs
     * are considered sensitive in your production deployment.
     */
    pickupOtp: {
      type: String,
      trim: true,
    },

    deliveryOtp: {
      type: String,
      trim: true,
    },

    /*
     * AI parser metadata.
     */
    aiExtracted: {
      confidence: {
        type: Number,
        default: 0,
        min: 0,
        max: 1,
      },

      extractedFrom: {
        type: String,
        enum: ['IMAGE', 'TEXT', 'NONE'],
        default: 'NONE',
      },
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Geospatial queries for finding donations near NGOs/drivers.
 */
DonationSchema.index({
  'pickupLocation.location': '2dsphere',
});

/*
 * Useful for the matching engine:
 * find pending donations ordered by urgency/expiry.
 */
DonationSchema.index({
  status: 1,
  'perishability.expiryTime': 1,
});

/*
 * Useful for donor history.
 */
DonationSchema.index({
  donorId: 1,
  createdAt: -1,
});

/*
 * Useful for NGO-related donation queries.
 */
DonationSchema.index({
  matchedNgoId: 1,
  status: 1,
});

/*
 * Useful for driver-related donation queries.
 */
DonationSchema.index({
  assignedDriverId: 1,
  status: 1,
});

module.exports = mongoose.model(
  'Donation',
  DonationSchema
);
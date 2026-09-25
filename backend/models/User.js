const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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

const GeoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: coordinatesValidator,
    },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      maxlength: 254,
    },

    /*
     * Passwords are never stored directly.
     * Auth controller hashes the password before creating a user.
     */
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ['DONOR', 'NGO', 'DRIVER', 'ADMIN'],
      required: true,
      index: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },

    avatarUrl: {
      type: String,
      trim: true,
    },

    /*
     * Donors are normally verified during registration.
     * NGOs and drivers require administrative verification.
     */
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    /*
     * Headquarters/origin location.
     * GeoJSON format:
     *
     * {
     *   type: 'Point',
     *   coordinates: [longitude, latitude]
     * }
     */
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

    address: {
      street: {
        type: String,
        trim: true,
        maxlength: 300,
      },

      city: {
        type: String,
        trim: true,
        maxlength: 100,
      },

      postalCode: {
        type: String,
        trim: true,
        maxlength: 20,
      },

      formattedAddress: {
        type: String,
        trim: true,
        maxlength: 1000,
      },
    },

    /*
     * DONOR-specific information.
     */
    donorProfile: {
      organizationType: {
        type: String,
        enum: [
          'RESTAURANT',
          'CATERER',
          'HOTEL',
          'SUPERMARKET',
          'BAKERY',
          'INDIVIDUAL',
        ],
        default: 'RESTAURANT',
      },

      licenseNumber: {
        type: String,
        trim: true,
        maxlength: 100,
      },
    },

    /*
     * NGO-specific information.
     */
    ngoProfile: {
      registrationNumber: {
        type: String,
        trim: true,
        maxlength: 100,
      },

      capacityDailyMeals: {
        type: Number,
        default: 100,
        min: 0,
      },

      allocatedCapacity: {
        type: Number,
        default: 0,
        min: 0,
      },

      storageFacilities: {
        hasRefrigeration: {
          type: Boolean,
          default: false,
        },

        hasFreezer: {
          type: Boolean,
          default: false,
        },

        dryStorageAvailable: {
          type: Boolean,
          default: true,
        },
      },

      acceptedFoodTypes: [
        {
          type: String,
          enum: [
            'COOKED_MEALS',
            'RAW_PRODUCE',
            'PACKAGED_FOOD',
            'BAKERY',
            'DAIRY',
          ],
        },
      ],

      dietaryRestrictionsAccepted: [
        {
          type: String,
          enum: [
            'VEG',
            'NON_VEG',
            'VEGAN',
            'ANY',
          ],
        },
      ],
    },

    /*
     * DRIVER-specific information.
     */
    driverProfile: {
      vehicleType: {
        type: String,
        enum: [
          'BIKE',
          'CAR',
          'VAN',
          'REFRIGERATED_VAN',
          'TRUCK',
        ],
        default: 'CAR',
      },

      licenseNumber: {
        type: String,
        trim: true,
        maxlength: 100,
      },

      isAvailable: {
        type: Boolean,
        default: true,
        index: true,
      },

      activeDeliveryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Delivery',
        default: null,
      },

      /*
       * Driver location is optional until the driver actually
       * shares their current position.
       *
       * Do NOT default this to [0, 0].
       */
      currentLocation: {
        type: GeoPointSchema,
        default: undefined,
      },
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Geospatial indexes.
 */
UserSchema.index({
  location: '2dsphere',
});

UserSchema.index({
  'driverProfile.currentLocation': '2dsphere',
});

/*
 * Useful for finding available drivers.
 */
UserSchema.index({
  role: 1,
  isVerified: 1,
  'driverProfile.isAvailable': 1,
});

/*
 * Useful for finding verified NGOs.
 */
UserSchema.index({
  role: 1,
  isVerified: 1,
});

/*
 * Compare a plaintext password with the stored hash.
 */
UserSchema.methods.comparePassword = async function (
  enteredPassword
) {
  if (
    typeof enteredPassword !== 'string' ||
    !enteredPassword
  ) {
    return false;
  }

  if (!this.passwordHash) {
    return false;
  }

  return bcrypt.compare(
    enteredPassword,
    this.passwordHash
  );
};

module.exports = mongoose.model('User', UserSchema);

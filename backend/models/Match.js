const mongoose = require('mongoose');

const scoreValidator = {
  validator: function (value) {
    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 100
    );
  },
  message: 'Score must be between 0 and 100.',
};

const nonNegativeNumberValidator = {
  validator: function (value) {
    return (
      value === undefined ||
      value === null ||
      (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= 0
      )
    );
  },
  message: 'Value must be a non-negative number.',
};

const MatchSchema = new mongoose.Schema(
  {
    donationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      required: true,
      index: true,
    },

    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /*
     * Overall matching score.
     * Range: 0–100.
     */
    matchScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      validate: scoreValidator,
    },

    scoreBreakdown: {
      distanceKm: {
        type: Number,
        min: 0,
        validate: nonNegativeNumberValidator,
      },

      distanceScore: {
        type: Number,
        min: 0,
        max: 100,
        validate: scoreValidator,
      },

      urgencyScore: {
        type: Number,
        min: 0,
        max: 100,
        validate: scoreValidator,
      },

      capacityScore: {
        type: Number,
        min: 0,
        max: 100,
        validate: scoreValidator,
      },

      compatibilityScore: {
        type: Number,
        min: 0,
        max: 100,
        validate: scoreValidator,
      },

      driverScore: {
        type: Number,
        min: 0,
        max: 100,
        validate: scoreValidator,
      },

      totalScore: {
        type: Number,
        min: 0,
        max: 100,
        validate: scoreValidator,
      },
    },

    status: {
      type: String,
      enum: [
        'PROPOSED',
        'ACCEPTED',
        'DECLINED',
        'EXPIRED',
      ],
      default: 'PROPOSED',
      required: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    respondedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Prevent duplicate proposals for the same
 * donation → NGO combination.
 */
MatchSchema.index(
  {
    donationId: 1,
    ngoId: 1,
  },
  {
    unique: true,
  }
);

/*
 * Useful for retrieving an NGO's active proposals.
 */
MatchSchema.index({
  ngoId: 1,
  status: 1,
  expiresAt: 1,
});

/*
 * Useful for finding all active proposals for a donation.
 */
MatchSchema.index({
  donationId: 1,
  status: 1,
});

/*
 * Useful for expiration/cleanup jobs.
 */
MatchSchema.index({
  status: 1,
  expiresAt: 1,
});

module.exports = mongoose.model(
  'Match',
  MatchSchema
);
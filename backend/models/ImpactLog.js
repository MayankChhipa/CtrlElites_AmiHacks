const mongoose = require('mongoose');

const ImpactLogSchema = new mongoose.Schema(
  {
    donationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
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

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    mealsRescued: {
      type: Number,
      required: true,
      min: 0,
    },

    weightKgSaved: {
      type: Number,
      required: true,
      min: 0,
    },

    /*
     * Estimated CO2e prevented by diverting food from waste.
     * Current project assumption:
     * 1 kg food ≈ 2.5 kg CO2e.
     */
    co2PreventedKg: {
      type: Number,
      required: true,
      min: 0,
    },

    completedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Useful for analytics grouped by completion date.
 */
ImpactLogSchema.index({
  completedAt: -1,
});

/*
 * Useful for donor impact history.
 */
ImpactLogSchema.index({
  donorId: 1,
  completedAt: -1,
});

/*
 * Useful for NGO impact history.
 */
ImpactLogSchema.index({
  ngoId: 1,
  completedAt: -1,
});

/*
 * Useful for driver impact history.
 */
ImpactLogSchema.index({
  driverId: 1,
  completedAt: -1,
});

/*
 * Prevent the same donation from creating multiple impact
 * records if your workflow considers one donation = one
 * completed rescue.
 */
ImpactLogSchema.index(
  { donationId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  'ImpactLog',
  ImpactLogSchema
);
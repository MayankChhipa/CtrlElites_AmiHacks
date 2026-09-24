const mongoose = require('mongoose');

const ImpactLogSchema = new mongoose.Schema(
  {
    donationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation', required: true },
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mealsRescued: { type: Number, required: true },
    weightKgSaved: { type: Number, required: true },
    co2PreventedKg: { type: Number, required: true }, // 1kg food ≈ 2.5kg CO2e
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ImpactLog', ImpactLogSchema);

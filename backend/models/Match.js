const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema(
  {
    donationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation', required: true, index: true },
    ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    matchScore: { type: Number, required: true }, // 0 to 100
    scoreBreakdown: {
      distanceKm: Number,
      distanceScore: Number,
      urgencyScore: Number,
      capacityScore: Number,
      compatibilityScore: Number,
      driverScore: Number,
      totalScore: Number,
    },
    status: {
      type: String,
      enum: ['PROPOSED', 'ACCEPTED', 'DECLINED', 'EXPIRED'],
      default: 'PROPOSED',
      index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
    respondedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Match', MatchSchema);

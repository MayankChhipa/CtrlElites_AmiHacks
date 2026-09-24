const Match = require('../models/Match');
const Donation = require('../models/Donation');
const User = require('../models/User');
const { runMatchingEngine } = require('../services/matchingEngine');
const { enrichDonationWithUrgency } = require('../services/urgencyEngine');
const { sanitizeDonation } = require('../utils/sanitize');
const {
  emitMatchProposed,
  emitMatchAccepted,
  emitMatchDeclined,
} = require('../utils/socketEmitter');

// @desc Get match proposals for logged-in NGO
// @route GET /api/matches/proposals
const getNgoProposals = async (req, res) => {
  try {
    const matches = await Match.find({
      ngoId: req.user._id,
      status: 'PROPOSED',
    })
      .populate({
        path: 'donationId',
        populate: { path: 'donorId', select: 'name phone address location' },
      })
      .sort({ createdAt: -1 });

    // Filter out matches whose donation might already have been matched or expired
    const activeProposals = matches
      .filter((m) => m.donationId && m.donationId.status === 'PENDING_MATCH')
      .map((m) => {
        const plain = m.toObject();
        if (plain.donationId) {
          plain.donationId = enrichDonationWithUrgency(plain.donationId);
          plain.donationId = sanitizeDonation(plain.donationId, req.user);
        }
        return plain;
      });

    return res.status(200).json({ success: true, proposals: activeProposals });
  } catch (error) {
    console.error('Error fetching NGO proposals:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get capacity details for logged-in NGO
// @route GET /api/matches/capacity
const getNgoCapacity = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== 'NGO') {
      return res.status(403).json({ success: false, message: 'Only NGOs have capacity metrics.' });
    }

    const capacityDailyMeals = user.ngoProfile?.capacityDailyMeals || 100;
    const allocatedCapacity = user.ngoProfile?.allocatedCapacity || 0;
    const availableCapacity = Math.max(0, capacityDailyMeals - allocatedCapacity);

    return res.status(200).json({
      success: true,
      capacityDailyMeals,
      allocatedCapacity,
      availableCapacity,
      utilizationPercentage: Math.round((allocatedCapacity / Math.max(1, capacityDailyMeals)) * 100),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Accept a match proposal by NGO (Reserves capacity)
// @route PATCH /api/matches/:matchId/accept
const acceptMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId).populate('donationId');

    if (!match) {
      return res.status(404).json({ success: false, message: 'Match proposal not found.' });
    }

    if (match.ngoId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized: this proposal is for another shelter.' });
    }

    if (match.status !== 'PROPOSED') {
      return res.status(400).json({ success: false, message: `Match is already ${match.status}.` });
    }

    const donation = await Donation.findById(match.donationId._id);
    if (!donation || donation.status !== 'PENDING_MATCH') {
      return res.status(400).json({
        success: false,
        message: 'This donation is no longer available for matching.',
      });
    }

    const donationServings = donation.quantity?.estimatedServings || 20;

    // Check NGO capacity
    const ngo = await User.findById(match.ngoId);
    const capacityDailyMeals = ngo.ngoProfile?.capacityDailyMeals || 100;
    const currentAllocated = ngo.ngoProfile?.allocatedCapacity || 0;
    const availableCapacity = capacityDailyMeals - currentAllocated;

    if (availableCapacity < donationServings) {
      return res.status(400).json({
        success: false,
        message: `Insufficient capacity. Need ${donationServings} servings, but only ${Math.max(0, availableCapacity)} available.`,
      });
    }

    // 1. Atomically claim donation to prevent race condition between concurrent shelter acceptances
    const updatedDonation = await Donation.findOneAndUpdate(
      {
        _id: match.donationId._id,
        status: 'PENDING_MATCH',
      },
      {
        status: 'MATCHED',
        matchedNgoId: match.ngoId,
      },
      { returnDocument: 'after' }
    );

    if (!updatedDonation) {
      return res.status(409).json({
        success: false,
        message: 'This donation is no longer available or was just claimed by another shelter.',
      });
    }

    // 2. Reserve Capacity on NGO safely
    await User.findByIdAndUpdate(match.ngoId, {
      $inc: { 'ngoProfile.allocatedCapacity': donationServings },
    });

    // 3. Update match to ACCEPTED
    match.status = 'ACCEPTED';
    match.respondedAt = new Date();
    await match.save();

    // 4. Expire other pending proposals for this donation
    await Match.updateMany(
      {
        donationId: updatedDonation._id,
        _id: { $ne: match._id },
        status: 'PROPOSED',
      },
      { status: 'EXPIRED' }
    );

    // 5. Emit socket & notifications
    await emitMatchAccepted(match, updatedDonation);

    return res.status(200).json({
      success: true,
      message: 'Donation accepted and capacity allocated! Now awaiting driver dispatch.',
      donation: sanitizeDonation(updatedDonation, req.user),
      match,
    });
  } catch (error) {
    console.error('Error accepting match:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Decline a match proposal by NGO (Triggers Re-matching)
// @route PATCH /api/matches/:matchId/decline
const declineMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId).populate('donationId');

    if (!match) {
      return res.status(404).json({ success: false, message: 'Match proposal not found.' });
    }

    if (match.ngoId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    match.status = 'DECLINED';
    match.respondedAt = new Date();
    await match.save();

    const donation = await Donation.findById(match.donationId._id);
    if (donation) {
      emitMatchDeclined(match, donation);

      // Re-matching: Find next eligible candidate NGO
      const previousMatches = await Match.find({ donationId: donation._id });
      const excludeNgoIds = previousMatches.map((m) => m.ngoId);

      const newMatches = await runMatchingEngine(donation, excludeNgoIds);

      if (newMatches && newMatches.length > 0) {
        // Emit proposal for the new candidate
        for (const nm of newMatches) {
          await emitMatchProposed(nm, donation, nm.ngoId);
        }
      } else {
        console.log(`[Re-matching] No more eligible shelters for donation ${donation._id}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Match proposal declined. Re-matching initiated for surplus donation.',
    });
  } catch (error) {
    console.error('Error declining match:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getNgoProposals,
  getNgoCapacity,
  acceptMatch,
  declineMatch,
};

const mongoose = require('mongoose');

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

/**
 * Get authenticated user ID safely.
 */
const getUserId = (req) =>
  req.user?._id || req.user?.id || null;

/**
 * Check whether user is an admin.
 */
const isAdmin = (req) =>
  String(req.user?.role || '').toUpperCase() === 'ADMIN';

/**
 * Check whether user is an NGO.
 */
const isNgo = (req) =>
  String(req.user?.role || '').toUpperCase() === 'NGO';

/**
 * Validate MongoDB ObjectId.
 */
const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

/**
 * Generic server error response.
 *
 * Do not expose raw MongoDB/internal error messages
 * to the client.
 */
const sendServerError = (res, error, context) => {
  console.error(`${context}:`, error);

  return res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred.',
  });
};

/**
 * @desc Get match proposals for logged-in NGO
 * @route GET /api/matches/proposals
 */
const getNgoProposals = async (req, res) => {
  try {
    if (!isNgo(req)) {
      return res.status(403).json({
        success: false,
        message: 'Only NGOs can view match proposals.',
      });
    }

    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const matches = await Match.find({
      ngoId: userId,
      status: 'PROPOSED',
    })
      .populate({
        path: 'donationId',
        populate: {
          path: 'donorId',
          select: 'name phone address location',
        },
      })
      .sort({ createdAt: -1 });

    /*
     * Only return proposals whose donation is still waiting
     * for a match.
     */
    const activeProposals = matches
      .filter(
        (match) =>
          match.donationId &&
          match.donationId.status === 'PENDING_MATCH'
      )
      .map((match) => {
        const plain = match.toObject();

        if (plain.donationId) {
          const enriched =
            enrichDonationWithUrgency(
              plain.donationId
            );

          plain.donationId = sanitizeDonation(
            enriched,
            req.user
          );
        }

        return plain;
      });

    return res.status(200).json({
      success: true,
      proposals: activeProposals,
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      'Get NGO proposals error'
    );
  }
};

/**
 * @desc Get capacity details for logged-in NGO
 * @route GET /api/matches/capacity
 */
const getNgoCapacity = async (req, res) => {
  try {
    if (!isNgo(req)) {
      return res.status(403).json({
        success: false,
        message:
          'Only NGOs have capacity metrics.',
      });
    }

    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const user = await User.findById(userId).select(
      'role ngoProfile'
    );

    if (!user || user.role !== 'NGO') {
      return res.status(403).json({
        success: false,
        message:
          'Only NGOs have capacity metrics.',
      });
    }

    /*
     * These defaults are retained for compatibility with
     * the existing project behavior.
     */
    const capacityDailyMeals = Math.max(
      0,
      Number(user.ngoProfile?.capacityDailyMeals) || 100
    );

    const allocatedCapacity = Math.max(
      0,
      Number(user.ngoProfile?.allocatedCapacity) || 0
    );

    const availableCapacity = Math.max(
      0,
      capacityDailyMeals - allocatedCapacity
    );

    const utilizationPercentage =
      capacityDailyMeals > 0
        ? Math.min(
            100,
            Math.round(
              (allocatedCapacity /
                capacityDailyMeals) *
                100
            )
          )
        : 0;

    return res.status(200).json({
      success: true,
      capacityDailyMeals,
      allocatedCapacity,
      availableCapacity,
      utilizationPercentage,
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      'Get NGO capacity error'
    );
  }
};

/**
 * @desc Accept a match proposal by NGO
 *       Reserves NGO capacity atomically.
 * @route PATCH /api/matches/:matchId/accept
 */
const acceptMatch = async (req, res) => {
  try {
    const { matchId } = req.params;

    if (!isValidObjectId(matchId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid match ID.',
      });
    }

    if (!isNgo(req) && !isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message:
          'Only the assigned NGO or an administrator can accept this match.',
      });
    }

    const match = await Match.findById(matchId)
      .populate('donationId');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match proposal not found.',
      });
    }

    const requesterId = String(
      getUserId(req) || ''
    );

    const matchNgoId = String(
      match.ngoId || ''
    );

    if (
      !isAdmin(req) &&
      requesterId !== matchNgoId
    ) {
      return res.status(403).json({
        success: false,
        message:
          'You are not authorized to accept this proposal.',
      });
    }

    if (match.status !== 'PROPOSED') {
      return res.status(409).json({
        success: false,
        message:
          'This match proposal is no longer available.',
      });
    }

    const donationId =
      match.donationId?._id || match.donationId;

    if (!donationId) {
      return res.status(400).json({
        success: false,
        message:
          'This match is not associated with a valid donation.',
      });
    }

    /*
     * Read the donation to determine the exact number of
     * servings that must be reserved.
     */
    const donation = await Donation.findById(
      donationId
    );

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found.',
      });
    }

    if (donation.status !== 'PENDING_MATCH') {
      return res.status(409).json({
        success: false,
        message:
          'This donation is no longer available for matching.',
      });
    }

    const donationServings = Number(
      donation.quantity?.estimatedServings
    );

    if (
      !Number.isFinite(donationServings) ||
      donationServings <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Donation has an invalid serving quantity.',
      });
    }

    /*
     * ---------------------------------------------------------
     * ATOMIC CAPACITY + DONATION CLAIM
     * ---------------------------------------------------------
     *
     * The original implementation:
     *
     *   1. checked capacity
     *   2. claimed donation
     *   3. incremented capacity
     *
     * Two requests could pass step 1 simultaneously.
     *
     * We instead reserve capacity with a conditional
     * MongoDB update:
     *
     * allocatedCapacity + donationServings <= capacityDailyMeals
     *
     * This prevents over-allocation under concurrent requests.
     */

    const ngo = await User.findOneAndUpdate(
      {
        _id: match.ngoId,
        role: 'NGO',

        $expr: {
          $lte: [
            {
              $add: [
                {
                  $ifNull: [
                    '$ngoProfile.allocatedCapacity',
                    0,
                  ],
                },
                donationServings,
              ],
            },
            {
              $ifNull: [
                '$ngoProfile.capacityDailyMeals',
                100,
              ],
            },
          ],
        },
      },
      {
        $inc: {
          'ngoProfile.allocatedCapacity':
            donationServings,
        },
      },
      {
        new: true,
      }
    );

    if (!ngo) {
      return res.status(409).json({
        success: false,
        message:
          'Insufficient NGO capacity or the NGO is no longer available.',
      });
    }

    /*
     * Now atomically claim the donation.
     *
     * If another NGO claimed it between our initial read
     * and this update, release the capacity reservation.
     */
    const updatedDonation =
      await Donation.findOneAndUpdate(
        {
          _id: donationId,
          status: 'PENDING_MATCH',
        },
        {
          $set: {
            status: 'MATCHED',
            matchedNgoId: match.ngoId,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!updatedDonation) {
      await User.findByIdAndUpdate(
        match.ngoId,
        {
          $inc: {
            'ngoProfile.allocatedCapacity':
              -donationServings,
          },
        }
      );

      return res.status(409).json({
        success: false,
        message:
          'This donation was just claimed by another shelter.',
      });
    }

    /*
     * Update this match.
     */
    match.status = 'ACCEPTED';
    match.respondedAt = new Date();

    try {
      await match.save();
    } catch (matchError) {
      /*
       * Roll back both donation and NGO capacity if
       * match persistence fails.
       */
      await Donation.findByIdAndUpdate(
        donationId,
        {
          $set: {
            status: 'PENDING_MATCH',
            matchedNgoId: null,
          },
        }
      );

      await User.findByIdAndUpdate(
        match.ngoId,
        {
          $inc: {
            'ngoProfile.allocatedCapacity':
              -donationServings,
          },
        }
      );

      throw matchError;
    }

    /*
     * Expire all other proposals for this donation.
     */
    await Match.updateMany(
      {
        donationId: updatedDonation._id,
        _id: { $ne: match._id },
        status: 'PROPOSED',
      },
      {
        $set: {
          status: 'EXPIRED',
          respondedAt: new Date(),
        },
      }
    );

    /*
     * Socket notification failure should not invalidate the
     * successful database transaction.
     */
    try {
      await emitMatchAccepted(
        match,
        updatedDonation
      );
    } catch (socketError) {
      console.error(
        'Match accepted socket notification error:',
        socketError
      );
    }

    return res.status(200).json({
      success: true,
      message:
        'Donation accepted and capacity allocated. Now awaiting driver dispatch.',
      donation: sanitizeDonation(
        updatedDonation,
        req.user
      ),
      match,
    });
  } catch (error) {
    if (error?.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message:
          'Match data failed validation.',
      });
    }

    return sendServerError(
      res,
      error,
      'Accept match error'
    );
  }
};

/**
 * @desc Decline a match proposal by NGO
 *       Triggers re-matching.
 * @route PATCH /api/matches/:matchId/decline
 */
const declineMatch = async (req, res) => {
  try {
    const { matchId } = req.params;

    if (!isValidObjectId(matchId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid match ID.',
      });
    }

    if (!isNgo(req) && !isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message:
          'Only the assigned NGO or an administrator can decline this match.',
      });
    }

    const match = await Match.findById(matchId)
      .populate('donationId');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match proposal not found.',
      });
    }

    const requesterId = String(
      getUserId(req) || ''
    );

    const matchNgoId = String(
      match.ngoId || ''
    );

    if (
      !isAdmin(req) &&
      requesterId !== matchNgoId
    ) {
      return res.status(403).json({
        success: false,
        message:
          'You are not authorized to decline this proposal.',
      });
    }

    if (match.status !== 'PROPOSED') {
      return res.status(409).json({
        success: false,
        message:
          'This match proposal is no longer available.',
      });
    }

    const donationId =
      match.donationId?._id || match.donationId;

    /*
     * Mark the proposal declined first.
     */
    match.status = 'DECLINED';
    match.respondedAt = new Date();

    await match.save();

    if (!donationId) {
      return res.status(200).json({
        success: true,
        message:
          'Match proposal declined.',
      });
    }

    const donation = await Donation.findById(
      donationId
    );

    if (!donation) {
      return res.status(200).json({
        success: true,
        message:
          'Match proposal declined. The associated donation no longer exists.',
      });
    }

    /*
     * A donation may have become matched between the
     * proposal fetch and the decline request.
     *
     * In that case we must NOT start re-matching.
     */
    if (donation.status !== 'PENDING_MATCH') {
      try {
        await emitMatchDeclined(
          match,
          donation
        );
      } catch (socketError) {
        console.error(
          'Match declined socket notification error:',
          socketError
        );
      }

      return res.status(200).json({
        success: true,
        message:
          'Match proposal declined. The donation is no longer awaiting a match.',
      });
    }

    /*
     * Notify the relevant clients.
     */
    try {
      await emitMatchDeclined(
        match,
        donation
      );
    } catch (socketError) {
      console.error(
        'Match declined socket notification error:',
        socketError
      );
    }

    /*
     * ---------------------------------------------------------
     * RE-MATCHING
     * ---------------------------------------------------------
     *
     * Exclude every NGO that has already received a match
     * proposal for this donation.
     */
    const previousMatches = await Match.find({
      donationId: donation._id,
    }).select('ngoId');

    const excludeNgoIds = previousMatches
      .map((item) => item.ngoId)
      .filter(Boolean);

    let newMatches = [];

    try {
      newMatches = await runMatchingEngine(
        donation,
        excludeNgoIds
      );

      if (!Array.isArray(newMatches)) {
        newMatches = [];
      }
    } catch (matchingError) {
      console.error(
        `[Re-matching] Matching engine failed for donation ${donation._id}:`,
        matchingError
      );

      newMatches = [];
    }

    /*
     * Notify newly matched NGOs.
     */
    for (const newMatch of newMatches) {
      if (!newMatch?.ngoId) continue;

      try {
        await emitMatchProposed(
          newMatch,
          donation,
          newMatch.ngoId
        );
      } catch (socketError) {
        console.error(
          'New match proposal socket error:',
          socketError
        );
      }
    }

    return res.status(200).json({
      success: true,
      message:
        newMatches.length > 0
          ? 'Match proposal declined. Re-matching initiated for the surplus donation.'
          : 'Match proposal declined. No additional eligible shelters were found.',
      rematchedCount: newMatches.length,
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      'Decline match error'
    );
  }
};

module.exports = {
  getNgoProposals,
  getNgoCapacity,
  acceptMatch,
  declineMatch,
};
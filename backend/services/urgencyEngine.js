/**
 * Urgency Engine for Surplus-to-Shelter
 * 
 * Levels:
 * - LOW: more than 4 hours
 * - MEDIUM: 2 to 4 hours
 * - HIGH: 1 to 2 hours
 * - CRITICAL: less than 1 hour
 * - EXPIRED: expiryTime has passed
 */

const URGENCY_LEVELS = {
  EXPIRED: 'EXPIRED',
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
};

const URGENCY_SCORES = {
  CRITICAL: 100,
  HIGH: 80,
  MEDIUM: 50,
  LOW: 25,
  EXPIRED: 0,
};

/**
 * Formats remaining minutes as "Xh Ym".
 *
 * @param {number} minutes
 * @returns {string}
 */
const formatRemainingTime = (minutes) => {
  const safeMinutes = Math.max(
    0,
    Math.floor(minutes)
  );

  const hours = Math.floor(
    safeMinutes / 60
  );

  const remainingMinutes =
    safeMinutes % 60;

  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Calculates urgency from an expiry Date,
 * ISO string, or timestamp.
 *
 * Thresholds:
 * - EXPIRED: <= 0 minutes
 * - CRITICAL: < 60 minutes
 * - HIGH: 60 to < 120 minutes
 * - MEDIUM: 120 to <= 240 minutes
 * - LOW: > 240 minutes
 *
 * @param {Date|string|number} expiryTime
 * @returns {Object}
 */
const calculateUrgency = (
  expiryTime
) => {
  if (
    expiryTime === undefined ||
    expiryTime === null ||
    expiryTime === ''
  ) {
    throw new Error(
      'A valid expiry time is required to calculate urgency.'
    );
  }

  const targetDate =
    expiryTime instanceof Date
      ? new Date(expiryTime.getTime())
      : new Date(expiryTime);

  const targetTimestamp =
    targetDate.getTime();

  if (
    !Number.isFinite(targetTimestamp)
  ) {
    throw new Error(
      'Invalid expiry time.'
    );
  }

  const nowTimestamp = Date.now();

  const diffMs =
    targetTimestamp - nowTimestamp;

  const remainingMinutes =
    Math.floor(
      diffMs / (60 * 1000)
    );

  /*
   * Expired.
   */
  if (diffMs <= 0) {
    return {
      level: URGENCY_LEVELS.EXPIRED,
      score: URGENCY_SCORES.EXPIRED,
      remainingMinutes: 0,
      remainingFormatted: 'Expired',
      isExpired: true,
    };
  }

  /*
   * Critical: less than 1 hour.
   */
  if (remainingMinutes < 60) {
    return {
      level: URGENCY_LEVELS.CRITICAL,
      score: URGENCY_SCORES.CRITICAL,
      remainingMinutes,
      remainingFormatted:
        formatRemainingTime(
          remainingMinutes
        ),
      isExpired: false,
    };
  }

  /*
   * High: 1 hour to less than 2 hours.
   */
  if (remainingMinutes < 120) {
    return {
      level: URGENCY_LEVELS.HIGH,
      score: URGENCY_SCORES.HIGH,
      remainingMinutes,
      remainingFormatted:
        formatRemainingTime(
          remainingMinutes
        ),
      isExpired: false,
    };
  }

  /*
   * Medium: 2 hours through 4 hours.
   */
  if (remainingMinutes <= 240) {
    return {
      level: URGENCY_LEVELS.MEDIUM,
      score: URGENCY_SCORES.MEDIUM,
      remainingMinutes,
      remainingFormatted:
        formatRemainingTime(
          remainingMinutes
        ),
      isExpired: false,
    };
  }

  /*
   * Low: more than 4 hours.
   */
  return {
    level: URGENCY_LEVELS.LOW,
    score: URGENCY_SCORES.LOW,
    remainingMinutes,
    remainingFormatted:
      formatRemainingTime(
        remainingMinutes
      ),
    isExpired: false,
  };
};

/**
 * Checks whether a donation is expired.
 *
 * Missing or invalid expiry is treated as invalid
 * data rather than automatically expired.
 *
 * @param {Object} donation
 * @returns {boolean}
 */
const isDonationExpired = (
  donation
) => {
  const expiryTime =
    donation?.perishability?.expiryTime;

  if (
    expiryTime === undefined ||
    expiryTime === null ||
    expiryTime === ''
  ) {
    return false;
  }

  const timestamp =
    new Date(expiryTime).getTime();

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return timestamp <= Date.now();
};

/**
 * Attaches calculated urgency metadata to a
 * donation object or Mongoose document.
 *
 * @param {Object} donation
 * @returns {Object}
 */
const enrichDonationWithUrgency = (
  donation
) => {
  if (!donation) {
    return null;
  }

  const plain =
    typeof donation.toObject === 'function'
      ? donation.toObject()
      : { ...donation };

  const expiryTime =
    plain.perishability?.expiryTime;

  /*
   * Donation schema requires expiryTime, so normally
   * this branch should never be reached. Keeping it here
   * prevents the helper from inventing urgency data if
   * called with an incomplete object.
   */
  if (
    expiryTime === undefined ||
    expiryTime === null ||
    expiryTime === ''
  ) {
    plain.urgency = null;
    plain.urgencyScore = null;
    plain.timeRemainingMinutes = null;
    plain.timeRemainingFormatted = null;
    plain.isExpired = false;

    return plain;
  }

  try {
    const urgency =
      calculateUrgency(expiryTime);

    plain.urgency =
      urgency.level;

    plain.urgencyScore =
      urgency.score;

    plain.timeRemainingMinutes =
      urgency.remainingMinutes;

    plain.timeRemainingFormatted =
      urgency.remainingFormatted;

    plain.isExpired =
      urgency.isExpired;

    return plain;
  } catch (error) {
    plain.urgency = null;
    plain.urgencyScore = null;
    plain.timeRemainingMinutes = null;
    plain.timeRemainingFormatted = null;
    plain.isExpired = false;

    return plain;
  }
};

module.exports = {
  URGENCY_LEVELS,
  URGENCY_SCORES,
  calculateUrgency,
  isDonationExpired,
  enrichDonationWithUrgency,
};
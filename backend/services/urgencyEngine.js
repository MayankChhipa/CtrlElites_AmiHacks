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
 * Calculates urgency data from an expiry Date or ISO string
 * @param {Date|string|number} expiryTime 
 * @returns {Object} { level, score, remainingMinutes, remainingFormatted, isExpired }
 */
const calculateUrgency = (expiryTime) => {
  if (!expiryTime) {
    return {
      level: URGENCY_LEVELS.LOW,
      score: URGENCY_SCORES.LOW,
      remainingMinutes: 240,
      remainingFormatted: '4h 0m',
      isExpired: false,
    };
  }

  const targetDate = new Date(expiryTime);
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  const remainingMinutes = Math.floor(diffMs / (60 * 1000));

  if (diffMs <= 0 || remainingMinutes <= 0) {
    return {
      level: URGENCY_LEVELS.EXPIRED,
      score: URGENCY_SCORES.EXPIRED,
      remainingMinutes: 0,
      remainingFormatted: 'Expired',
      isExpired: true,
    };
  }

  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  const remainingFormatted = `${hours}h ${minutes}m`;

  // - CRITICAL: less than 1 hour
  if (remainingMinutes < 60) {
    return {
      level: URGENCY_LEVELS.CRITICAL,
      score: URGENCY_SCORES.CRITICAL,
      remainingMinutes,
      remainingFormatted,
      isExpired: false,
    };
  }

  // - HIGH: 1 to 2 hours
  if (remainingMinutes < 120) {
    return {
      level: URGENCY_LEVELS.HIGH,
      score: URGENCY_SCORES.HIGH,
      remainingMinutes,
      remainingFormatted,
      isExpired: false,
    };
  }

  // - MEDIUM: 2 to 4 hours
  if (remainingMinutes <= 240) {
    return {
      level: URGENCY_LEVELS.MEDIUM,
      score: URGENCY_SCORES.MEDIUM,
      remainingMinutes,
      remainingFormatted,
      isExpired: false,
    };
  }

  // - LOW: more than 4 hours
  return {
    level: URGENCY_LEVELS.LOW,
    score: URGENCY_SCORES.LOW,
    remainingMinutes,
    remainingFormatted,
    isExpired: false,
  };
};

/**
 * Checks if a donation is expired
 * @param {Object} donation 
 * @returns {boolean}
 */
const isDonationExpired = (donation) => {
  const expiryTime = donation?.perishability?.expiryTime;
  if (!expiryTime) return false;
  return new Date(expiryTime).getTime() <= Date.now();
};

/**
 * Attaches urgency information to a donation object (plain JS object or doc)
 * @param {Object} donation 
 * @returns {Object} donation with urgency metadata attached
 */
const enrichDonationWithUrgency = (donation) => {
  const plain = donation.toObject ? donation.toObject() : { ...donation };
  const urgency = calculateUrgency(plain.perishability?.expiryTime);
  plain.urgency = urgency.level;
  plain.urgencyScore = urgency.score;
  plain.timeRemainingMinutes = urgency.remainingMinutes;
  plain.timeRemainingFormatted = urgency.remainingFormatted;
  plain.isExpired = urgency.isExpired;
  return plain;
};

module.exports = {
  URGENCY_LEVELS,
  URGENCY_SCORES,
  calculateUrgency,
  isDonationExpired,
  enrichDonationWithUrgency,
};

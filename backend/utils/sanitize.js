/**
 * Sanitizes donation object to prevent unauthorized exposure of OTPs
 * - Donor can see pickupOtp
 * - Matched NGO can see deliveryOtp
 * - Admin can see both
 * - Driver or unauthorized users can NEVER see either OTP
 */
const normalizeId = (value) => {
  if (!value) {
    return '';
  }

  if (
    typeof value === 'object' &&
    value._id
  ) {
    return value._id.toString();
  }

  return value.toString();
};

const normalizeRole = (role) =>
  typeof role === 'string'
    ? role.trim().toUpperCase()
    : '';

/**
 * Sanitizes a donation before returning it to a client.
 *
 * OTP visibility:
 * - pickupOtp  → donor/admin
 * - deliveryOtp → matched NGO / assigned driver / admin
 * - everyone else → hidden
 *
 * @param {Object} donation
 * @param {Object} user
 * @returns {Object|null}
 */
const sanitizeDonation = (
  donation,
  user
) => {
  if (!donation) {
    return null;
  }

  const doc =
    typeof donation.toObject === 'function'
      ? donation.toObject()
      : { ...donation };

  /*
   * Never expose OTPs without an authenticated user.
   */
  if (!user) {
    delete doc.pickupOtp;
    delete doc.deliveryOtp;

    return doc;
  }

  const userId = normalizeId(
    user._id || user.id
  );

  const donorId = normalizeId(
    doc.donorId
  );

  const matchedNgoId = normalizeId(
    doc.matchedNgoId
  );

  const assignedDriverId =
    normalizeId(
      doc.assignedDriverId
    );

  const role = normalizeRole(
    user.role
  );

  const isAdmin =
    role === 'ADMIN';

  const isDonor =
    userId &&
    userId === donorId;

  const isMatchedNgo =
    userId &&
    userId === matchedNgoId;

  const isAssignedDriver =
    userId &&
    userId === assignedDriverId;

  /*
   * Pickup OTP:
   * The donor and admin may access it.
   */
  if (
    !isAdmin &&
    !isDonor
  ) {
    delete doc.pickupOtp;
  }

  /*
   * Delivery OTP:
   * The matched NGO, assigned driver, and admin
   * may access it.
   */
  if (
    !isAdmin &&
    !isMatchedNgo &&
    !isAssignedDriver
  ) {
    delete doc.deliveryOtp;
  }

  return doc;
};

/**
 * Sanitizes a list of donations.
 *
 * @param {Array<Object>} donations
 * @param {Object} user
 * @returns {Array<Object>}
 */
const sanitizeDonationsList = (
  donations,
  user
) => {
  if (!Array.isArray(donations)) {
    return [];
  }

  return donations.map(
    (donation) =>
      sanitizeDonation(
        donation,
        user
      )
  );
};

module.exports = {
  sanitizeDonation,
  sanitizeDonationsList,
};
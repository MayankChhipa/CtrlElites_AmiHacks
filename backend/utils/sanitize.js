/**
 * Sanitizes donation object to prevent unauthorized exposure of OTPs
 * - Donor can see pickupOtp
 * - Matched NGO can see deliveryOtp
 * - Admin can see both
 * - Driver or unauthorized users can NEVER see either OTP
 */
const sanitizeDonation = (donation, user) => {
  if (!donation) return null;
  const doc = donation.toObject ? donation.toObject() : { ...donation };

  if (!user) {
    delete doc.pickupOtp;
    delete doc.deliveryOtp;
    return doc;
  }

  const userIdStr = (user._id || user.id || '').toString();
  const donorIdStr = (doc.donorId?._id || doc.donorId || '').toString();
  const ngoIdStr = (doc.matchedNgoId?._id || doc.matchedNgoId || '').toString();
  const isAdmin = user.role === 'ADMIN';

  if (!isAdmin && userIdStr !== donorIdStr) {
    delete doc.pickupOtp;
  }

  if (!isAdmin && userIdStr !== ngoIdStr) {
    delete doc.deliveryOtp;
  }

  return doc;
};

const sanitizeDonationsList = (donations, user) => {
  if (!Array.isArray(donations)) return [];
  return donations.map((d) => sanitizeDonation(d, user));
};

module.exports = {
  sanitizeDonation,
  sanitizeDonationsList,
};

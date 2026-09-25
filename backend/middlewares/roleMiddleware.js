const normalizeRole = (role) =>
  typeof role === 'string'
    ? role.trim().toUpperCase()
    : '';

/**
 * Restrict a route to specific user roles.
 *
 * Usage:
 * authorize('ADMIN')
 * authorize('NGO', 'ADMIN')
 * authorize('DONOR', 'NGO', 'DRIVER')
 */
const authorize = (...roles) => {
  const allowedRoles = roles
    .filter(
      (role) =>
        typeof role === 'string' &&
        role.trim()
    )
    .map(normalizeRole);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated.',
      });
    }

    if (allowedRoles.length === 0) {
      console.error(
        'Authorization middleware configured without allowed roles.'
      );

      return res.status(500).json({
        success: false,
        message:
          'Authorization configuration error.',
      });
    }

    const userRole = normalizeRole(req.user.role);

    if (!userRole) {
      return res.status(403).json({
        success: false,
        message:
          'Your account does not have a valid role.',
      });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message:
          'You are not authorized to access this resource.',
      });
    }

    return next();
  };
};

/**
 * Require an authenticated and verified account.
 *
 * Admins are exempt. Donors, NGOs, and drivers must be approved.
 *
 * Other user accounts must have isVerified === true.
 */
const requireVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated.',
    });
  }

  const role = normalizeRole(req.user.role);

  /*
   * These roles do not require the NGO/driver verification
   * gate according to the current application policy.
   */
  if (role === 'ADMIN') {
    return next();
  }

  /*
   * NGO and DRIVER accounts must actually be verified.
   *
   * Do not silently bypass this in development. A development
   * environment should not change authorization behavior.
   */
  if (['DONOR', 'NGO', 'DRIVER'].includes(role) && req.user.isVerified !== true) {
    return res.status(403).json({
      success: false,
      message:
        'Account pending admin verification. You cannot use this feature yet.',
    });
  }

  /*
   * Unknown/unsupported roles should not automatically pass.
   */
  if (!['DONOR', 'NGO', 'DRIVER'].includes(role)) {
    return res.status(403).json({
      success: false,
      message:
        'Your account is not authorized for this resource.',
    });
  }

  return next();
};

module.exports = {
  authorize,
  requireVerified,
};

const User = require('../models/User');
const { verifyToken } = require('../config/jwt');

/**
 * Protect routes that require authentication.
 *
 * Reads a Bearer JWT, verifies it using the centralized
 * JWT configuration, then loads the current user from DB.
 */
const protect = async (req, res, next) => {
  try {
    const authorization =
      req.headers.authorization;

    if (
      !authorization ||
      typeof authorization !== 'string'
    ) {
      return res.status(401).json({
        success: false,
        message:
          'Access denied. No authorization token provided.',
      });
    }

    const [scheme, token] =
      authorization.trim().split(/\s+/);

    if (
      scheme?.toLowerCase() !== 'bearer' ||
      !token
    ) {
      return res.status(401).json({
        success: false,
        message:
          'Access denied. Use a valid Bearer token.',
      });
    }

    /*
     * verifyToken() uses the same JWT_SECRET and
     * configuration as the rest of the application.
     */
    const decoded = verifyToken(token);

    if (!decoded?.id) {
      return res.status(401).json({
        success: false,
        message:
          'Invalid authentication token.',
      });
    }

    const user = await User.findById(decoded.id)
      .select('-passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          'The user belonging to this token no longer exists.',
      });
    }

    /*
     * Attach the current DB user rather than trusting
     * role/email/etc. entirely from the JWT payload.
     *
     * This also means changes to the user's role,
     * verification state, profile, etc. are reflected
     * immediately.
     */
    req.user = user;

    return next();
  } catch (error) {
    /*
     * Authentication failures should not expose JWT,
     * database, or internal error details.
     */
    console.warn(
      `Authentication failed: ${error.message}`
    );

    return res.status(401).json({
      success: false,
      message:
        'Invalid or expired authentication token.',
    });
  }
};

module.exports = {
  protect,
};
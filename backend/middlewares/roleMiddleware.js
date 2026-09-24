const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user.role}' is not authorized to access this resource.`,
      });
    }

    next();
  };
};

const requireVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }

  // Admins and Donors are inherently verified
  if (['ADMIN', 'DONOR'].includes(req.user.role)) {
    return next();
  }

  // NGOs and Drivers must be verified (in development we allow bypass if env allows)
  if (!req.user.isVerified && process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      message: 'Account pending admin verification. You cannot claim or accept food yet.',
    });
  }

  next();
};

module.exports = { authorize, requireVerified };

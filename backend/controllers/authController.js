const User = require('../models/User');
const bcrypt = require('bcrypt');
const { signToken } = require('../config/jwt');

const ALLOWED_ROLES = ['DONOR', 'NGO', 'DRIVER'];

const normalizeEmail = (email) => email.trim().toLowerCase();

const isValidCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return false;
  }

  const [longitude, latitude] = coordinates;

  return (
    typeof longitude === 'number' &&
    typeof latitude === 'number' &&
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
};

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  location: user.location,
  address: user.address,
  isVerified: user.isVerified,
});

// @desc Register user
// @route POST /api/auth/register
const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      address,
      coordinates,
      roleDetails,
    } = req.body;

    if (!name || !email || !password || !role || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields.',
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedRole = String(role).trim().toUpperCase();

    if (!ALLOWED_ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration role.',
      });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    const normalizedName = String(name).trim();

    if (normalizedName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters long.',
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    /*
     * Do not silently assign a real-world location when the user
     * does not provide one.
     *
     * If your User schema requires location.coordinates, we can
     * adjust this after seeing models/User.js.
     */
    const userData = {
      name: normalizedName,
      email: normalizedEmail,
      passwordHash,
      role: normalizedRole,
      phone: String(phone).trim(),

      // NGO/DRIVER verification is handled by the admin flow.
      // Donors can be immediately active.
      isVerified: normalizedRole === 'DONOR',
    };

    if (isValidCoordinates(coordinates)) {
      userData.location = {
        type: 'Point',
        coordinates,
      };
    }

    if (address) {
      userData.address = {
        formattedAddress: String(address).trim(),
      };
    }

    if (roleDetails && typeof roleDetails === 'object') {
      if (normalizedRole === 'DONOR') {
        userData.donorProfile = roleDetails;
      }

      if (normalizedRole === 'NGO') {
        userData.ngoProfile = roleDetails;
      }

      if (normalizedRole === 'DRIVER') {
        userData.driverProfile = {
          ...roleDetails,
        };

        if (isValidCoordinates(coordinates)) {
          userData.driverProfile.currentLocation = {
            type: 'Point',
            coordinates,
          };
        }
      }
    }

    const user = await User.create(userData);
    const token = signToken(user);

    return res.status(201).json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Registration error:', error);

    // MongoDB duplicate-key protection in case two registrations
    // with the same email happen simultaneously.
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Registration failed.',
    });
  }
};

// @desc Login user
// @route POST /api/auth/login
const login = async (req, res) => {
  try {
    const email =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';

    const password =
      typeof req.body?.password === 'string'
        ? req.body.password
        : '';

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const user = await User.findOne({ email }).select(
      '+passwordHash'
    );

    console.log('LOGIN EMAIL:', email);
console.log('USER FOUND:', Boolean(user));
console.log(
  'PASSWORD HASH FOUND:',
  Boolean(user?.passwordHash)
);


    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isPasswordValid =
      await user.comparePassword(password);

    console.log(
  'PASSWORD VALID:',
  isPasswordValid
);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = signToken(user);

    const safeUser = sanitizeUser(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred.',
    });
  }
};

// @desc Get current authenticated user
// @route GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const user = await User.findById(userId)
      .select('-passwordHash')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get current user error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch current user.',
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
};
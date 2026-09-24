const User = require('../models/User');
const bcrypt = require('bcrypt');
const { signToken } = require('../config/jwt');

// @desc Register user
// @route POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, address, coordinates, roleDetails } = req.body;

    if (!name || !email || !password || !role || !phone) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const coords = coordinates && coordinates.length === 2 ? coordinates : [77.209, 28.6139]; // Default coordinates

    const userData = {
      name,
      email,
      passwordHash,
      role,
      phone,
      isVerified: true, // Auto-verified for hackathon flow
      location: {
        type: 'Point',
        coordinates: coords,
      },
      address: {
        formattedAddress: address || 'Downtown City Center',
      },
    };

    if (role === 'DONOR' && roleDetails) {
      userData.donorProfile = roleDetails;
    } else if (role === 'NGO' && roleDetails) {
      userData.ngoProfile = roleDetails;
    } else if (role === 'DRIVER' && roleDetails) {
      userData.driverProfile = {
        ...roleDetails,
        currentLocation: {
          type: 'Point',
          coordinates: coords,
        },
      };
    }

    const user = await User.create(userData);
    const token = signToken(user);

    return res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
        address: user.address,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Login user
// @route POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
        address: user.address,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get current authenticated user
// @route GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { register, login, getMe };

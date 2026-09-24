const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// JWT secret must be explicitly configured
if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET is not configured. Please add JWT_SECRET to your environment variables.'
  );
}

const signToken = (user) => {
  if (!user) {
    throw new Error('User is required to generate a JWT.');
  }

  const userId = user._id || user.id;

  if (!userId) {
    throw new Error('User ID is required to generate a JWT.');
  }

  return jwt.sign(
    {
      id: userId.toString(),
      role: user.role,
      email: user.email,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
};

const verifyToken = (token) => {
  if (!token) {
    throw new Error('JWT token is required.');
  }

  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  signToken,
  verifyToken,
};

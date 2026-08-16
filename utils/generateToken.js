/**
 * JWT Token Generation Utility
 * Generates and verifies JWT tokens for authentication
 */

const jwt = require('jsonwebtoken');

/**
 * Generate access token
 * @param {Object} payload - User data to encode in token
 * @param {string} expiresIn - Token expiration time (default: '15m' for security)
 * @returns {string} JWT token
 */
const generateAccessToken = (payload, expiresIn = '15m') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * Generate refresh token
 * @param {Object} payload - User data to encode in token
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
};

/**
 * Verify token
 * @param {string} token - JWT token to verify
 * @param {string} secret - Secret key for verification (default: JWT_SECRET)
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token, secret = process.env.JWT_SECRET) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
};

/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user to request object
 */

const { verifyToken } = require('../utils/generateToken');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

/**
 * Protect routes - verify JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.unauthorized(res, 'No token provided. Please log in.');
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return ApiResponse.unauthorized(res, 'User no longer exists');
    }

    if (!user.isActive || user.isDeleted) {
      return ApiResponse.unauthorized(res, 'User account is inactive or deleted');
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id.toString(); // normalize to string — controllers compare this against .toString() values
    req.userRole = user.role;

    next();
  } catch (error) {
    console.error('Authentication error:', error.message);

    if (error.name === 'JsonWebTokenError') {
      return ApiResponse.unauthorized(res, 'Invalid or expired token');
    }
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.unauthorized(res, 'Invalid or expired token');
    }
    return ApiResponse.unauthorized(res, 'Invalid or expired token');
  }
};

/**
 * Optional_AUTH - Attach user if token exists, but don't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-password');

    if (user && user.isActive && !user.isDeleted) {
      req.user = user;
      req.userId = user._id.toString(); // same normalization here
      req.userRole = user.role;
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error.message);
    next();
  }
};

module.exports = { authenticate, optionalAuth };
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
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.unauthorized(res, 'No token provided. Please log in.');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    // Check if user still exists
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return ApiResponse.unauthorized(res, 'User no longer exists');
    }

    // Check if user is active
    if (!user.isActive || user.isDeleted) {
      return ApiResponse.unauthorized(res, 'User account is inactive or deleted');
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;
    req.userRole = user.role;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return ApiResponse.unauthorized(res, 'Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.unauthorized(res, 'Token expired. Please log in again');
    }
    return ApiResponse.unauthorized(res, 'Authentication failed');
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
      req.userId = user._id;
      req.userRole = user.role;
    }

    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

module.exports = { authenticate, optionalAuth };

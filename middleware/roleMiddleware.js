/**
 * Role-Based Access Control Middleware
 * Restricts access based on user roles (jobseeker, employer, admin)
 */

const ApiResponse = require('../utils/apiResponse');

/**
 * Allow only job seekers
 */
const isJobSeeker = (req, res, next) => {
  if (req.userRole !== 'jobseeker') {
    return ApiResponse.forbidden(res, 'Access denied. Job seekers only.');
  }
  next();
};

/**
 * Allow only employers
 */
const isEmployer = (req, res, next) => {
  if (req.userRole !== 'employer') {
    return ApiResponse.forbidden(res, 'Access denied. Employers only.');
  }
  next();
};

/**
 * Allow only admins
 */
const isAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return ApiResponse.forbidden(res, 'Access denied. Admins only.');
  }
  next();
};

/**
 * Allow job seekers or employers
 */
const isJobSeekerOrEmployer = (req, res, next) => {
  if (req.userRole !== 'jobseeker' && req.userRole !== 'employer') {
    return ApiResponse.forbidden(res, 'Access denied.');
  }
  next();
};

/**
 * Allow employers or admins
 */
const isEmployerOrAdmin = (req, res, next) => {
  if (req.userRole !== 'employer' && req.userRole !== 'admin') {
    return ApiResponse.forbidden(res, 'Access denied.');
  }
  next();
};

/**
 * Allow job seekers or admins
 */
const isJobSeekerOrAdmin = (req, res, next) => {
  if (req.userRole !== 'jobseeker' && req.userRole !== 'admin') {
    return ApiResponse.forbidden(res, 'Access denied.');
  }
  next();
};

/**
 * Allow specific roles
 * @param {...string} allowedRoles - Roles that are allowed
 */
const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.userRole)) {
      return ApiResponse.forbidden(res, 'Access denied. Insufficient permissions.');
    }
    next();
  };
};

/**
 * Check if user owns the resource or is admin
 * @param {Function} getResourceOwnerId - Function to extract owner ID from request
 */
const isOwnerOrAdmin = (getResourceOwnerId) => {
  return (req, res, next) => {
    const resourceOwnerId = getResourceOwnerId(req);
    
    if (req.userRole === 'admin' || req.userId.toString() === resourceOwnerId.toString()) {
      return next();
    }
    
    return ApiResponse.forbidden(res, 'Access denied. You can only access your own resources.');
  };
};

module.exports = {
  isJobSeeker,
  isEmployer,
  isAdmin,
  isJobSeekerOrEmployer,
  isEmployerOrAdmin,
  isJobSeekerOrAdmin,
  allowRoles,
  isOwnerOrAdmin,
};

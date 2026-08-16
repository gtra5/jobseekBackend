/**
 * Global Error Handler Middleware
 * Catches and formats errors consistently across the application
 */

const ApiResponse = require('../utils/apiResponse');

/**
 * Handle Mongoose validation errors
 */
const handleValidationError = (error) => {
  const errors = {};
  
  if (error.errors) {
    Object.keys(error.errors).forEach((key) => {
      errors[key] = error.errors[key].message;
    });
  }
  
  return {
    statusCode: 422,
    message: 'Validation failed',
    errors,
  };
};

/**
 * Handle Mongoose duplicate key errors
 */
const handleDuplicateKeyError = (error) => {
  const field = Object.keys(error.keyPattern)[0];
  const value = error.keyValue[field];
  
  return {
    statusCode: 409,
    message: `${field} '${value}' already exists`,
    errors: { [field]: `${field} already exists` },
  };
};

/**
 * Handle Mongoose cast errors (invalid ObjectId)
 */
const handleCastError = (error) => {
  return {
    statusCode: 400,
    message: 'Invalid ID format',
    errors: { [error.path]: 'Invalid ID format' },
  };
};

/**
 * Handle JWT errors
 */
const handleJWTError = () => {
  return {
    statusCode: 401,
    message: 'Invalid token. Please log in again.',
  };
};

/**
 * Handle JWT expired error
 */
const handleJWTExpiredError = () => {
  return {
    statusCode: 401,
    message: 'Token expired. Please log in again.',
  };
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log full error details server-side for debugging
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const validationError = handleValidationError(err);
    error = { ...error, ...validationError };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const duplicateError = handleDuplicateKeyError(err);
    error = { ...error, ...duplicateError };
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    const castError = handleCastError(err);
    error = { ...error, ...castError };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const jwtError = handleJWTError();
    error = { ...error, ...jwtError };
  }

  if (err.name === 'TokenExpiredError') {
    const jwtExpiredError = handleJWTExpiredError();
    error = { ...error, ...jwtExpiredError };
  }

  // In production, hide detailed error messages
  if (process.env.NODE_ENV === 'production') {
    error.message = 'An error occurred. Please try again later.';
  }

  // Send error response (no stack traces in client response)
  if (error.errors) {
    return ApiResponse.validationError(res, error.message, error.errors);
  }
  
  return ApiResponse.error(res, error.statusCode, error.message);
};

/**
 * 404 Not Found handler
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = { errorHandler, notFound };

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors and pass them to Express error middleware
 * Eliminates need for try-catch blocks in every controller function
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;

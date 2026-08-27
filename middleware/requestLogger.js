/**
 * Request Logger Middleware
 * Logs incoming requests, status codes, and execution duration using Winston
 */

const logger = require('../utils/logger');

/**
 * Request logger middleware
 * Logs request details and response status with execution duration
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request details
  logger.info({
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
  }, 'Incoming request');

  // Capture original res.json to log response
  const originalJson = res.json;
  res.json = function (data) {
    const duration = Date.now() - startTime;
    
    logger.info({
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
    }, 'Request completed');

    return originalJson.call(this, data);
  };

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    if (res.statusCode >= 400) {
      logger.error({
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip || req.connection.remoteAddress,
      }, 'Request failed');
    } else if (!res.headersSent) {
      logger.info({
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip || req.connection.remoteAddress,
      }, 'Request completed');
    }
  });

  next();
};

module.exports = requestLogger;

/**
 * Security Logger
 * Logs authentication events, admin actions, and security-relevant events
 * Never logs sensitive data like passwords, tokens, or full PII
 */

const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, 'security.log');

/**
 * Sanitize data to remove sensitive information before logging
 * @param {Object} data - Data to sanitize
 * @returns {Object} Sanitized data
 */
const sanitizeForLog = (data) => {
  const sensitiveKeys = ['password', 'token', 'accessToken', 'refreshToken', 'otp', 'secret', 'apiKey', 'apiSecret'];
  const sanitized = { ...data };
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

/**
 * Write log entry to file
 * @param {string} level - Log level (INFO, WARN, ERROR)
 * @param {string} event - Event type
 * @param {Object} details - Event details
 */
const writeLog = (level, event, details = {}) => {
  const timestamp = new Date().toISOString();
  const sanitizedDetails = sanitizeForLog(details);
  const logEntry = {
    timestamp,
    level,
    event,
    ...sanitizedDetails,
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';
  fs.appendFileSync(logFile, logLine, 'utf8');
  
  // Also log to console for development
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${level}] ${event}:`, sanitizedDetails);
  }
};

/**
 * Log authentication events
 */
const logAuthEvent = {
  loginSuccess: (userId, email, ip, userAgent) => {
    writeLog('INFO', 'AUTH_LOGIN_SUCCESS', { userId, email, ip, userAgent });
  },
  
  loginFailure: (email, ip, userAgent, reason) => {
    writeLog('WARN', 'AUTH_LOGIN_FAILURE', { email, ip, userAgent, reason });
  },
  
  logout: (userId, ip, userAgent) => {
    writeLog('INFO', 'AUTH_LOGOUT', { userId, ip, userAgent });
  },
  
  passwordResetRequested: (email, ip) => {
    writeLog('INFO', 'AUTH_PASSWORD_RESET_REQUESTED', { email, ip });
  },
  
  passwordResetSuccess: (userId, email, ip) => {
    writeLog('INFO', 'AUTH_PASSWORD_RESET_SUCCESS', { userId, email, ip });
  },
  
  otpRequested: (email, purpose, ip) => {
    writeLog('INFO', 'AUTH_OTP_REQUESTED', { email, purpose, ip });
  },
  
  otpVerified: (email, purpose, ip) => {
    writeLog('INFO', 'AUTH_OTP_VERIFIED', { email, purpose, ip });
  },
  
  otpFailed: (email, purpose, ip, reason) => {
    writeLog('WARN', 'AUTH_OTP_FAILED', { email, purpose, ip, reason });
  },
  
  tokenRefresh: (userId, ip) => {
    writeLog('INFO', 'AUTH_TOKEN_REFRESH', { userId, ip });
  },
  
  suspiciousActivity: (type, details) => {
    writeLog('ERROR', 'SECURITY_SUSPICIOUS_ACTIVITY', { type, ...details });
  },
};

/**
 * Log admin actions for accountability
 */
const logAdminAction = {
  userModified: (adminId, targetUserId, action, ip) => {
    writeLog('INFO', 'ADMIN_USER_MODIFIED', { adminId, targetUserId, action, ip });
  },
  
  jobDeleted: (adminId, jobId, ip) => {
    writeLog('INFO', 'ADMIN_JOB_DELETED', { adminId, jobId, ip });
  },
  
  settingsChanged: (adminId, setting, ip) => {
    writeLog('INFO', 'ADMIN_SETTINGS_CHANGED', { adminId, setting, ip });
  },
  
  dataExported: (adminId, dataType, ip) => {
    writeLog('INFO', 'ADMIN_DATA_EXPORTED', { adminId, dataType, ip });
  },
};

module.exports = {
  logAuthEvent,
  logAdminAction,
  writeLog,
};

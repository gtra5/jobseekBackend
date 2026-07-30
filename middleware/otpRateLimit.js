const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

/**
 * Key by email when present in the body.
 * Falls back to an IPv6-safe IP key using express-rate-limit's helper.
 */
const emailOrIpKey = (req) => {
  const email = req.body?.email;
  if (email) return String(email).toLowerCase().trim();
  return ipKeyGenerator(req.ip || '127.0.0.1');
};

/**
 * Rate limiter for OTP send / resend
 * 3 attempts per 15 minutes per email address
 */
const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: emailOrIpKey,
  skipSuccessfulRequests: false,
});

/**
 * Rate limiter for OTP verification
 * 5 attempts per 15 minutes per email address
 */
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many verification attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: emailOrIpKey,
});

module.exports = { otpRateLimiter, otpVerifyLimiter };

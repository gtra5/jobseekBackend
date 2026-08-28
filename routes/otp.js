const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const otpService = require('../services/otpService');
const { otpRateLimiter, otpVerifyLimiter } = require('../middleware/otpRateLimit');

// Shared email validator
const emailValidator = body('email')
  .trim()
  .notEmpty().withMessage('Email is required')
  .isEmail().withMessage('Please provide a valid email address')
  .normalizeEmail();

// Shared purpose validator
const purposeValidator = body('purpose')
  .trim()
  .notEmpty().withMessage('Purpose is required')
  .isIn(['registration', 'login', 'password_reset', 'email_verification'])
  .withMessage('Invalid purpose');

/**
 * @route   POST /api/otp/send
 * @desc    Send OTP to email
 * @access  Public
 */
router.post('/send', otpRateLimiter, [emailValidator, purposeValidator], async (req, res) => {
  try {
    console.log('POST /api/otp/send called with body:', { email: req.body.email, purpose: req.body.purpose });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, purpose } = req.body;

    console.log('Creating OTP for email:', email, 'purpose:', purpose);
    const otp = await otpService.createOTP(email, purpose);
    console.log('OTP created:', otp);

    console.log('Sending OTP to email:', email);
    await otpService.sendOTP(email, otp, purpose);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully. Please check your email.',
      data: {
        email: email.replace(/(.{2}).+(@.+)/, '$1****$2'), // mask: jo****@gmail.com
        purpose,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send OTP. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * @route   POST /api/otp/verify
 * @desc    Verify OTP
 * @access  Public
 */
router.post('/verify', otpVerifyLimiter, [
  emailValidator,
  purposeValidator,
  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, otp, purpose } = req.body;

    await otpService.verifyOTP(email, otp, purpose);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        email: email.replace(/(.{2}).+(@.+)/, '$1****$2'),
        purpose,
        verified: true,
      },
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'OTP verification failed',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * @route   POST /api/otp/resend
 * @desc    Resend OTP to email
 * @access  Public
 */
router.post('/resend', otpRateLimiter, [emailValidator, purposeValidator], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, purpose } = req.body;

    const otp = await otpService.createOTP(email, purpose);
    await otpService.sendOTP(email, otp, purpose);

    res.status(200).json({
      success: true,
      message: 'OTP resent successfully. Please check your email.',
      data: {
        email: email.replace(/(.{2}).+(@.+)/, '$1****$2'),
        purpose,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('Error resending OTP:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to resend OTP. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

module.exports = router;

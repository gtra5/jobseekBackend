/**
 * Authentication Routes
 * Routes for user registration, login, password reset, and email verification
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { authValidators } = require('../middleware/validateRequest');

/**
 * @route   POST /api/auth/pre-register
 * @desc    Step 1: Validate signup inputs, send OTP — no User created yet
 * @access  Public
 */
router.post('/pre-register', authValidators.preRegister, authController.preRegister);

/**
 * @route   POST /api/auth/register
 * @desc    Step 2: Verify OTP, then create User in DB and issue tokens
 * @access  Public
 */
router.post('/register', authValidators.register, authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authValidators.login, authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user — public so expired tokens never block teardown
 * @access  Public
 */
router.post('/logout', authController.logout);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token using httpOnly cookie
 * @access  Public
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset OTP
 * @access  Public
 */
router.post('/forgot-password', authValidators.forgotPassword, authController.forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using OTP
 * @access  Public
 */
router.post('/reset-password', authValidators.resetPassword, authController.resetPassword);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email using OTP (for already-registered users)
 * @access  Public
 */
router.post('/verify-email', authValidators.verifyOTP, authController.verifyEmail);

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP (registration or password reset)
 * @access  Public
 */
router.post('/resend-otp', authController.resendOTP);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, authController.getMe);

module.exports = router;

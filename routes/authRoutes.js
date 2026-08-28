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
 * @route   POST /api/auth/register
 * @desc    Register a new user
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
 * @desc    Logout user
 * @access  Public — intentionally no `authenticate` middleware so that a
 *          user with an expired/missing access token can still log out.
 *          The handler itself reads the refreshToken cookie and revokes it;
 *          it does not need a valid Bearer header to do that safely.
 */
router.post('/logout', authController.logout);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
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
 * @desc    Verify email using OTP
 * @access  Public
 */
router.post('/verify-email', authValidators.verifyOTP, authController.verifyEmail);

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP
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

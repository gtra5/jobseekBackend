/**
 * User Routes
 * Routes for user profile management
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');
const { isJobSeeker, isEmployer } = require('../middleware/roleMiddleware');
const { handleAvatarUpload } = require('../middleware/uploadMiddleware');

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Public
 */
router.get('/:id', userController.getUserById);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, userController.updateProfile);

/**
 * @route   PUT /api/users/jobseeker-profile
 * @desc    Update job seeker profile
 * @access  Private (Job Seeker only)
 */
router.put('/jobseeker-profile', authenticate, isJobSeeker, userController.updateJobSeekerProfile);

/**
 * @route   PUT /api/users/employer-profile
 * @desc    Update employer profile
 * @access  Private (Employer only)
 */
router.put('/employer-profile', authenticate, isEmployer, userController.updateEmployerProfile);

/**
 * @route   PUT /api/users/notification-settings
 * @desc    Update notification settings
 * @access  Private
 */
router.put('/notification-settings', authenticate, userController.updateNotificationSettings);

/**
 * @route   DELETE /api/users/avatar
 * @desc    Delete user avatar
 * @access  Private
 */
router.delete('/avatar', authenticate, userController.deleteAvatar);

/**
 * @route   DELETE /api/users/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/account', authenticate, userController.deleteAccount);

module.exports = router;

/**
 * User Routes
 * Routes for user profile management
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');
const { isJobSeeker, isEmployer, isAdmin } = require('../middleware/roleMiddleware');
const { handleAvatarUpload, handleResumeUpload, handleLogoUpload } = require('../middleware/uploadMiddleware');
const { validate, commonValidators } = require('../middleware/validateRequest');

/**
 * @route   GET /api/users/:id
 * @desc    Get job seeker profile by ID (employer only)
 * @access  Private (Employer only)
 */
router.get('/:id', authenticate, isEmployer, userController.getUserById);

/**
 * @route   GET /api/users/:id/public
 * @desc    Get a sanitised public profile safe to show any authenticated viewer
 * @access  Private (any authenticated user)
 */
router.get('/:id/public', userController.getPublicProfile);

/**
 * @route   PATCH /api/users/me/professions
 * @desc    Update current user's saved professions
 * @access  Private
 */
router.patch('/me/professions', authenticate, userController.updateProfessions);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, [commonValidators.phone(), validate], userController.updateProfile);

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
 * @route   PUT /api/users/avatar
 * @desc    Upload or replace user avatar
 * @access  Private
 */
router.put('/avatar', authenticate, handleAvatarUpload, userController.updateAvatar);

/**
 * @route   PUT /api/users/resume
 * @desc    Upload or replace job seeker resume
 * @access  Private (Job Seeker)
 */
router.put('/resume', authenticate, isJobSeeker, handleResumeUpload, userController.updateResume);

/**
 * @route   PUT /api/users/company-logo
 * @desc    Upload or replace employer company logo
 * @access  Private (Employer)
 */
router.put('/company-logo', authenticate, isEmployer, handleLogoUpload, userController.updateCompanyLogo);

/**
 * @route   DELETE /api/users/avatar
 * @desc    Delete user avatar
 * @access  Private
 */
router.delete('/avatar', authenticate, userController.deleteAvatar);

/**
 * @route   DELETE /api/users/account
 * @desc    Soft-delete user account (default, reversible)
 * @access  Private
 */
router.delete('/account', authenticate, userController.deleteAccount);

/**
 * @route   POST /api/users/account/permanent
 * @desc    Permanently delete own account (verified erasure request)
 * @access  Private
 */
router.post('/account/permanent', authenticate, userController.deleteAccountPermanent);

/**
 * @route   DELETE /api/users/admin/:userId/account
 * @desc    Admin-triggered immediate hard-delete (verified erasure request)
 * @access  Private (Admin only)
 */
router.delete('/admin/:userId/account', authenticate, isAdmin, userController.hardDeleteUser);

module.exports = router;

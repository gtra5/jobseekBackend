/**
 * Application Routes
 * Routes for job applications
 */

const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { authenticate } = require('../middleware/authMiddleware');
const { isJobSeeker, isEmployer } = require('../middleware/roleMiddleware');
const { applicationValidators } = require('../middleware/validateRequest');

/**
 * @route   POST /api/applications/:jobId
 * @desc    Apply to a job
 * @access  Private (Job Seeker only)
 */
router.post('/:jobId', authenticate, isJobSeeker, applicationValidators.apply, applicationController.applyToJob);

/**
 * @route   GET /api/applications
 * @desc    Get all applications for current user
 * @access  Private
 */
router.get('/', authenticate, applicationController.getMyApplications);

/**
 * @route   GET /api/applications/:applicationId
 * @desc    Get application by ID
 * @access  Private
 */
router.get('/:applicationId', authenticate, applicationController.getApplicationById);

/**
 * @route   PUT /api/applications/:applicationId/status
 * @desc    Update application status
 * @access  Private (Employer only)
 */
router.put('/:applicationId/status', authenticate, isEmployer, applicationValidators.updateStatus, applicationController.updateApplicationStatus);

/**
 * @route   PUT /api/applications/:applicationId/withdraw
 * @desc    Withdraw application
 * @access  Private (Job Seeker only)
 */
router.put('/:applicationId/withdraw', authenticate, isJobSeeker, applicationController.withdrawApplication);

/**
 * @route   GET /api/applications/employer/:jobId
 * @desc    Get all applications for a specific job
 * @access  Private (Employer only)
 */
router.get('/employer/:jobId', authenticate, isEmployer, applicationController.getJobApplications);

/**
 * @route   GET /api/applications/employer/all
 * @desc    Get all applications for employer's jobs
 * @access  Private (Employer only)
 */
router.get('/employer/all', authenticate, isEmployer, applicationController.getEmployerApplications);

/**
 * @route   POST /api/applications/:applicationId/interview
 * @desc    Schedule an interview
 * @access  Private (Employer only)
 */
router.post('/:applicationId/interview', authenticate, isEmployer, applicationController.scheduleInterview);

/**
 * @route   PUT /api/applications/:applicationId/rating
 * @desc    Rate an application
 * @access  Private (Employer only)
 */
router.put('/:applicationId/rating', authenticate, isEmployer, applicationController.rateApplication);

module.exports = router;

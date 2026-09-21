/**
 * Job Routes
 * Delegates to jobController — matches Job.js's real schema
 */

const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticate } = require('../middleware/authMiddleware');
const { isEmployer } = require('../middleware/roleMiddleware');
const { jobValidators } = require('../middleware/validateRequest');

// Static routes must be registered before /:jobId to avoid
// Express treating the literal segments as an ObjectId param.

/**
 * @route   GET /api/jobs/employer/my-jobs
 * @desc    Get all jobs posted by the authenticated employer
 * @access  Private (Employer)
 */
router.get('/employer/my-jobs', authenticate, isEmployer, jobController.getEmployerJobs);

/**
 * @route   GET /api/jobs/categories
 * @desc    Get distinct job categories
 * @access  Public
 */
router.get('/categories', jobController.getCategories);

/**
 * @route   GET /api/jobs/locations
 * @desc    Get distinct job locations
 * @access  Public
 */
router.get('/locations', jobController.getLocations);

/**
 * @route   GET /api/jobs/similar/:jobId
 * @desc    Get jobs similar to a given job
 * @access  Public
 */
router.get('/similar/:jobId', jobValidators.getJob, jobController.getSimilarJobs);

/**
 * @route   GET /api/jobs
 * @desc    Get all jobs with filters and pagination
 * @access  Public
 */
router.get('/', jobValidators.searchJobs, jobController.getAllJobs);

/**
 * @route   POST /api/jobs
 * @desc    Create a new job posting
 * @access  Private (Employer)
 */
router.post('/', authenticate, isEmployer, jobValidators.createJob, jobController.createJob);

/**
 * @route   GET /api/jobs/:jobId
 * @desc    Get a single job by ID (handles both MongoDB ObjectIds and external job IDs)
 * @access  Public
 */
router.get('/:jobId', jobController.getJobById);

/**
 * @route   PUT /api/jobs/:jobId
 * @desc    Update a job posting
 * @access  Private (Employer)
 */
router.put('/:jobId', authenticate, isEmployer, jobValidators.updateJob, jobController.updateJob);

/**
 * @route   DELETE /api/jobs/:jobId
 * @desc    Soft-delete a job posting
 * @access  Private (Employer)
 */
router.delete('/:jobId', authenticate, isEmployer, jobController.deleteJob);

module.exports = router;

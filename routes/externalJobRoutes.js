/**
 * External Job Routes
 * Routes for fetching external job listings from various APIs
 */

const express = require('express');
const router = express.Router();
const externalJobController = require('../controllers/externalJobController');
const { optionalAuth } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/external-jobs/aggregate
 * @desc    Aggregate jobs from all external sources
 * @access  Public
 */
router.get('/aggregate', optionalAuth, externalJobController.aggregateExternalJobs);

/**
 * @route   GET /api/external-jobs/all
 * @desc    Get flattened list of all external jobs
 * @access  Public
 */
router.get('/all', optionalAuth, externalJobController.getAllExternalJobs);

/**
 * @route   GET /api/external-jobs/categories
 * @desc    Get available job categories from external APIs
 * @access  Public
 */
router.get('/categories', optionalAuth, externalJobController.getExternalCategories);

/**
 * @route   GET /api/external-jobs/sources
 * @desc    Get list of available external job sources
 * @access  Public
 */
router.get('/sources', optionalAuth, externalJobController.getAvailableSources);

/**
 * @route   GET /api/external-jobs/:source
 * @desc    Get jobs from a specific external source
 * @access  Public
 */
router.get('/:source', optionalAuth, externalJobController.getJobsBySource); // always last

module.exports = router;





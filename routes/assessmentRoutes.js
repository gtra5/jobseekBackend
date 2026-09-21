/**
 * Assessment Routes
 * Routes for skill assessments.
 */

const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessmentController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { isJobSeeker } = require('../middleware/roleMiddleware');

/**
 * @route   GET /api/assessments/categories
 * @desc    List available assessment categories
 * @access  Public
 */
router.get('/categories', optionalAuth, assessmentController.getCategories);

/**
 * @route   GET /api/assessments/my
 * @desc    Return authenticated user's best verified scores
 * @access  Private
 */
router.get('/my', authenticate, assessmentController.getMyResults);

/**
 * @route   GET /api/assessments/search
 * @desc    Search freelancers by verified skill / query, ranked by score
 * @access  Public
 */
router.get('/search', optionalAuth, assessmentController.searchFreelancers);

/**
 * @route   GET /api/assessments/:id
 * @desc    Fetch an assessment's questions for taking
 * @access  Public
 */
router.get('/:id', optionalAuth, assessmentController.getAssessmentById);

/**
 * @route   POST /api/assessments/:id/take
 * @desc    Submit answers and get scored
 * @access  Private (Job Seeker)
 */
router.post('/:id/take', authenticate, isJobSeeker, assessmentController.submitAssessment);

module.exports = router;

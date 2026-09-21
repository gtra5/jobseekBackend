/**
 * Profession Routes
 * Public endpoints for the shared profession taxonomy.
 */

const express = require('express');
const router = express.Router();
const professionController = require('../controllers/professionController');

/**
 * @route   GET /api/professions
 * @desc    Get the profession taxonomy with live job counts
 * @access  Public
 */
router.get('/', professionController.getProfessions);

module.exports = router;
/**
 * Skills Routes
 * Public endpoint — no auth required. Heavily cacheable.
 */

const express = require('express');
const router = express.Router();
const { getSkills } = require('../controllers/skillsController');

/**
 * @route   GET /api/skills
 * @desc    Get the full skills taxonomy (flat or grouped)
 * @access  Public
 */
router.get('/', getSkills);

module.exports = router;

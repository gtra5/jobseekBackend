/**
 * Skills Controller
 * Serves the shared skills taxonomy via GET /api/skills.
 * Response is intentionally lightweight — flat list + grouped list — so the
 * frontend can render both a flat MultiSelect and an optional grouped view.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const { SKILLS_BY_CATEGORY, ALL_SKILLS } = require('../constants/skills');

/**
 * GET /api/skills
 * Returns the full skills taxonomy.
 *
 * Query params:
 *   grouped=true  → returns { categories: [{ category, skills[] }] }
 *                   (default: false → flat sorted string[])
 */
const getSkills = asyncHandler(async (req, res) => {
  const grouped = req.query.grouped === 'true';

  if (grouped) {
    return ApiResponse.success(res, 200, 'Skills retrieved successfully', {
      categories: SKILLS_BY_CATEGORY,
    });
  }

  return ApiResponse.success(res, 200, 'Skills retrieved successfully', {
    skills: ALL_SKILLS,
  });
});

module.exports = { getSkills };

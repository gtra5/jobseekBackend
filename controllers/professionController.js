/**
 * Profession Controller
 * Serves the shared profession taxonomy with live job counts.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const PROFESSIONS = require('../constants/professions');
const { Job } = require('../models');

/**
 * GET /api/professions
 * Return the taxonomy list, each profession annotated with the number of
 * active, non-deleted jobs tagged with it.
 */
const getProfessions = asyncHandler(async (req, res) => {
  const counts = await Job.aggregate([
    {
      $match: {
        isActive: true,
        isDeleted: false,
        profession: { $exists: true, $ne: null, $in: PROFESSIONS },
      },
    },
    { $group: { _id: '$profession', count: { $sum: 1 } } },
  ]);

  const countMap = Object.fromEntries(counts.map((c) => [c._id, c.count]));

  const professions = PROFESSIONS.map((name) => ({
    name,
    count: countMap[name] || 0,
  }));

  return ApiResponse.success(res, 200, 'Professions retrieved successfully', {
    professions,
  });
});

module.exports = {
  getProfessions,
};
/**
 * External Job Controller
 * Handles fetching and aggregating jobs from external APIs
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const {
  aggregateJobs,
  getAllJobs,
  getRemotiveCategories,
  getSourceStatus,
} = require('../services/jobSourcingService');
const PROFESSIONS = require('../constants/professions');

/**
 * Parse an integer and clamp it to [min, max].
 * Returns `fallback` when the input is missing or not a number.
 */
const clampInt = (value, min, max, fallback) => {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

/**
 * GET /api/external-jobs/aggregate
 * Aggregate jobs from all external sources
 */
const aggregateExternalJobs = asyncHandler(async (req, res) => {
  const { keywords, location, jobType, category, minSalary, maxSalary, sources, days } = req.query;

  // Parse sources if provided as comma-separated string
  let sourcesArray = null;
  if (sources) {
    sourcesArray = sources.split(',').map(s => s.trim().toLowerCase());
  }

  // Build search parameters
  const params = {
    keywords: keywords || '',
    location: location || '',
    jobType: jobType || '',
    category: category || '',
    minSalary: minSalary ? parseInt(minSalary) : null,
    maxSalary: maxSalary ? parseInt(maxSalary) : null,
    page: clampInt(req.query.page, 1, 1000, 1),
    limit: clampInt(req.query.limit, 1, 50, 10),
    remote: req.query.remote === 'true',
    days: clampInt(days, 1, 90, 30), // Default to 30 days if not specified
  };

  const aggregatedJobs = await aggregateJobs(params, sourcesArray);

  // Calculate total jobs across all sources
  const totalJobs = Object.values(aggregatedJobs).reduce((sum, jobs) => sum + jobs.length, 0);

  return ApiResponse.success(res, 200, 'External jobs aggregated successfully', {
    total: totalJobs,
    sources: aggregatedJobs,
    sourceStatus: getSourceStatus(),
  });
});

/**
 * GET /api/external-jobs/all
 * Get flattened list of all external jobs
 */
const getAllExternalJobs = asyncHandler(async (req, res) => {
  const { keywords, location, jobType, professions, category, experienceLevel, minSalary, maxSalary, sources, days } = req.query;

  // Neither of these can be applied accurately to external jobs:
  // - category: no external source's own category taxonomy lines up with
  //   Voraq's fixed, employer-chosen category list, so there's no reliable
  //   way to tell whether an external job matches a selected category.
  // - experienceLevel: none of the four sources provide this data at all.
  // Rather than silently ignoring these filters (letting every external job
  // through regardless, which is the "filters don't work accurately" bug)
  // or guessing with an unreliable text match, external jobs are simply
  // excluded while either filter is active — skip the fetch entirely
  // rather than doing the work only to filter it all out afterward.
  if (category || experienceLevel) {
    const page = clampInt(req.query.page, 1, 1000, 1);
    const limit = clampInt(req.query.limit, 1, 50, 10);
    return ApiResponse.success(res, 200, 'External jobs retrieved successfully', {
      jobs: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    });
  }

  // Parse sources if provided as comma-separated string
  let sourcesArray = null;
  if (sources) {
    sourcesArray = sources.split(',').map(s => s.trim().toLowerCase());
  }

  // Build search parameters
  const params = {
    keywords: keywords || '',
    location: location || '',
    jobType: jobType || '',
    category: category || '',
    minSalary: minSalary ? parseInt(minSalary) : null,
    maxSalary: maxSalary ? parseInt(maxSalary) : null,
    page: clampInt(req.query.page, 1, 1000, 1),
    limit: clampInt(req.query.limit, 1, 50, 10),
    remote: req.query.remote === 'true',
    days: clampInt(days, 1, 90, 30),
  };

  const allJobs = await getAllJobs(params, sourcesArray);

  // Filter by job type if specified.
  // 'Remote' and 'Hybrid' are valid internal jobType values, but no
  // external source ever normalizes to either — they track remoteness via
  // a separate boolean field instead. 'Remote' is treated as equivalent to
  // that boolean (the correct real signal); 'Hybrid' has no external
  // equivalent at all, so it's excluded rather than guessed at.
  let filteredJobs = allJobs;
  if (jobType) {
    const jobTypeLower = jobType.toLowerCase();
    if (jobTypeLower === 'remote') {
      filteredJobs = filteredJobs.filter(job => job.remote);
    } else if (jobTypeLower === 'hybrid') {
      filteredJobs = [];
    } else {
      filteredJobs = filteredJobs.filter(
        job => job.jobType && job.jobType.toLowerCase() === jobTypeLower
      );
    }
  }

  // Filter by salary range if specified. Only Adzuna returns real numeric
  // salary data — Findwork, Remotive, and Arbeitnow always report min/max
  // as null. A job with unknown salary can't be confirmed to satisfy a
  // salary filter, so it's correctly excluded here rather than guessed at.
  if (minSalary) {
    filteredJobs = filteredJobs.filter(job => 
      job.salary && job.salary.min && job.salary.min >= minSalary
    );
  }
  if (maxSalary) {
    filteredJobs = filteredJobs.filter(job => 
      job.salary && job.salary.max && job.salary.max <= maxSalary
    );
  }

  // Filter by remote if specified
  if (req.query.remote === 'true') {
    filteredJobs = filteredJobs.filter(job => job.remote);
  }

  // Filter by profession (internal taxonomy, applied post-ingestion since
  // external APIs can't filter by Voraq's taxonomy)
  if (professions) {
    const wanted = professions
      .split(',')
      .map(p => p.trim())
      .filter(p => PROFESSIONS.includes(p));
    if (wanted.length > 0) {
      filteredJobs = filteredJobs.filter(job =>
        job.profession && wanted.includes(job.profession)
      );
    }
  }

  // Pagination (uses values already clamped above)
  const page = params.page;
  const limit = params.limit;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

  return ApiResponse.success(res, 200, 'External jobs retrieved successfully', {
    jobs: paginatedJobs,
    pagination: {
      page,
      limit,
      total: filteredJobs.length,
      totalPages: Math.ceil(filteredJobs.length / limit),
    },
  });
});

/**
 * GET /api/external-jobs/:source
 * Get jobs from a specific external source
 */
const getJobsBySource = asyncHandler(async (req, res) => {
  const { source } = req.params;
  const validSources = ['adzuna', 'findwork', 'remotive', 'arbeitnow'];

  if (!validSources.includes(source.toLowerCase())) {
    return ApiResponse.badRequest(res, `Invalid source. Valid sources: ${validSources.join(', ')}`);
  }

  const { keywords, location, page = 1, limit = 10, days } = req.query;

  const params = {
    keywords: keywords || '',
    location: location || '',
    page: clampInt(page, 1, 1000, 1),
    limit: clampInt(limit, 1, 50, 10),
    remote: req.query.remote === 'true',
    days: clampInt(days, 1, 90, 30),
  };

  const aggregated = await aggregateJobs(params, [source.toLowerCase()]);
  const jobs = aggregated[source.toLowerCase()] || [];

  return ApiResponse.success(res, 200, `Jobs from ${source} retrieved successfully`, {
    source,
    count: jobs.length,
    jobs,
  });
});

/**
 * GET /api/external-jobs/categories
 * Get available job categories from external APIs
 */
const getExternalCategories = asyncHandler(async (req, res) => {
  const categories = await getRemotiveCategories();

  return ApiResponse.success(res, 200, 'Categories retrieved successfully', categories);
});

/**
 * GET /api/external-jobs/sources
 * Get list of available external job sources
 */
const getAvailableSources = asyncHandler(async (req, res) => {
  const sources = [
    {
      name: 'adzuna',
      displayName: 'Adzuna',
      requiresAuth: true,
      description: 'Global job search engine',
      authFields: ['ADZUNA_APP_ID', 'ADZUNA_APP_KEY'],
    },
    {
      name: 'findwork',
      displayName: 'Findwork',
      requiresAuth: true,
      description: 'Developer-focused job board',
      authFields: ['FINDWORK_API_KEY'],
    },
    {
      name: 'remotive',
      displayName: 'Remotive',
      requiresAuth: false,
      description: 'Remote job board',
      authFields: [],
    },
    {
      name: 'arbeitnow',
      displayName: 'Arbeitnow',
      requiresAuth: false,
      description: 'Tech and startup jobs',
      authFields: [],
    },
  ];

  return ApiResponse.success(res, 200, 'Available sources retrieved successfully', sources);
});

module.exports = {
  aggregateExternalJobs,
  getAllExternalJobs,
  getJobsBySource,
  getExternalCategories,
  getAvailableSources,
};
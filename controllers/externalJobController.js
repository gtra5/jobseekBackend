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

/**
 * GET /api/external-jobs/aggregate
 * Aggregate jobs from all external sources
 */
const aggregateExternalJobs = asyncHandler(async (req, res) => {
  const { keywords, location, jobType, category, minSalary, maxSalary, sources } = req.query;

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
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 10,
    remote: req.query.remote === 'true',
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
  const { keywords, location, jobType, category, minSalary, maxSalary, sources } = req.query;

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
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 10,
    remote: req.query.remote === 'true',
  };

  const allJobs = await getAllJobs(params, sourcesArray);

  // Filter by job type if specified
  let filteredJobs = allJobs;
  if (jobType) {
    const jobTypeLower = jobType.toLowerCase();
    filteredJobs = filteredJobs.filter(
      job => job.jobType && job.jobType.toLowerCase() === jobTypeLower
    );
  }

  // Filter by salary range if specified
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

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
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

  const { keywords, location, page = 1, limit = 10 } = req.query;

  const params = {
    keywords: keywords || '',
    location: location || '',
    page: parseInt(page),
    limit: parseInt(limit),
    remote: req.query.remote === 'true',
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

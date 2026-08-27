/**
 * Job Controller
 * Handles job posting, updating, and retrieval
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const { Job, Application } = require('../models');

/**
 * POST /api/jobs
 * Create a new job posting (employer only)
 */
const createJob = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    location,
    jobType,
    category,
    salary,
    skills,
    requirements,
    benefits,
    experienceLevel,
    educationLevel,
    applicationDeadline,
  } = req.body;

  const job = await Job.create({
    employer: req.userId,
    title,
    description,
    location,
    jobType,
    category,
    salary,
    skills,
    requirements,
    benefits,
    experienceLevel,
    educationLevel,
    applicationDeadline,
  });

  return ApiResponse.created(res, 'Job created successfully', { job });
});

/**
 * GET /api/jobs
 * Get all jobs with filters and pagination
 */
const getAllJobs = asyncHandler(async (req, res) => {
  const {
    keywords,
    location,
    jobType,
    category,
    minSalary,
    maxSalary,
    experienceLevel,
    remote,
    page,
    limit,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // Build query
  const query = { isActive: true, isDeleted: false };

  // Keyword search
  if (keywords) {
    query.$or = [
      { title: { $regex: keywords, $options: 'i' } },
      { description: { $regex: keywords, $options: 'i' } },
      { skills: { $regex: keywords, $options: 'i' } },
    ];
  }

  // Location filter
  if (location) {
    query.location = { $regex: location, $options: 'i' };
  }

  // Job type filter
  if (jobType) {
    query.jobType = jobType;
  }

  // Category filter
  if (category) {
    query.category = category;
  }

  // Salary range filter
  if (minSalary || maxSalary) {
    query['salary.min'] = query['salary.min'] || {};
    if (minSalary) query['salary.min'].$gte = parseInt(minSalary, 10);
    if (maxSalary) query['salary.max'] = { $lte: parseInt(maxSalary, 10) };
  }

  // Experience level filter
  if (experienceLevel) {
    query.experienceLevel = experienceLevel;
  }

  // Remote filter
  if (remote === 'true') {
    query.$or = [
      { jobType: 'Remote' },
      { jobType: 'Hybrid' },
      { location: { $regex: 'remote', $options: 'i' } },
    ];
  }

  // Sort options
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Pagination
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 6;
  const skip = Math.max(0, (pageNum - 1) * limitNum);

  const jobs = await Job.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  const total = await Job.countDocuments(query);

  return ApiResponse.success(res, 200, 'Jobs retrieved successfully', {
    jobs,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

/**
 * GET /api/jobs/:jobId
 * Get job by ID
 */
const getJobById = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const job = await Job.findById(jobId);

  if (!job) {
    return ApiResponse.notFound(res, 'Job not found');
  }

  // Check if job is active
  if (!job.isActive || job.isDeleted) {
    return ApiResponse.notFound(res, 'Job not available');
  }

  return ApiResponse.success(res, 200, 'Job retrieved successfully', { job });
});

/**
 * PUT /api/jobs/:jobId
 * Update job (employer only)
 */
const updateJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const job = await Job.findById(jobId);

  if (!job) {
    return ApiResponse.notFound(res, 'Job not found');
  }

  // Check if user is the employer
  if (job.employer.toString() !== req.userId) {
    return ApiResponse.forbidden(res, 'You can only update your own jobs');
  }

  const {
    title,
    description,
    location,
    jobType,
    category,
    salary,
    skills,
    requirements,
    benefits,
    experienceLevel,
    educationLevel,
    applicationDeadline,
    isActive,
  } = req.body;

  // Update fields
  if (title !== undefined) job.title = title;
  if (description !== undefined) job.description = description;
  if (location !== undefined) job.location = location;
  if (jobType !== undefined) job.jobType = jobType;
  if (category !== undefined) job.category = category;
  if (salary !== undefined) job.salary = salary;
  if (skills !== undefined) job.skills = skills;
  if (requirements !== undefined) job.requirements = requirements;
  if (benefits !== undefined) job.benefits = benefits;
  if (experienceLevel !== undefined) job.experienceLevel = experienceLevel;
  if (educationLevel !== undefined) job.educationLevel = educationLevel;
  if (applicationDeadline !== undefined) job.applicationDeadline = applicationDeadline;
  if (isActive !== undefined) job.isActive = isActive;

  await job.save();

  return ApiResponse.success(res, 200, 'Job updated successfully', { job });
});

/**
 * DELETE /api/jobs/:jobId
 * Delete job (employer only)
 */
const deleteJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const job = await Job.findById(jobId);

  if (!job) {
    return ApiResponse.notFound(res, 'Job not found');
  }

  // Check if user is the employer
  if (job.employer.toString() !== req.userId) {
    return ApiResponse.forbidden(res, 'You can only delete your own jobs');
  }

  // Soft delete
  job.isDeleted = true;
  job.isActive = false;
  await job.save();

  return ApiResponse.success(res, 200, 'Job deleted successfully');
});

/**
 * GET /api/jobs/employer/my-jobs
 * Get all jobs posted by current employer
 */
const getEmployerJobs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const query = { employer: req.userId, isDeleted: false };

  if (status === 'active') {
    query.isActive = true;
  } else if (status === 'inactive') {
    query.isActive = false;
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const jobs = await Job.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  // Add application counts
  const jobsWithCounts = await Promise.all(
    jobs.map(async (job) => {
      const applicationCount = await Application.countDocuments({ job: job._id });
      const jobObj = job.toObject();
      jobObj.applicationCount = applicationCount;
      return jobObj;
    })
  );

  const total = await Job.countDocuments(query);

  return ApiResponse.success(res, 200, 'Employer jobs retrieved successfully', {
    jobs: jobsWithCounts,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

/**
 * GET /api/jobs/similar/:jobId
 * Get similar jobs based on category and skills
 */
const getSimilarJobs = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const { limit = 5 } = req.query;

  const job = await Job.findById(jobId);

  if (!job) {
    return ApiResponse.notFound(res, 'Job not found');
  }

  // Find similar jobs based on category or skills
  const similarJobs = await Job.find({
    _id: { $ne: jobId },
    isActive: true,
    isDeleted: false,
    $or: [
      { category: job.category },
      { skills: { $in: job.skills } },
    ],
  })
    .limit(parseInt(limit, 10) || 5);

  return ApiResponse.success(res, 200, 'Similar jobs retrieved successfully', {
    jobs: similarJobs,
  });
});

/**
 * GET /api/jobs/categories
 * Get all job categories
 */
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Job.distinct('category', { isActive: true, isDeleted: false });

  return ApiResponse.success(res, 200, 'Categories retrieved successfully', { categories });
});

/**
 * GET /api/jobs/locations
 * Get all job locations
 */
const getLocations = asyncHandler(async (req, res) => {
  const locations = await Job.distinct('location', { isActive: true, isDeleted: false });

  return ApiResponse.success(res, 200, 'Locations retrieved successfully', { locations });
});

module.exports = {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  deleteJob,
  getEmployerJobs,
  getSimilarJobs,
  getCategories,
  getLocations,
};

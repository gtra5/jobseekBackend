/**
 * Application Controller
 * Handles job applications, interviews, ratings, and status management
 */

const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const Notification = require('../models/Notification');
const emailService = require('../services/emailService');
const { getAllJobs } = require('../services/jobSourcingService');

/**
 * Helper function to check if a string is a valid MongoDB ObjectId
 */
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Helper function to get job data (handles both MongoDB and external jobs)
 */
const getJobData = async (jobId) => {
  if (isValidObjectId(jobId)) {
    // Query MongoDB Job collection
    const job = await Job.findById(jobId).select('title location jobType salary description requirements benefits isActive').lean();
    return job;
  } else {
    // Query external job service
    try {
      const externalJobs = await getAllJobs({ page: 1, limit: 100 }, ['adzuna', 'findwork', 'remotive', 'arbeitnow']);
      const externalJob = externalJobs.find(job => job.id === jobId || job._id === jobId);
      return externalJob || null;
    } catch (error) {
      console.error('Error fetching external job:', error);
      return null;
    }
  }
};

/**
 * POST /api/applications/:jobId
 * Apply to a job
 * @access Private (Job Seeker)
 */
const applyToJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const { coverLetter, resumeUrl, expectedSalary, availability } = req.body;
  const applicantId = req.userId;

  // Check if job exists and is active
  const job = await Job.findById(jobId);
  if (!job) {
    return ApiResponse.notFound(res, 'Job not found');
  }
  // Job.js has no status field — use isActive/isDeleted
  if (!job.isActive || job.isDeleted) {
    return ApiResponse.badRequest(res, 'This job is no longer accepting applications');
  }

  // Prevent applying to own job
  if (job.employer.toString() === applicantId) {
    return ApiResponse.badRequest(res, 'You cannot apply to your own job posting');
  }

  // Check if already applied
  const existingApplication = await Application.findOne({
    job: jobId,
    jobSeeker: applicantId,
    status: { $ne: 'withdrawn' },
  });
  if (existingApplication) {
    return ApiResponse.conflict(res, 'You have already applied for this job');
  }

  // Build the application document using the real schema field names.
  // expectedSalary and availability are not in Application.js's schema so we
  // store them only if they were provided, avoiding silent data loss.
  const applicationData = {
    job: jobId,
    jobSeeker: applicantId,
    employer: job.employer,
    coverLetter: coverLetter || '',
    status: 'pending',
    appliedAt: new Date(),
  };

  // resumeSnapshot is what the schema defines (not resumeUrl)
  if (resumeUrl) {
    applicationData.resumeSnapshot = { url: resumeUrl };
  }

  // expectedSalary / availability are not on the Application schema —
  // store in employerNotes as a lightweight workaround so the data is
  // not silently dropped.
  const extras = [];
  if (expectedSalary != null) extras.push(`expectedSalary: ${expectedSalary}`);
  if (availability) extras.push(`availability: ${availability}`);
  if (extras.length) applicationData.employerNotes = extras.join(', ');

  const application = await Application.create(applicationData);

  // Populate for response
  await application.populate([
    { path: 'job', select: 'title location jobType' },
    { path: 'employer', select: 'firstName lastName email company' },
  ]);

  // Notify employer
  try {
    await Notification.create({
      recipient: job.employer,
      type: 'application_received',
      title: 'New Job Application',
      message: `You have a new application for "${job.title}"`,
      data: { applicationId: application._id, jobId: job._id },
    });
  } catch (notifErr) {
    console.error('Failed to create application notification:', notifErr.message);
  }

  // Send email notification to employer
  try {
    const employer = await User.findById(job.employer);
    if (employer && employer.notificationSettings?.email?.applicationUpdates !== false) {
      await emailService.sendApplicationStatusEmail(
        employer.email,
        `${employer.firstName || ''} ${employer.lastName || ''}`.trim(),
        job.title,
        'new_application'
      );
    }
  } catch (emailErr) {
    // Non-critical: log but don't fail the request
    console.error('Failed to send application notification email:', emailErr.message);
  }

  return ApiResponse.created(res, 'Application submitted successfully', {
    application: {
      id: application._id,
      job: application.job,
      status: application.status,
      coverLetter: application.coverLetter,
      resumeSnapshot: application.resumeSnapshot,
      appliedAt: application.appliedAt,
    },
  });
});

/**
 * GET /api/applications
 * Get all applications for current user (job seeker or employer context)
 * @access Private
 */
const getMyApplications = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const user = await User.findById(userId);

  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  const { status, page = 1, limit = 10, sortBy = 'appliedAt', order = 'desc' } = req.query;

  const query = {};

  if (user.role === 'jobseeker') {
    query.jobSeeker = userId;
  } else if (user.role === 'employer') {
    query.employer = userId;
  }

  if (status) {
    query.status = status;
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const applications = await Application.find(query)
    .populate({ path: 'employer', select: 'firstName lastName email company' })
    .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(limitNum);

  // Handle job population for each application (supports both MongoDB and external job IDs)
  const applicationsWithJobs = await Promise.all(
    applications.map(async (app) => {
      const appObj = app.toObject();
      
      // Check if job field is a valid ObjectId before populating
      if (app.job && isValidObjectId(app.job.toString())) {
        const job = await Job.findById(app.job).select('title location jobType salary isActive').lean();
        appObj.job = job;
      } else if (app.job) {
        // It's an external job ID, fetch from external service
        const externalJob = await getJobData(app.job.toString());
        appObj.job = externalJob;
      }
      
      return appObj;
    })
  );

  const total = await Application.countDocuments(query);

  return ApiResponse.success(res, 200, 'Applications retrieved successfully', {
    applications: applicationsWithJobs.map((app) => ({
      id: app._id,
      job: app.job,
      employer: app.employer,
      status: app.status,
      coverLetter: app.coverLetter,
      resumeSnapshot: app.resumeSnapshot,
      rating: app.rating,
      appliedAt: app.appliedAt,
      updatedAt: app.updatedAt,
      interviews: app.interviews || [],
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

/**
 * GET /api/applications/:applicationId
 * Get single application by ID
 * @access Private
 */
const getApplicationById = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const userId = req.userId;

  const application = await Application.findById(applicationId)
    .populate('jobSeeker', 'firstName lastName email phone avatar profile')
    .populate('employer', 'firstName lastName email company');

  if (!application) {
    return ApiResponse.notFound(res, 'Application not found');
  }

  // Handle job population (supports both MongoDB and external job IDs)
  if (application.job && isValidObjectId(application.job.toString())) {
    const job = await Job.findById(application.job).select('title description location jobType salary requirements benefits isActive').lean();
    application.job = job;
  } else if (application.job) {
    // It's an external job ID, fetch from external service
    const externalJob = await getJobData(application.job.toString());
    application.job = externalJob;
  }

  // Authorization: only jobSeeker, employer, or admin can view
  const isAuthorized =
    application.jobSeeker._id.toString() === userId ||
    application.employer._id.toString() === userId ||
    req.userRole === 'admin';

  if (!isAuthorized) {
    return ApiResponse.forbidden(res, 'You are not authorized to view this application');
  }

  return ApiResponse.success(res, 200, 'Application retrieved successfully', {
    application: {
      id: application._id,
      job: application.job,
      applicant: application.jobSeeker,
      employer: application.employer,
      status: application.status,
      coverLetter: application.coverLetter,
      resumeSnapshot: application.resumeSnapshot,
      rating: application.rating,
      employerNotes: application.employerNotes,
      appliedAt: application.appliedAt,
      updatedAt: application.updatedAt,
      interviews: application.interviews || [],
    },
  });
});

/**
 * PUT /api/applications/:applicationId/status
 * Update application status (shortlist, reject, hire, etc.)
 * @access Private (Employer)
 */
const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const { status, feedback } = req.body;
  const employerId = req.userId;

  const validStatuses = ['pending', 'reviewed', 'shortlisted', 'interview', 'offered', 'rejected', 'hired'];
  if (!validStatuses.includes(status)) {
    return ApiResponse.badRequest(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const application = await Application.findById(applicationId);
  if (!application) {
    return ApiResponse.notFound(res, 'Application not found');
  }

  // Verify ownership
  if (application.employer.toString() !== employerId) {
    return ApiResponse.forbidden(res, 'You can only update applications for your own jobs');
  }

  // Prevent status change if withdrawn
  if (application.status === 'withdrawn') {
    return ApiResponse.badRequest(res, 'Cannot update status of a withdrawn application');
  }

  const previousStatus = application.status;
  application.status = status;
  if (feedback !== undefined) {
    application.employerNotes = feedback;
  }
  await application.save();

  // Populate for notification
  await application.populate([
    { path: 'job', select: 'title' },
    { path: 'jobSeeker', select: 'firstName lastName email notificationSettings' },
  ]);

  // Notify applicant
  try {
    const notifType =
      status === 'offered' ? 'job_offer' :
      status === 'rejected' ? 'application_rejected' :
      'application_status';
    await Notification.create({
      recipient: application.jobSeeker._id,
      type: notifType,
      title: 'Application Status Updated',
      message: `Your application for "${application.job.title}" has been updated to "${status}"`,
      data: { applicationId: application._id, jobId: application.job._id, status },
    });
  } catch (notifErr) {
    console.error('Failed to create status notification:', notifErr.message);
  }

  // Send email notification using the real function name
  try {
    if (application.jobSeeker.notificationSettings?.email?.applicationUpdates !== false) {
      await emailService.sendApplicationStatusEmail(
        application.jobSeeker.email,
        `${application.jobSeeker.firstName} ${application.jobSeeker.lastName}`,
        application.job.title,
        status
      );
    }
  } catch (emailErr) {
    console.error('Failed to send status update email:', emailErr.message);
  }

  return ApiResponse.success(res, 200, `Application status updated to ${status}`, {
    application: {
      id: application._id,
      status: application.status,
      previousStatus,
      employerNotes: application.employerNotes,
      updatedAt: application.updatedAt,
    },
  });
});

/**
 * PUT /api/applications/:applicationId/withdraw
 * Withdraw an application
 * @access Private (Job Seeker)
 */
const withdrawApplication = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const applicantId = req.userId;

  const application = await Application.findById(applicationId);
  if (!application) {
    return ApiResponse.notFound(res, 'Application not found');
  }

  if (application.jobSeeker.toString() !== applicantId) {
    return ApiResponse.forbidden(res, 'You can only withdraw your own applications');
  }

  if (application.status === 'withdrawn') {
    return ApiResponse.badRequest(res, 'Application is already withdrawn');
  }

  if (['hired', 'rejected'].includes(application.status)) {
    return ApiResponse.badRequest(res, `Cannot withdraw application with status: ${application.status}`);
  }

  application.status = 'withdrawn';
  application.withdrawnAt = new Date();
  await application.save();

  // Notify employer
  try {
    await Notification.create({
      recipient: application.employer,
      type: 'application_status',
      title: 'Application Withdrawn',
      message: 'An applicant has withdrawn their application',
      data: { applicationId: application._id },
    });
  } catch (notifErr) {
    console.error('Failed to create withdrawal notification:', notifErr.message);
  }

  return ApiResponse.success(res, 200, 'Application withdrawn successfully', {
    application: {
      id: application._id,
      status: application.status,
      withdrawnAt: application.withdrawnAt,
    },
  });
});

/**
 * GET /api/applications/employer/:jobId
 * Get all applications for a specific job (employer view)
 * @access Private (Employer)
 */
const getJobApplications = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const employerId = req.userId;
  const { status, page = 1, limit = 10, sortBy = 'appliedAt', order = 'desc' } = req.query;

  // Verify job ownership
  const job = await Job.findById(jobId);
  if (!job) {
    return ApiResponse.notFound(res, 'Job not found');
  }
  if (job.employer.toString() !== employerId) {
    return ApiResponse.forbidden(res, 'You can only view applications for your own jobs');
  }

  const query = { job: jobId };
  if (status) {
    query.status = status;
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const applications = await Application.find(query)
    .populate('jobSeeker', 'firstName lastName email phone avatar profile')
    .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(limitNum);

  // Add job info to each application
  const applicationsWithJob = await Promise.all(
    applications.map(async (app) => {
      const appObj = app.toObject();
      appObj.job = {
        id: job._id,
        title: job.title,
        location: job.location,
        jobType: job.jobType
      };
      return appObj;
    })
  );

  const total = await Application.countDocuments(query);

  return ApiResponse.success(res, 200, 'Job applications retrieved successfully', {
    job: {
      id: job._id,
      title: job.title,
    },
    applications: applicationsWithJob.map((app) => ({
      id: app._id,
      applicant: app.jobSeeker,
      status: app.status,
      coverLetter: app.coverLetter,
      resumeSnapshot: app.resumeSnapshot,
      rating: app.rating,
      appliedAt: app.appliedAt,
      updatedAt: app.updatedAt,
      interviews: app.interviews || [],
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

/**
 * GET /api/applications/employer/all
 * Get all applications across all employer's jobs
 * @access Private (Employer)
 */
const getEmployerApplications = asyncHandler(async (req, res) => {
  const employerId = req.userId;
  const { status, page = 1, limit = 10, sortBy = 'appliedAt', order = 'desc' } = req.query;

  const query = { employer: employerId };
  if (status) {
    query.status = status;
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const applications = await Application.find(query)
    .populate('jobSeeker', 'firstName lastName email phone avatar profile')
    .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(limitNum);

  // Handle job population for each application (supports both MongoDB and external job IDs)
  const applicationsWithJobs = await Promise.all(
    applications.map(async (app) => {
      const appObj = app.toObject();
      
      // Check if job field is a valid ObjectId before populating
      if (app.job && isValidObjectId(app.job.toString())) {
        const job = await Job.findById(app.job).select('title location jobType salary').lean();
        appObj.job = job;
      } else if (app.job) {
        // It's an external job ID, fetch from external service
        const externalJob = await getJobData(app.job.toString());
        appObj.job = externalJob;
      }
      
      return appObj;
    })
  );

  const total = await Application.countDocuments(query);

  // Get summary stats — use `new` as required by Mongoose 6+
  const stats = await Application.aggregate([
    { $match: { employer: new mongoose.Types.ObjectId(employerId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const statusCounts = {};
  stats.forEach((s) => {
    statusCounts[s._id] = s.count;
  });

  return ApiResponse.success(res, 200, 'All employer applications retrieved successfully', {
    applications: applicationsWithJobs.map((app) => ({
      id: app._id,
      job: app.job,
      applicant: app.jobSeeker,
      status: app.status,
      coverLetter: app.coverLetter,
      resumeSnapshot: app.resumeSnapshot,
      rating: app.rating,
      appliedAt: app.appliedAt,
      updatedAt: app.updatedAt,
      interviews: app.interviews || [],
    })),
    stats: {
      total,
      byStatus: statusCounts,
    },
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

/**
 * POST /api/applications/:applicationId/interview
 * Schedule an interview for an applicant
 * @access Private (Employer)
 */
const scheduleInterview = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const { scheduledAt, type, location, meetingLink, notes, duration } = req.body;
  const employerId = req.userId;

  if (!scheduledAt) {
    return ApiResponse.badRequest(res, 'Interview date and time are required');
  }

  const application = await Application.findById(applicationId);
  if (!application) {
    return ApiResponse.notFound(res, 'Application not found');
  }

  if (application.employer.toString() !== employerId) {
    return ApiResponse.forbidden(res, 'You can only schedule interviews for your own jobs');
  }

  if (application.status === 'withdrawn') {
    return ApiResponse.badRequest(res, 'Cannot schedule interview for a withdrawn application');
  }

  // Push a new entry into the interviews array (schema uses `interviews`, not `interview`)
  const interviewEntry = {
    scheduledAt: new Date(scheduledAt),
    type: type || 'video',
    location: location || '',
    meetingLink: meetingLink || '',
    notes: notes || '',
    duration: duration || 60,
    status: 'scheduled',
  };

  application.interviews.push(interviewEntry);
  application.status = 'interview';
  await application.save();

  // Populate for notifications
  await application.populate([
    { path: 'job', select: 'title' },
    { path: 'jobSeeker', select: 'firstName lastName email notificationSettings' },
  ]);

  const scheduledInterview = application.interviews[application.interviews.length - 1];

  // Notify applicant
  try {
    await Notification.create({
      recipient: application.jobSeeker._id,
      type: 'interview_scheduled',
      title: 'Interview Scheduled',
      message: `You have been scheduled for an interview for "${application.job.title}"`,
      data: {
        applicationId: application._id,
        jobId: application.job._id,
        interview: scheduledInterview,
      },
    });
  } catch (notifErr) {
    console.error('Failed to create interview notification:', notifErr.message);
  }

  // Send email using the real function name and matching its signature
  try {
    if (application.jobSeeker.notificationSettings?.email?.applicationUpdates !== false) {
      await emailService.sendInterviewEmail(
        application.jobSeeker.email,
        `${application.jobSeeker.firstName} ${application.jobSeeker.lastName}`,
        application.job.title,
        scheduledInterview.scheduledAt,
        scheduledInterview.type
      );
    }
  } catch (emailErr) {
    console.error('Failed to send interview email:', emailErr.message);
  }

  return ApiResponse.success(res, 200, 'Interview scheduled successfully', {
    application: {
      id: application._id,
      status: application.status,
      interview: scheduledInterview,
    },
  });
});

/**
 * PUT /api/applications/:applicationId/rating
 * Rate an application/applicant
 * @access Private (Employer)
 */
const rateApplication = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const { rating, review } = req.body;
  const employerId = req.userId;

  // Validate rating
  const ratingNum = parseInt(rating, 10);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return ApiResponse.badRequest(res, 'Rating must be a number between 1 and 5');
  }

  const application = await Application.findById(applicationId);
  if (!application) {
    return ApiResponse.notFound(res, 'Application not found');
  }

  if (application.employer.toString() !== employerId) {
    return ApiResponse.forbidden(res, 'You can only rate applications for your own jobs');
  }

  // rating is a plain Number on the schema (not an object)
  application.rating = ratingNum;
  if (review) {
    application.employerNotes = review;
  }
  await application.save();

  return ApiResponse.success(res, 200, 'Application rated successfully', {
    application: {
      id: application._id,
      rating: application.rating,
    },
  });
});

module.exports = {
  applyToJob,
  getMyApplications,
  getApplicationById,
  updateApplicationStatus,
  withdrawApplication,
  getJobApplications,
  getEmployerApplications,
  scheduleInterview,
  rateApplication,
};

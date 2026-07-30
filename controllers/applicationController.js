/**
 * Application Controller
 * Handles job applications, interviews, ratings, and status management
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const Notification = require('../models/Notification');
const emailService = require('../services/emailService');

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
  if (!job.isActive || job.status !== 'open') {
    return ApiResponse.badRequest(res, 'This job is no longer accepting applications');
  }

  // Prevent applying to own job
  if (job.employerId.toString() === applicantId) {
    return ApiResponse.badRequest(res, 'You cannot apply to your own job posting');
  }

  // Check if already applied
  const existingApplication = await Application.findOne({
    jobId,
    applicantId,
    status: { $ne: 'withdrawn' },
  });
  if (existingApplication) {
    return ApiResponse.conflict(res, 'You have already applied for this job');
  }

  // Create application
  const application = await Application.create({
    jobId,
    applicantId,
    employerId: job.employerId,
    coverLetter: coverLetter || '',
    resumeUrl: resumeUrl || '',
    expectedSalary: expectedSalary || null,
    availability: availability || '',
    status: 'pending',
    appliedAt: new Date(),
  });

  // Populate for response
  await application.populate([
    { path: 'jobId', select: 'title company location jobType' },
    { path: 'employerId', select: 'firstName lastName email company' },
  ]);

  // Notify employer
  await Notification.create({
    userId: job.employerId,
    type: 'new_application',
    title: 'New Job Application',
    message: `You have a new application for "${job.title}"`,
    data: { applicationId: application._id, jobId: job._id },
  });

  // Send email notification to employer
  try {
    const employer = await User.findById(job.employerId);
    if (employer && employer.notificationSettings?.emailNotifications !== false) {
      await emailService.sendApplicationNotification(employer.email, {
        jobTitle: job.title,
        applicantName: `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim(),
      });
    }
  } catch (emailErr) {
    // Non-critical: log but don't fail the request
    console.error('Failed to send application notification email:', emailErr.message);
  }

  return ApiResponse.created(res, 'Application submitted successfully', {
    application: {
      id: application._id,
      job: application.jobId,
      status: application.status,
      coverLetter: application.coverLetter,
      resumeUrl: application.resumeUrl,
      expectedSalary: application.expectedSalary,
      availability: application.availability,
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

  let applications;
  const { status, page = 1, limit = 10, sortBy = 'appliedAt', order = 'desc' } = req.query;

  const query = {};
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { [sortBy]: order === 'asc' ? 1 : -1 },
    populate: [
      { path: 'jobId', select: 'title company location jobType salary status' },
      { path: 'employerId', select: 'firstName lastName email company' },
    ],
  };

  if (user.role === 'jobseeker') {
    query.applicantId = userId;
  } else if (user.role === 'employer') {
    query.employerId = userId;
  }

  if (status) {
    query.status = status;
  }

  const skip = (options.page - 1) * options.limit;

  applications = await Application.find(query)
    .populate(options.populate)
    .sort(options.sort)
    .skip(skip)
    .limit(options.limit);

  const total = await Application.countDocuments(query);

  return ApiResponse.success(res, 200, 'Applications retrieved successfully', {
    applications: applications.map((app) => ({
      id: app._id,
      job: app.jobId,
      employer: app.employerId,
      status: app.status,
      coverLetter: app.coverLetter,
      resumeUrl: app.resumeUrl,
      expectedSalary: app.expectedSalary,
      rating: app.rating,
      appliedAt: app.appliedAt,
      updatedAt: app.updatedAt,
      interview: app.interview || null,
    })),
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      pages: Math.ceil(total / options.limit),
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
    .populate('jobId', 'title description company location jobType salary requirements benefits status')
    .populate('applicantId', 'firstName lastName email phone avatar profile')
    .populate('employerId', 'firstName lastName email company');

  if (!application) {
    return ApiResponse.notFound(res, 'Application not found');
  }

  // Authorization: only applicant, employer, or admin can view
  const isAuthorized =
    application.applicantId._id.toString() === userId ||
    application.employerId._id.toString() === userId ||
    req.userRole === 'admin';

  if (!isAuthorized) {
    return ApiResponse.forbidden(res, 'You are not authorized to view this application');
  }

  return ApiResponse.success(res, 200, 'Application retrieved successfully', {
    application: {
      id: application._id,
      job: application.jobId,
      applicant: application.applicantId,
      employer: application.employerId,
      status: application.status,
      coverLetter: application.coverLetter,
      resumeUrl: application.resumeUrl,
      expectedSalary: application.expectedSalary,
      availability: application.availability,
      rating: application.rating,
      feedback: application.feedback,
      appliedAt: application.appliedAt,
      updatedAt: application.updatedAt,
      interview: application.interview || null,
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

  const validStatuses = ['pending', 'reviewing', 'shortlisted', 'rejected', 'hired', 'interview'];
  if (!validStatuses.includes(status)) {
    return ApiResponse.badRequest(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const application = await Application.findById(applicationId);
  if (!application) {
    return ApiResponse.notFound(res, 'Application not found');
  }

  // Verify ownership
  if (application.employerId.toString() !== employerId) {
    return ApiResponse.forbidden(res, 'You can only update applications for your own jobs');
  }

  // Prevent status change if withdrawn
  if (application.status === 'withdrawn') {
    return ApiResponse.badRequest(res, 'Cannot update status of a withdrawn application');
  }

  const previousStatus = application.status;
  application.status = status;
  if (feedback !== undefined) {
    application.feedback = feedback;
  }
  application.updatedAt = new Date();
  await application.save();

  // Populate for notification
  await application.populate([
    { path: 'jobId', select: 'title' },
    { path: 'applicantId', select: 'firstName lastName email notificationSettings' },
  ]);

  // Notify applicant
  await Notification.create({
    userId: application.applicantId._id,
    type: 'application_status_update',
    title: 'Application Status Updated',
    message: `Your application for "${application.jobId.title}" has been updated to "${status}"`,
    data: { applicationId: application._id, jobId: application.jobId._id, status },
  });

  // Send email notification
  try {
    if (application.applicantId.notificationSettings?.emailNotifications !== false) {
      await emailService.sendStatusUpdateEmail(application.applicantId.email, {
        applicantName: `${application.applicantId.firstName} ${application.applicantId.lastName}`,
        jobTitle: application.jobId.title,
        status: status.charAt(0).toUpperCase() + status.slice(1),
        feedback: feedback || '',
      });
    }
  } catch (emailErr) {
    console.error('Failed to send status update email:', emailErr.message);
  }

  return ApiResponse.success(res, 200, `Application status updated to ${status}`, {
    application: {
      id: application._id,
      status: application.status,
      previousStatus,
      feedback: application.feedback,
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

  if (application.applicantId.toString() !== applicantId) {
    return ApiResponse.forbidden(res, 'You can only withdraw your own applications');
  }

  if (application.status === 'withdrawn') {
    return ApiResponse.badRequest(res, 'Application is already withdrawn');
  }

  if (['hired', 'rejected'].includes(application.status)) {
    return ApiResponse.badRequest(res, `Cannot withdraw application with status: ${application.status}`);
  }

  application.status = 'withdrawn';
  application.updatedAt = new Date();
  await application.save();

  // Notify employer
  await Notification.create({
    userId: application.employerId,
    type: 'application_withdrawn',
    title: 'Application Withdrawn',
    message: 'An applicant has withdrawn their application',
    data: { applicationId: application._id },
  });

  return ApiResponse.success(res, 200, 'Application withdrawn successfully', {
    application: {
      id: application._id,
      status: application.status,
      updatedAt: application.updatedAt,
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
  if (job.employerId.toString() !== employerId) {
    return ApiResponse.forbidden(res, 'You can only view applications for your own jobs');
  }

  const query = { jobId };
  if (status) {
    query.status = status;
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const applications = await Application.find(query)
    .populate('applicantId', 'firstName lastName email phone avatar profile')
    .populate('jobId', 'title company location jobType')
    .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Application.countDocuments(query);

  return ApiResponse.success(res, 200, 'Job applications retrieved successfully', {
    job: {
      id: job._id,
      title: job.title,
      company: job.company,
    },
    applications: applications.map((app) => ({
      id: app._id,
      applicant: app.applicantId,
      status: app.status,
      coverLetter: app.coverLetter,
      resumeUrl: app.resumeUrl,
      expectedSalary: app.expectedSalary,
      rating: app.rating,
      appliedAt: app.appliedAt,
      updatedAt: app.updatedAt,
      interview: app.interview || null,
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

  const query = { employerId };
  if (status) {
    query.status = status;
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const applications = await Application.find(query)
    .populate('applicantId', 'firstName lastName email phone avatar profile')
    .populate('jobId', 'title company location jobType salary')
    .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Application.countDocuments(query);

  // Get summary stats
  const stats = await Application.aggregate([
    { $match: { employerId: require('mongoose').Types.ObjectId(employerId) } },
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
    applications: applications.map((app) => ({
      id: app._id,
      job: app.jobId,
      applicant: app.applicantId,
      status: app.status,
      coverLetter: app.coverLetter,
      resumeUrl: app.resumeUrl,
      expectedSalary: app.expectedSalary,
      rating: app.rating,
      appliedAt: app.appliedAt,
      updatedAt: app.updatedAt,
      interview: app.interview || null,
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

  if (application.employerId.toString() !== employerId) {
    return ApiResponse.forbidden(res, 'You can only schedule interviews for your own jobs');
  }

  if (application.status === 'withdrawn') {
    return ApiResponse.badRequest(res, 'Cannot schedule interview for a withdrawn application');
  }

  // Set interview details
  application.interview = {
    scheduledAt: new Date(scheduledAt),
    type: type || 'video', // video, phone, in-person
    location: location || '',
    meetingLink: meetingLink || '',
    notes: notes || '',
    duration: duration || 60, // minutes
    status: 'scheduled',
    createdAt: new Date(),
  };

  // Update application status to interview
  application.status = 'interview';
  application.updatedAt = new Date();
  await application.save();

  // Populate for notifications
  await application.populate([
    { path: 'jobId', select: 'title' },
    { path: 'applicantId', select: 'firstName lastName email notificationSettings' },
  ]);

  // Notify applicant
  await Notification.create({
    userId: application.applicantId._id,
    type: 'interview_scheduled',
    title: 'Interview Scheduled',
    message: `You have been scheduled for an interview for "${application.jobId.title}"`,
    data: {
      applicationId: application._id,
      jobId: application.jobId._id,
      interview: application.interview,
    },
  });

  // Send email
  try {
    if (application.applicantId.notificationSettings?.emailNotifications !== false) {
      await emailService.sendInterviewInvitation(application.applicantId.email, {
        applicantName: `${application.applicantId.firstName} ${application.applicantId.lastName}`,
        jobTitle: application.jobId.title,
        scheduledAt: application.interview.scheduledAt,
        type: application.interview.type,
        location: application.interview.location,
        meetingLink: application.interview.meetingLink,
        notes: application.interview.notes,
        duration: application.interview.duration,
      });
    }
  } catch (emailErr) {
    console.error('Failed to send interview email:', emailErr.message);
  }

  return ApiResponse.success(res, 200, 'Interview scheduled successfully', {
    application: {
      id: application._id,
      status: application.status,
      interview: application.interview,
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

  if (application.employerId.toString() !== employerId) {
    return ApiResponse.forbidden(res, 'You can only rate applications for your own jobs');
  }

  application.rating = {
    score: ratingNum,
    review: review || '',
    ratedAt: new Date(),
  };
  application.updatedAt = new Date();
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
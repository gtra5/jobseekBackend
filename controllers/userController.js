/**
 * User Controller
 * Handles user profile management and updates
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const User = require('../models/User');
const PROFESSIONS = require('../constants/professions');
const { generateUploadUrl, deleteFileByKey } = require('../services/uploadService');
const { purgeUser } = require('../services/cleanupService');

/**
 * GET /api/users/:id
 * Get user by ID — authenticated, returns full (non-sensitive) document.
 * Only used internally (e.g. the current user fetching their own data).
 */
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id).select('-password');

  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  return ApiResponse.success(res, 200, 'User retrieved successfully', { user });
});

/**
 * GET /api/users/:id/public
 * Public profile endpoint — safe for any authenticated user (employer, jobseeker, admin).
 * Strips all PII that is not intended to be public:
 *   - password (always excluded)
 *   - phone (private contact detail)
 *   - notificationSettings (internal preference)
 *   - email (private — employers contact via in-app chat, not direct email)
 *   - isDeleted, deletedAt, isActive (internal flags)
 * Returns only: name, avatar, headline, skills, professions, verifiedSkills,
 * preferredJobTypes, portfolioUrl, linkedinUrl, githubUrl, role,
 * and (for employers) company name + logo + industry.
 */
const getPublicProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findOne({ _id: id, isDeleted: false }).select(
    'firstName lastName avatar role professions ' +
    'profile.headline profile.skills profile.verifiedSkills ' +
    'profile.portfolioUrl profile.linkedinUrl profile.githubUrl ' +
    'profile.preferredJobTypes profile.primaryCategory ' +
    'company.name company.logo company.industry company.website ' +
    'createdAt'
  );

  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  return ApiResponse.success(res, 200, 'Public profile retrieved successfully', {
    profile: user,
  });
});

/**
 * PATCH /api/users/me/professions
 * Update the current user's saved professions (multi-select interests used to
 * personalize their default job feed).
 */
const updateProfessions = asyncHandler(async (req, res) => {
  const { professions } = req.body;

  if (!Array.isArray(professions)) {
    return ApiResponse.badRequest(res, 'professions must be an array');
  }

  const invalid = professions.filter((p) => !PROFESSIONS.includes(p));
  if (invalid.length > 0) {
    return ApiResponse.badRequest(res, `Invalid professions: ${invalid.join(', ')}`);
  }

  const user = await User.findById(req.userId);

  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  user.professions = [...new Set(professions)];
  await user.save();

  return ApiResponse.success(res, 200, 'Professions updated successfully', {
    professions: user.professions,
  });
});

/**
 * PUT /api/users/profile
 * Update user profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone } = req.body;

  const user = await User.findById(req.userId);

  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  // Update basic info
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (phone !== undefined) user.phone = phone;

  await user.save();

  user.password = undefined;

  return ApiResponse.success(res, 200, 'Profile updated successfully', { user });
});

/**
 * PUT /api/users/jobseeker-profile
 * Update job seeker profile
 */
const updateJobSeekerProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  if (user.role !== 'jobseeker') {
    return ApiResponse.forbidden(res, 'Only job seekers can update job seeker profile');
  }

  const {
    headline,
    skills,
    experience,
    education,
    portfolioUrl,
    linkedinUrl,
    githubUrl,
    preferredJobTypes,
    preferredLocations,
    expectedSalary,
    primaryCategory,
  } = req.body;

  // Update job seeker specific fields
  if (headline !== undefined) user.profile.headline = headline;
  if (skills !== undefined) user.profile.skills = skills;
  if (experience !== undefined) user.profile.experience = experience;
  if (education !== undefined) user.profile.education = education;
  if (portfolioUrl !== undefined) user.profile.portfolioUrl = portfolioUrl;
  if (linkedinUrl !== undefined) user.profile.linkedinUrl = linkedinUrl;
  if (githubUrl !== undefined) user.profile.githubUrl = githubUrl;
  if (preferredJobTypes !== undefined) user.profile.preferredJobTypes = preferredJobTypes;
  if (preferredLocations !== undefined) user.profile.preferredLocations = preferredLocations;
  if (expectedSalary !== undefined) user.profile.expectedSalary = expectedSalary;
  if (primaryCategory !== undefined) user.profile.primaryCategory = primaryCategory;

  await user.save();

  user.password = undefined;

  return ApiResponse.success(res, 200, 'Job seeker profile updated successfully', { user });
});

/**
 * PUT /api/users/employer-profile
 * Update employer profile
 */
const updateEmployerProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  if (user.role !== 'employer') {
    return ApiResponse.forbidden(res, 'Only employers can update employer profile');
  }

  const {
    name,
    industry,
    companySize,
    website,
    description,
    foundedYear,
    location,
  } = req.body;

  // Update employer specific fields
  if (name !== undefined) user.company.name = name;
  if (industry !== undefined) user.company.industry = industry;
  if (companySize !== undefined) user.company.companySize = companySize;
  if (website !== undefined) user.company.website = website;
  if (description !== undefined) user.company.description = description;
  if (foundedYear !== undefined) user.company.foundedYear = foundedYear;
  if (location !== undefined) user.company.location = location;

  await user.save();

  user.password = undefined;

  return ApiResponse.success(res, 200, 'Employer profile updated successfully', { user });
});

/**
 * PUT /api/users/notification-settings
 * Update notification settings
 */
const updateNotificationSettings = asyncHandler(async (req, res) => {
  const { email, push } = req.body;

  const user = await User.findById(req.userId);

  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  if (email) {
    user.notificationSettings.email = { ...user.notificationSettings.email, ...email };
  }

  if (push) {
    user.notificationSettings.push = { ...user.notificationSettings.push, ...push };
  }

  await user.save();

  user.password = undefined;

  return ApiResponse.success(res, 200, 'Notification settings updated successfully', {
    notificationSettings: user.notificationSettings,
  });
});

/**
 * PUT /api/users/avatar
 * Upload / replace user avatar
 */
const updateAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  if (!req.file) {
    return ApiResponse.badRequest(res, 'No avatar file provided');
  }

  // Generate presigned upload URL for the avatar
  const { uploadUrl, fileKey, publicUrl } = await generateUploadUrl(
    req.file.originalname,
    req.file.mimetype,
    'avatars'
  );

  // Delete old avatar from S3 if one exists
  const currentAvatar = user.avatar;
  if (currentAvatar && currentAvatar.includes('amazonaws.com')) {
    const oldFileKey = currentAvatar.split('.amazonaws.com/')[1];
    await deleteFileByKey(oldFileKey);
  }

  user.avatar = publicUrl;
  user.avatarKey = fileKey;
  await user.save();

  user.password = undefined;

  return ApiResponse.success(res, 200, 'Avatar updated successfully', { 
    user,
    uploadUrl,
    fileKey
  });
});

/**
 * PUT /api/users/resume
 * Upload / replace job seeker resume
 */
const updateResume = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  if (user.role !== 'jobseeker') {
    return ApiResponse.forbidden(res, 'Only job seekers can upload a resume');
  }

  if (!req.file) {
    return ApiResponse.badRequest(res, 'No resume file provided');
  }

  // Generate presigned upload URL for the resume
  const { uploadUrl, fileKey, publicUrl } = await generateUploadUrl(
    req.file.originalname,
    req.file.mimetype,
    'resumes'
  );

  // Delete old resume from S3 if one exists
  if (user.profile?.resume?.fileKey) {
    await deleteFileByKey(user.profile.resume.fileKey);
  }

  user.profile.resume = {
    url: publicUrl,
    fileKey,
    uploadedAt: new Date(),
  };
  await user.save();

  user.password = undefined;

  return ApiResponse.success(res, 200, 'Resume uploaded successfully', {
    resume: user.profile.resume,
    uploadUrl,
    fileKey
  });
});

/**
 * PUT /api/users/company-logo
 * Upload / replace employer company logo
 */
const updateCompanyLogo = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  if (user.role !== 'employer') {
    return ApiResponse.forbidden(res, 'Only employers can upload a company logo');
  }

  if (!req.file) {
    return ApiResponse.badRequest(res, 'No logo file provided');
  }

  // Generate presigned upload URL for the company logo
  const { uploadUrl, fileKey, publicUrl } = await generateUploadUrl(
    req.file.originalname,
    req.file.mimetype,
    'company-logos'
  );

  // Delete old logo from S3 if one exists
  if (user.company?.logo?.fileKey) {
    await deleteFileByKey(user.company.logo.fileKey);
  }

  user.company.logo = { url: publicUrl, fileKey };
  await user.save();

  user.password = undefined;

  return ApiResponse.success(res, 200, 'Company logo updated successfully', {
    logo: user.company.logo,
    uploadUrl,
    fileKey
  });
});

/**
 * DELETE /api/users/avatar
 * Delete user avatar
 */
const deleteAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  if (user.avatar) {
    // Delete from S3 if it's an S3 URL
    if (user.avatar.includes('amazonaws.com') && user.avatarKey) {
      await deleteFileByKey(user.avatarKey);
    }

    user.avatar = null;
    user.avatarKey = null;
    await user.save();
  }

  user.password = undefined;

  return ApiResponse.success(res, 200, 'Avatar deleted successfully', { user });
});

/**
 * DELETE /api/users/account
 * Delete user account
 */
const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;

  const user = await User.findById(req.userId).select('+password');

  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return ApiResponse.unauthorized(res, 'Invalid password');
  }

  // Soft delete
  user.isDeleted = true;
  user.isActive = false;
  user.deletedAt = new Date();
  user.email = `${user.email}-deleted-${Date.now()}`;
  await user.save();

  return ApiResponse.success(res, 200, 'Account deleted successfully');
});

/**
 * POST /api/users/account/permanent
 * On-demand permanent account deletion for verified erasure requests.
 * Requires the account password. Bypasses the soft-delete grace period and
 * immediately removes the user and their dependent records. Irreversible.
 */
const deleteAccountPermanent = asyncHandler(async (req, res) => {
  const { password } = req.body;

  const user = await User.findById(req.userId).select('+password');

  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return ApiResponse.unauthorized(res, 'Invalid password');
  }

  await purgeUser(user);

  return ApiResponse.success(res, 200, 'Account permanently deleted');
});

/**
 * DELETE /api/admin/users/:userId/account
 * Admin-triggered immediate hard-delete of a user's account and dependent
 * records, for verified erasure requests. Irreversible and bypasses the
 * soft-delete grace period.
 */
const hardDeleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const target = await User.findById(userId).select('role');

  if (!target) {
    return ApiResponse.notFound(res, 'User not found');
  }

  if (target.role === 'admin') {
    return ApiResponse.forbidden(res, 'Admin accounts cannot be permanently deleted');
  }

  await purgeUser(userId);

  return ApiResponse.success(res, 200, 'Account permanently deleted');
});

module.exports = {
  getUserById,
  getPublicProfile,
  updateProfile,
  updateProfessions,
  updateJobSeekerProfile,
  updateEmployerProfile,
  updateNotificationSettings,
  updateAvatar,
  updateResume,
  updateCompanyLogo,
  deleteAvatar,
  deleteAccount,
  deleteAccountPermanent,
  hardDeleteUser,
};

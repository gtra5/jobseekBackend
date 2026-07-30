/**
 * User Controller
 * Handles user profile management and updates
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const User = require('../models/User');
const { deleteFromCloudinary } = require('../config/cloudinary');

/**
 * GET /api/users/:id
 * Get user by ID
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
 * DELETE /api/users/avatar
 * Delete user avatar
 */
const deleteAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  if (user.avatar) {
    // Delete from Cloudinary if it's a Cloudinary URL
    if (user.avatar.includes('cloudinary')) {
      // Extract public ID from URL
      const publicId = user.avatar.split('/').pop().split('.')[0];
      await deleteFromCloudinary(`avatars/${publicId}`);
    }

    user.avatar = null;
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
  user.email = `${user.email}-deleted-${Date.now()}`;
  await user.save();

  return ApiResponse.success(res, 200, 'Account deleted successfully');
});

module.exports = {
  getUserById,
  updateProfile,
  updateJobSeekerProfile,
  updateEmployerProfile,
  updateNotificationSettings,
  deleteAvatar,
  deleteAccount,
};

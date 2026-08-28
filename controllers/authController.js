/**
 * Authentication Controller
 * Handles user registration, login, password reset, and email verification
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const { logAuthEvent } = require('../utils/logger');
const User = require('../models/User');
const OTP = require('../models/OTP');
const RefreshToken = require('../models/RefreshToken');
const otpService = require('../services/otpService');
const emailService = require('../services/emailService');

/**
 * POST /api/auth/register
 * Register a new user
 */
const register = asyncHandler(async (req, res) => {
  const { email, password, role, firstName, lastName } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return ApiResponse.conflict(res, 'User with this email already exists');
  }

  // Create new user
  const user = await User.create({
    email: email.toLowerCase(),
    password,
    role,
    firstName,
    lastName,
  });

  // Generate tokens
  const accessToken = generateAccessToken({ id: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id });

  // Store refresh token in database
  await RefreshToken.create({
    token: refreshToken,
    userId: user._id,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  // Send OTP for email verification. This is intentionally non-fatal:
  // account creation must succeed even if the email provider is down or
  // misconfigured — otherwise the user is left with an account that was
  // created (so re-registering 409s) but never got a success response.
  // The user can request a fresh OTP later via /resend-otp.
  try {
    await otpService.generateAndSendOTP(user._id, user.email, 'email_verification', req.ip);
  } catch (otpError) {
    console.error('Failed to send verification OTP during registration:', otpError.message);
  }

  // Remove password from response
  user.password = undefined;

  // Set access token as httpOnly cookie (short-lived for security)
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  // Set refresh token as httpOnly cookie (long-lived)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  return ApiResponse.created(res, 'User registered successfully. Please verify your email.', {
    accessToken,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      isVerified: user.isVerified,
    },
  });
});

/**
 * POST /api/auth/login
 * Login user
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user and include password for comparison
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    return ApiResponse.unauthorized(res, 'Invalid email or password');
  }

  // Check if user is active
  if (!user.isActive || user.isDeleted) {
    return ApiResponse.unauthorized(res, 'Account is inactive or deleted');
  }

  // Compare password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    logAuthEvent.loginFailure(email, req.ip, req.headers['user-agent'], 'Invalid password');
    return ApiResponse.unauthorized(res, 'Invalid email or password');
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate tokens
  const accessToken = generateAccessToken({ id: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id });

  // Store refresh token in database
  await RefreshToken.create({
    token: refreshToken,
    userId: user._id,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  // Remove password from response
  user.password = undefined;

  // Set access token as httpOnly cookie (short-lived for security)
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  // Set refresh token as httpOnly cookie (long-lived)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  logAuthEvent.loginSuccess(user._id, user.email, req.ip, req.headers['user-agent']);

  // Return accessToken in body so frontend can attach it as a Bearer header.
  // It is also set as an httpOnly cookie for added security.
  return ApiResponse.success(res, 200, 'Login successful', {
    accessToken,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      isVerified: user.isVerified,
      profileCompletion: user.getProfileCompletion(),
    },
  });
});

/**
 * POST /api/auth/logout
 * Logout user (revoke refresh token)
 */
const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    // Revoke the refresh token from database
    await RefreshToken.findOneAndUpdate(
      { token: refreshToken },
      { revoked: true, revokedAt: new Date() }
    );
  }

  // Clear the httpOnly cookies
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });

  logAuthEvent.logout(req.user?.id, req.ip, req.headers['user-agent']);

  return ApiResponse.success(res, 200, 'Logout successful');
});

/**
 * POST /api/auth/refresh-token
 * Refresh access token using refresh token from httpOnly cookie
 */
const refreshToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return ApiResponse.unauthorized(res, 'Refresh token is required');
  }

  try {
    const { verifyToken } = require('../utils/generateToken');
    const decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Check if refresh token exists in database and is not revoked
    const storedToken = await RefreshToken.findOne({
      token: refreshToken,
      revoked: false
    });

    if (!storedToken || !storedToken.isValid()) {
      return ApiResponse.unauthorized(res, 'Invalid or expired refresh token');
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive || user.isDeleted) {
      return ApiResponse.unauthorized(res, 'Invalid refresh token');
    }

    // Generate new access token
    const newAccessToken = generateAccessToken({ id: user._id, role: user.role });

    logAuthEvent.tokenRefresh(user._id, req.ip);

    return ApiResponse.success(res, 200, 'Token refreshed successfully', {
      accessToken: newAccessToken,
    });
  } catch (error) {
    return ApiResponse.unauthorized(res, 'Invalid or expired refresh token');
  }
});

/**
 * POST /api/auth/forgot-password
 * Send password reset OTP
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Don't reveal if user exists for security
    logAuthEvent.passwordResetRequested(email, req.ip);
    return ApiResponse.success(res, 200, 'If the email exists, a reset code has been sent');
  }

  // Generate and send OTP
  await otpService.generateAndSendOTP(user._id, user.email, 'password_reset');

  logAuthEvent.passwordResetRequested(email, req.ip);

  return ApiResponse.success(res, 200, 'If the email exists, a reset code has been sent');
});

/**
 * POST /api/auth/reset-password
 * Reset password using OTP
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  // Verify OTP
  try {
    await otpService.verifyOTP(email, otp, 'password_reset');
  } catch (err) {
    return ApiResponse.badRequest(res, err.message || 'Invalid or expired OTP');
  }

  // Revoke all refresh tokens for this user (security best practice on password change)
  await RefreshToken.updateMany(
    { userId: user._id, revoked: false },
    { revoked: true, revokedAt: new Date() }
  );

  // Update password
  user.password = newPassword;
  await user.save();

  // Delete used OTP
  await OTP.deleteMany({ userId: user._id, type: 'password_reset' });

  logAuthEvent.passwordResetSuccess(user._id, user.email, req.ip);

  return ApiResponse.success(res, 200, 'Password reset successful');
});

/**
 * POST /api/auth/verify-email
 * Verify email using OTP
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  // Verify OTP
  try {
    await otpService.verifyOTP(email, otp, 'email_verification');
  } catch (err) {
    return ApiResponse.badRequest(res, err.message || 'Invalid or expired OTP');
  }

  // Mark user as verified
  user.isVerified = true;
  user.isEmailVerified = true;
  await user.save();

  // Delete used OTP
  await OTP.deleteMany({ userId: user._id, type: 'email_verification' });

  return ApiResponse.success(res, 200, 'Email verified successfully');
});

/**
 * POST /api/auth/resend-otp
 * Resend OTP for email verification or password reset
 */
const resendOTP = asyncHandler(async (req, res) => {
  const { email, type } = req.body;

  const validTypes = ['email_verification', 'password_reset'];
  if (!validTypes.includes(type)) {
    return ApiResponse.badRequest(res, 'Invalid OTP type');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  // Generate and send new OTP
  await otpService.generateAndSendOTP(user._id, user.email, type);

  return ApiResponse.success(res, 200, 'OTP sent successfully');
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select('-password');

  if (!user) {
    return ApiResponse.notFound(res, 'User not found');
  }

  return ApiResponse.success(res, 200, 'User profile retrieved', {
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      isVerified: user.isVerified,
      profileCompletion: user.getProfileCompletion(),
      profile: user.profile,
      company: user.company,
      notificationSettings: user.notificationSettings,
    },
  });
});

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendOTP,
  getMe,
};
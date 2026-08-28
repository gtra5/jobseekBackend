/**
 * Authentication Controller
 * Handles user registration, login, password reset, and email verification
 */

const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/apiResponse");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateToken");
const { logAuthEvent } = require("../utils/logger");
const User = require("../models/User");
const OTP = require("../models/OTP");
const RefreshToken = require("../models/RefreshToken");
const otpService = require("../services/otpService");
const emailService = require("../services/emailService");

/**
 * POST /api/auth/register
 * Register a new user
 */
const register = asyncHandler(async (req, res) => {
  const { email, password, role, firstName, lastName } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return ApiResponse.conflict(res, "User with this email already exists");
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
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  });

  // Send OTP for email verification. This is intentionally non-fatal AND
  // intentionally NOT awaited: account creation must succeed even if the
  // email provider is down, misconfigured, or slow to respond — otherwise
  // the user is left staring at a spinner (or a false "Registration failed"
  // once the client's own request timeout fires) while an account that
  // already exists silently sits there (so a retry just 409s). Firing this
  // without awaiting means the HTTP response below goes out immediately,
  // regardless of how long email delivery takes. The user can request a
  // fresh OTP later via /resend-otp if this send fails or is delayed.
  otpService
    .generateAndSendOTP(user._id, user.email, "email_verification", req.ip)
    .catch((otpError) => {
      console.error(
        "Failed to send verification OTP during registration:",
        otpError.message,
      );
    });

  // Remove password from response
  user.password = undefined;

// Cookie settings differ by environment:
// - Production (Render → Vercel): cross-origin, HTTPS only
//   → secure: true, sameSite: 'none'  (sameSite 'none' REQUIRES secure: true)
// - Development (localhost): same-origin loopback
//   → secure: false, sameSite: 'lax'
const isProduction = process.env.NODE_ENV === 'production';
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
};

  // Set access token as httpOnly cookie (short-lived)
  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  // Set refresh token as httpOnly cookie (long-lived)
  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  return ApiResponse.created(
    res,
    'User registered successfully. Please verify your email.',
    {
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
      },
    },
  );
});

/**
 * POST /api/auth/login
 * Login user
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user and include password for comparison
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password",
  );

  if (!user) {
    return ApiResponse.unauthorized(res, "Invalid email or password");
  }

  // Check if user is active
  if (!user.isActive || user.isDeleted) {
    return ApiResponse.unauthorized(res, "Account is inactive or deleted");
  }

  // Compare password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    logAuthEvent.loginFailure(
      email,
      req.ip,
      req.headers["user-agent"],
      "Invalid password",
    );
    return ApiResponse.unauthorized(res, "Invalid email or password");
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
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  });

  // Remove password from response
  user.password = undefined;

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  };

  // Set access token as httpOnly cookie (short-lived)
  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  // Set refresh token as httpOnly cookie (long-lived)
  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  logAuthEvent.loginSuccess(
    user._id,
    user.email,
    req.ip,
    req.headers['user-agent'],
  );

  // Return accessToken in body so frontend can attach it as a Bearer header.
  // It is also set as an httpOnly cookie for added security.
  return ApiResponse.success(res, 200, "Login successful", {
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
 * Logout user — always succeeds (200) regardless of token state.
 * This route has NO authenticate middleware so a user with an expired
 * access token can still clear their session properly.
 */
const logout = asyncHandler(async (req, res) => {
  // Try to revoke the refresh token from DB, but never fail if it's missing
  try {
    const incomingRefreshToken = req.cookies.refreshToken;
    if (incomingRefreshToken) {
      await RefreshToken.findOneAndUpdate(
        { token: incomingRefreshToken },
        { revoked: true, revokedAt: new Date() },
      );
    }
  } catch (dbError) {
    // Non-fatal — the cookies will be cleared below regardless
    console.error('Logout: could not revoke refresh token in DB:', dbError.message);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const clearOptions = {
    httpOnly: true,
    secure: isProduction,
    // sameSite must match the Set-Cookie options used when the cookie was set,
    // otherwise browsers silently ignore the clearCookie instruction
    sameSite: isProduction ? 'none' : 'lax',
  };

  res.clearCookie('accessToken', clearOptions);
  res.clearCookie('refreshToken', clearOptions);

  // Log using optional chaining — req.user may be undefined since there's no auth middleware
  logAuthEvent.logout(req.user?.id, req.ip, req.headers['user-agent']);

  return ApiResponse.success(res, 200, 'Logout successful');
});

/**
 * POST /api/auth/refresh-token
 * Refresh access token using refresh token from httpOnly cookie.
 * All error paths return 401 JSON — never a 500.
 */
const refreshToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken;

  if (!incomingRefreshToken) {
    return ApiResponse.unauthorized(res, 'Refresh token is required');
  }

  let decoded;
  try {
    const { verifyToken } = require('../utils/generateToken');
    // verifyToken throws JsonWebTokenError / TokenExpiredError on bad input —
    // catching here converts those into clean 401 responses instead of 500s
    decoded = verifyToken(incomingRefreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (jwtError) {
    return ApiResponse.unauthorized(res, 'Invalid or expired refresh token');
  }

  // Check the token exists in DB and hasn't been revoked
  const storedToken = await RefreshToken.findOne({
    token: incomingRefreshToken,
    revoked: false,
  });

  if (!storedToken || !storedToken.isValid()) {
    return ApiResponse.unauthorized(res, 'Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive || user.isDeleted) {
    return ApiResponse.unauthorized(res, 'Invalid refresh token');
  }

  // Issue a new access token
  const newAccessToken = generateAccessToken({ id: user._id, role: user.role });

  // Also refresh the access-token cookie so browser-based flows stay in sync
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('accessToken', newAccessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  logAuthEvent.tokenRefresh(user._id, req.ip);

  return ApiResponse.success(res, 200, 'Token refreshed successfully', {
    accessToken: newAccessToken,
  });
});

/**
 * POST /api/auth/forgot-password
 * Send password reset OTP — fire-and-forget email, always returns 200
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Always return the same message whether the user exists or not,
  // so attackers can't use this endpoint to enumerate accounts
  const genericResponse = ApiResponse.success(
    res,
    200,
    'If the email exists, a reset code has been sent',
  );

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    logAuthEvent.passwordResetRequested(email, req.ip);
    return genericResponse;
  }

  // Fire-and-forget — same pattern as register and resend-otp
  otpService
    .generateAndSendOTP(user._id, user.email, 'password_reset', req.ip)
    .catch((err) => {
      console.error(`[forgot-password] Failed to send reset OTP to ${user.email}:`, err.message);
    });

  logAuthEvent.passwordResetRequested(email, req.ip);

  return genericResponse;
});

/**
 * POST /api/auth/reset-password
 * Reset password using OTP
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return ApiResponse.notFound(res, "User not found");
  }

  // Verify OTP
  try {
    await otpService.verifyOTP(email, otp, "password_reset");
  } catch (err) {
    return ApiResponse.badRequest(res, err.message || "Invalid or expired OTP");
  }

  // Revoke all refresh tokens for this user (security best practice on password change)
  await RefreshToken.updateMany(
    { userId: user._id, revoked: false },
    { revoked: true, revokedAt: new Date() },
  );

  // Update password
  user.password = newPassword;
  await user.save();

  // Delete used OTP
  await OTP.deleteMany({ userId: user._id, type: "password_reset" });

  logAuthEvent.passwordResetSuccess(user._id, user.email, req.ip);

  return ApiResponse.success(res, 200, "Password reset successful");
});

/**
 * POST /api/auth/verify-email
 * Verify email using OTP
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return ApiResponse.notFound(res, "User not found");
  }

  // Verify OTP
  try {
    await otpService.verifyOTP(email, otp, "email_verification");
  } catch (err) {
    return ApiResponse.badRequest(res, err.message || "Invalid or expired OTP");
  }

  // Mark user as verified
  user.isVerified = true;
  user.isEmailVerified = true;
  await user.save();

  // Delete used OTP
  await OTP.deleteMany({ userId: user._id, type: "email_verification" });

  return ApiResponse.success(res, 200, "Email verified successfully");
});

/**
 * POST /api/auth/resend-otp
 * Resend OTP for email verification or password reset.
 *
 * Email delivery is intentionally fire-and-forget (same as /register):
 * the OTP record is always created in the DB and the endpoint always
 * returns 200. If the email provider fails on Render (bad credentials,
 * SMTP timeout, etc.) the user can still verify manually via support —
 * and critically, a misconfigured email transport never causes a 500 here.
 */
const resendOTP = asyncHandler(async (req, res) => {
  const { email, type } = req.body;

  // Validate the OTP type up front — return 400 for invalid values
  const validTypes = ['email_verification', 'password_reset'];
  if (!type || !validTypes.includes(type)) {
    return ApiResponse.badRequest(
      res,
      `Invalid OTP type. Must be one of: ${validTypes.join(', ')}`,
    );
  }

  if (!email) {
    return ApiResponse.badRequest(res, 'Email is required');
  }

  // Look up the user — return 404 if not found
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Don't reveal whether the account exists for security
    // But we still return 200 so attackers can't enumerate emails
    return ApiResponse.success(res, 200, 'If the account exists, a new code has been sent');
  }

  // Fire-and-forget — the OTP record is written to the DB synchronously
  // inside generateAndSendOTP → createOTP, so it's always available to verify.
  // The email send is the only part that can fail externally; we never want
  // that to surface as a 500 to the user.
  otpService
    .generateAndSendOTP(user._id, user.email, type, req.ip)
    .catch((err) => {
      // Log for Render dashboard visibility but do NOT propagate
      console.error(`[resend-otp] Failed to send OTP email to ${user.email}:`, err.message);
    });

  return ApiResponse.success(res, 200, 'OTP sent successfully');
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select("-password");

  if (!user) {
    return ApiResponse.notFound(res, "User not found");
  }

  return ApiResponse.success(res, 200, "User profile retrieved", {
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

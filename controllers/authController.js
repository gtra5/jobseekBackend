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
 * POST /api/auth/pre-register
 * Step 1 of registration: validate inputs, check email availability,
 * hash the password, store everything as pendingData inside an OTP record,
 * and send the verification code.
 *
 * No User document is created here — the DB stays clean until the OTP
 * is actually verified in POST /api/auth/register (step 2).
 */
const preRegister = asyncHandler(async (req, res) => {
  const { email, password, role, firstName, lastName } = req.body;

  const normalizedEmail = email.toLowerCase();

  // Reject immediately if the email is already taken by a verified account
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return ApiResponse.conflict(res, 'User with this email already exists');
  }

  // Hash the password now so we never store a plain-text password anywhere,
  // even temporarily in the OTP record.
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Package up everything needed to create the User after OTP verification
  const pendingData = {
    email: normalizedEmail,
    password: hashedPassword,  // already hashed — safe to store
    role,
    firstName,
    lastName,
  };

  // Unlike the completed-registration flow (where the account already
  // exists and the email is a bonus), this send IS awaited: no account
  // exists yet, so the OTP email is the entire deliverable of this
  // request. If it fails, the frontend needs a real error to show the
  // user instead of a false "check your email" for a code that never
  // arrives. The 10s connection/greeting/socket timeouts configured on
  // the transporter in otpService keep this from hanging indefinitely.
  try {
    await otpService.generateAndSendOTP(null, normalizedEmail, 'registration', req.ip, pendingData);
  } catch (err) {
    console.error('[pre-register] Failed to send OTP email:', err.message);
    return ApiResponse.badRequest(
      res,
      err.message || 'Failed to send verification code. Please try again.'
    );
  }

  return ApiResponse.success(res, 200, 'Verification code sent. Please check your email.', {
    email: normalizedEmail,
  });
});

/**
 * POST /api/auth/register
 * Step 2 of registration: verify the OTP, then create the User document
 * using the pendingData stored in the OTP record. Issues auth tokens on success.
 */
const register = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const normalizedEmail = email.toLowerCase();

  // Double-check the email isn't taken (race-condition guard)
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return ApiResponse.conflict(res, 'User with this email already exists');
  }

  // Verify the OTP — throws with a user-friendly message on failure
  let otpRecord;
  try {
    otpRecord = await otpService.verifyOTP(normalizedEmail, otp, 'registration');
  } catch (err) {
    return ApiResponse.badRequest(res, err.message || 'Invalid or expired OTP');
  }

  // Retrieve the registration data that was stored at pre-register time
  const pending = otpRecord.pendingData;
  if (!pending) {
    return ApiResponse.badRequest(res, 'Registration data not found. Please start registration again.');
  }

  // Create the User — password is already hashed, skip the pre-save hook
  // by using insertOne / create with the hashed value directly.
  // We bypass Mongoose's pre-save hook to avoid double-hashing.
  const UserModel = User;
  const user = new UserModel({
    email: pending.email,
    password: pending.password,   // already bcrypt-hashed
    role: pending.role,
    firstName: pending.firstName,
    lastName: pending.lastName,
    isVerified: true,             // OTP was just verified — mark immediately
    isEmailVerified: true,
  });

  // Skip the password pre-save hook since the password is already hashed
  user.$locals = user.$locals || {};
  user.$locals.skipPasswordHash = true;
  await user.save();

  // Clean up the OTP record
  await OTP.deleteOne({ _id: otpRecord._id });

  // Issue tokens
  const accessToken = generateAccessToken({ id: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id });

  await RefreshToken.create({
    token: refreshToken,
    userId: user._id,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  user.password = undefined;

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  };

  res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });

  return ApiResponse.created(res, 'Account created successfully.', {
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
 * Resend OTP for registration, email verification, or password reset.
 * Fire-and-forget email — always returns 200 regardless of email delivery.
 */
const resendOTP = asyncHandler(async (req, res) => {
  const { email, type } = req.body;

  const validTypes = ['registration', 'email_verification', 'password_reset'];
  if (!type || !validTypes.includes(type)) {
    return ApiResponse.badRequest(
      res,
      `Invalid OTP type. Must be one of: ${validTypes.join(', ')}`,
    );
  }

  if (!email) {
    return ApiResponse.badRequest(res, 'Email is required');
  }

  const normalizedEmail = email.toLowerCase();

  if (type === 'registration') {
    // For pending registrations, no User doc exists yet.
    // Find the existing OTP record to get the pendingData, then issue a new OTP.
    const existingOTP = await OTP.findOne({
      email: normalizedEmail,
      purpose: 'registration',
      isVerified: false,
    }).sort({ createdAt: -1 });

    if (!existingOTP || !existingOTP.pendingData) {
      // No pending registration found — return generic 200 to avoid enumeration
      return ApiResponse.success(res, 200, 'If a pending registration exists, a new code has been sent');
    }

    // Re-use the pendingData from the existing OTP record. Awaited for the
    // same reason as preRegister: this email IS the deliverable, and the
    // pending-registration existence check above already means there's no
    // enumeration concern left to protect by staying fire-and-forget here.
    try {
      await otpService.generateAndSendOTP(null, normalizedEmail, 'registration', req.ip, existingOTP.pendingData);
    } catch (err) {
      console.error(`[resend-otp/registration] Failed for ${normalizedEmail}:`, err.message);
      return ApiResponse.badRequest(
        res,
        err.message || 'Failed to resend verification code. Please try again.'
      );
    }

    return ApiResponse.success(res, 200, 'New verification code sent');
  }

  // For email_verification and password_reset — user must already exist
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return ApiResponse.success(res, 200, 'If the account exists, a new code has been sent');
  }

  otpService
    .generateAndSendOTP(user._id, user.email, type, req.ip)
    .catch((err) => {
      console.error(`[resend-otp/${type}] Failed for ${user.email}:`, err.message);
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
  preRegister,
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
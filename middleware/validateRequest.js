/**
 * Request Validation Middleware
 * Validates incoming requests using express-validator
 */

const { validationResult, body, param, query } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');
const { validateEmail, validatePassword, validateName } = require('../utils/validators');

/**
 * Middleware to check validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
    }));
    
    return ApiResponse.validationError(res, 'Validation failed', formattedErrors);
  }
  
  next();
};

/**
 * Common validation rules
 */
const commonValidators = {
  email: () => body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  password: () => body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .custom((value) => {
      const validation = validatePassword(value);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      return true;
    }),
  
  name: (field) => body(field)
    .trim()
    .notEmpty()
    .withMessage(`${field} is required`)
    .isLength({ min: 2, max: 50 })
    .withMessage(`${field} must be between 2 and 50 characters`)
    .custom((value) => {
      if (!validateName(value)) {
        throw new Error(`${field} can only contain letters, spaces, hyphens, and apostrophes`);
      }
      return true;
    }),
  
  phone: () => body('phone')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  mongoId: (paramName) => param(paramName)
    .notEmpty()
    .withMessage(`${paramName} is required`)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`),
  
  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
  ],
};

/**
 * Auth validation rules
 */
const authValidators = {
  // Step 1 — validates the signup form fields before any DB write
  preRegister: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail()
      .custom((value) => {
        if (!validateEmail(value)) throw new Error('Invalid email format');
        return true;
      }),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .custom((value) => {
        const validation = validatePassword(value);
        if (!validation.isValid) throw new Error(validation.errors.join(', '));
        return true;
      }),
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters')
      .custom((value) => {
        if (value && !validateName(value))
          throw new Error('First name can only contain letters, spaces, hyphens, and apostrophes');
        return true;
      }),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters')
      .custom((value) => {
        if (value && !validateName(value))
          throw new Error('Last name can only contain letters, spaces, hyphens, and apostrophes');
        return true;
      }),
    body('role')
      .notEmpty().withMessage('Role is required')
      .isIn(['jobseeker', 'employer']).withMessage('Role must be either jobseeker or employer'),
    validate,
  ],

  // Step 2 — verifies OTP and completes account creation
  register: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('otp')
      .notEmpty().withMessage('OTP is required')
      .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
      .isNumeric().withMessage('OTP must contain only numbers'),
    validate,
  ],
  
  login: [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail()
      .custom((value) => {
        if (!validateEmail(value)) {
          throw new Error('Invalid email format');
        }
        return true;
      }),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    validate,
  ],
  
  forgotPassword: [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail()
      .custom((value) => {
        if (!validateEmail(value)) {
          throw new Error('Invalid email format');
        }
        return true;
      }),
    validate,
  ],
  
  resetPassword: [
    body('token')
      .notEmpty()
      .withMessage('Token is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .custom((value) => {
        const validation = validatePassword(value);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }
        return true;
      }),
    validate,
  ],
  
  verifyOTP: [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('otp')
      .notEmpty()
      .withMessage('OTP is required')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
      .isNumeric()
      .withMessage('OTP must contain only numbers'),
    validate,
  ],
};

/**
 * Job validation rules
 */
const jobValidators = {
  createJob: [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Job title is required')
      .isLength({ min: 3, max: 100 })
      .withMessage('Title must be between 3 and 100 characters'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Job description is required')
      .isLength({ min: 50 })
      .withMessage('Description must be at least 50 characters'),
    body('location')
      .trim()
      .notEmpty()
      .withMessage('Location is required'),
    body('jobType')
      .notEmpty()
      .withMessage('Job type is required')
      .isIn(['Full-time', 'Part-time', 'Contract', 'Remote', 'Hybrid'])
      .withMessage('Invalid job type'),
    body('category')
      .trim()
      .notEmpty()
      .withMessage('Category is required'),
    validate,
  ],
  
  updateJob: [
    param('jobId')
      .notEmpty()
      .withMessage('Job ID is required')
      .isMongoId()
      .withMessage('Invalid job ID'),
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Title must be between 3 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 50 })
      .withMessage('Description must be at least 50 characters'),
    body('jobType')
      .optional()
      .isIn(['Full-time', 'Part-time', 'Contract', 'Remote', 'Hybrid'])
      .withMessage('Invalid job type'),
    validate,
  ],
  
  getJob: [
    param('jobId')
      .notEmpty()
      .withMessage('Job ID is required')
      .isMongoId()
      .withMessage('Invalid job ID'),
    validate,
  ],
  
  searchJobs: [
    query('keywords')
      .optional()
      .trim(),
    query('location')
      .optional()
      .trim(),
    query('jobType')
      .optional()
      .isIn(['Full-time', 'Part-time', 'Contract', 'Remote', 'Hybrid'])
      .withMessage('Invalid job type'),
    query('category')
      .optional()
      .trim(),
    query('minSalary')
      .optional()
      .isNumeric()
      .withMessage('Min salary must be a number'),
    query('maxSalary')
      .optional()
      .isNumeric()
      .withMessage('Max salary must be a number'),
    ...commonValidators.pagination(),
    validate,
  ],
};

/**
 * Application validation rules
 */
const applicationValidators = {
  apply: [
    param('jobId')
      .notEmpty()
      .withMessage('Job ID is required')
      .isMongoId()
      .withMessage('Invalid job ID'),
    body('coverLetter')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Cover letter cannot exceed 2000 characters'),
    validate,
  ],
  
  updateStatus: [
    param('applicationId')
      .notEmpty()
      .withMessage('Application ID is required')
      .isMongoId()
      .withMessage('Invalid application ID'),
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['pending', 'reviewed', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn', 'hired'])
      .withMessage('Invalid status'),
    validate,
  ],
};

module.exports = {
  validate,
  commonValidators,
  authValidators,
  jobValidators,
  applicationValidators,
};

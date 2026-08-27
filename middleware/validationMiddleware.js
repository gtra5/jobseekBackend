/**
 * Validation Middleware
 * Express-validator middleware for request validation
 */

const { body, param, query, validationResult } = require('express-validator');
const { validateEmail, validatePassword, validateName } = require('../utils/validators');

/**
 * Handle validation errors
 * Returns 400 with error details if validation fails
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

/**
 * Validation rules for registration
 */
const registerValidation = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
    .custom((value) => {
      if (!validateEmail(value)) {
        throw new Error('Invalid email format');
      }
      return true;
    }),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .custom((value) => {
      const validation = validatePassword(value);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      return true;
    }),
  
  body('firstName')
    .notEmpty().withMessage('First name is required')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters')
    .custom((value) => {
      if (!validateName(value)) {
        throw new Error('First name can only contain letters, spaces, hyphens, and apostrophes');
      }
      return true;
    }),
  
  body('lastName')
    .notEmpty().withMessage('Last name is required')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters')
    .custom((value) => {
      if (!validateName(value)) {
        throw new Error('Last name can only contain letters, spaces, hyphens, and apostrophes');
      }
      return true;
    }),
  
  body('role')
    .optional()
    .isIn(['jobseeker', 'employer']).withMessage('Role must be either jobseeker or employer'),
  
  handleValidationErrors
];

/**
 * Validation rules for login
 */
const loginValidation = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  handleValidationErrors
];

/**
 * Validation rules for password reset request
 */
const forgotPasswordValidation = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  handleValidationErrors
];

/**
 * Validation rules for password reset
 */
const resetPasswordValidation = [
  body('token')
    .notEmpty().withMessage('Reset token is required'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .custom((value) => {
      const validation = validatePassword(value);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      return true;
    }),
  
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  
  handleValidationErrors
];

/**
 * Validation rules for updating user profile
 */
const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters')
    .custom((value) => {
      if (value && !validateName(value)) {
        throw new Error('First name can only contain letters, spaces, hyphens, and apostrophes');
      }
      return true;
    }),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters')
    .custom((value) => {
      if (value && !validateName(value)) {
        throw new Error('Last name can only contain letters, spaces, hyphens, and apostrophes');
      }
      return true;
    }),
  
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('phone')
    .optional()
    .trim(),
  
  handleValidationErrors
];

/**
 * Validation rules for job creation
 */
const createJobValidation = [
  body('title')
    .notEmpty().withMessage('Job title is required')
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Job title must be between 3 and 100 characters'),
  
  body('description')
    .notEmpty().withMessage('Job description is required')
    .trim()
    .isLength({ min: 50 }).withMessage('Job description must be at least 50 characters'),
  
  body('location')
    .notEmpty().withMessage('Job location is required')
    .trim(),
  
  body('jobType')
    .notEmpty().withMessage('Job type is required')
    .isIn(['full-time', 'part-time', 'contract', 'remote', 'internship'])
    .withMessage('Invalid job type'),
  
  body('category')
    .notEmpty().withMessage('Job category is required'),
  
  body('salary')
    .optional()
    .isObject().withMessage('Salary must be an object'),
  
  body('salary.min')
    .optional()
    .isNumeric().withMessage('Minimum salary must be a number'),
  
  body('salary.max')
    .optional()
    .isNumeric().withMessage('Maximum salary must be a number'),
  
  handleValidationErrors
];

/**
 * Validation rules for job application
 */
const applyJobValidation = [
  body('coverLetter')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Cover letter must not exceed 2000 characters'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  updateProfileValidation,
  createJobValidation,
  applyJobValidation
};

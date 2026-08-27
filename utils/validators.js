/**
 * Validation Utilities
 * Regex-based validation rules for authentication and user data
 */

/**
 * Email validation regex
 * Validates standard email format with domain
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Username validation regex
 * Allows alphanumeric characters, underscores, and hyphens
 * Min 3 chars, max 20 chars
 */
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;

/**
 * Strong password validation regex
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Phone number validation regex (international format)
 * Allows optional + prefix, spaces, dashes, and parentheses
 */
const PHONE_REGEX = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;

/**
 * Name validation regex
 * Allows letters, spaces, hyphens, and apostrophes
 * Min 2 chars, max 50 chars
 */
const NAME_REGEX = /^[a-zA-Z\s'-]{2,50}$/;

/**
 * URL validation regex
 * Validates http/https URLs
 */
const URL_REGEX = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
const validateEmail = (email) => {
  return EMAIL_REGEX.test(email);
};

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {boolean} - True if valid
 */
const validateUsername = (username) => {
  return USERNAME_REGEX.test(username);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - { isValid: boolean, errors: string[] }
 */
const validatePassword = (password) => {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least 1 lowercase letter');
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least 1 uppercase letter');
  }
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least 1 number');
  }
  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least 1 special character (@$!%*?&)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
const validatePhone = (phone) => {
  return PHONE_REGEX.test(phone);
};

/**
 * Validate name format
 * @param {string} name - Name to validate
 * @returns {boolean} - True if valid
 */
const validateName = (name) => {
  return NAME_REGEX.test(name);
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid
 */
const validateUrl = (url) => {
  return URL_REGEX.test(url);
};

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>]/g, '')
    .trim();
};

module.exports = {
  EMAIL_REGEX,
  USERNAME_REGEX,
  PASSWORD_REGEX,
  PHONE_REGEX,
  NAME_REGEX,
  URL_REGEX,
  validateEmail,
  validateUsername,
  validatePassword,
  validatePhone,
  validateName,
  validateUrl,
  sanitizeInput
};

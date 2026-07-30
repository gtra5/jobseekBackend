/**
 * Standard API Response Utility
 * Provides consistent response format across all API endpoints
 */

class ApiResponse {
  /**
   * Success response
   * @param {Object} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Success message
   * @param {Object} data - Response data
   */
  static success(res, statusCode = 200, message = 'Success', data = null) {
    const response = {
      success: true,
      message,
      data,
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Error response
   * @param {Object} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {Array} errors - Validation or detailed errors
   */
  static error(res, statusCode = 500, message = 'Internal Server Error', errors = null) {
    const response = {
      success: false,
      message,
      errors,
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Created response (201)
   */
  static created(res, message = 'Resource created successfully', data = null) {
    return this.success(res, 201, message, data);
  }

  /**
   * Bad request response (400)
   */
  static badRequest(res, message = 'Bad request', errors = null) {
    return this.error(res, 400, message, errors);
  }

  /**
   * Unauthorized response (401)
   */
  static unauthorized(res, message = 'Unauthorized access') {
    return this.error(res, 401, message);
  }

  /**
   * Forbidden response (403)
   */
  static forbidden(res, message = 'Access forbidden') {
    return this.error(res, 403, message);
  }

  /**
   * Not found response (404)
   */
  static notFound(res, message = 'Resource not found') {
    return this.error(res, 404, message);
  }

  /**
   * Conflict response (409)
   */
  static conflict(res, message = 'Resource conflict') {
    return this.error(res, 409, message);
  }

  /**
   * Validation error response (422)
   */
  static validationError(res, message = 'Validation failed', errors = null) {
    return this.error(res, 422, message, errors);
  }

  /**
   * Server error response (500)
   */
  static serverError(res, message = 'Internal server error') {
    return this.error(res, 500, message);
  }
}

module.exports = ApiResponse;

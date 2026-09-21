/**
 * File Upload Middleware
 * Handles file uploads using Multer with memory storage for S3/R2 or Cloudinary storage
 */

const multer = require('multer');
const ApiResponse = require('../utils/apiResponse');

/**
 * Configure memory storage for S3/R2 / manual Cloudinary uploads
 */
const memoryStorage = multer.memoryStorage();

/**
 * File filter to allow only specific file types
 * @param {string} type - 'resume' | 'logo' | 'avatar'
 */
const getFileFilter = (type) => {
  return (req, file, cb) => {
    const allowedMimes = {
      resume: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      logo: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      avatar: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    };

    if (allowedMimes[type].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Only ${allowedMimes[type].join(', ')} are allowed for ${type}.`), false);
    }
  };
};

/**
 * Multer upload configuration for memory storage (S3/R2 / manual Cloudinary).
 * Files are held in memory, then uploaded to Cloudinary in the controller via
 * uploadBufferToCloudinary (the old multer-storage-cloudinary engine hangs on
 * this stack, so it is no longer used).
 */
const uploadToMemory = (type) => {
  const limit = type === 'resume' ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
  return multer({
    storage: memoryStorage,
    fileFilter: getFileFilter(type),
    limits: {
      fileSize: limit, // resumes up to 20MB, images 5MB
    },
  });
};

/**
 * Wrapper to handle Multer errors
 * @param {Function} uploadFunction - Multer upload function
 */
const handleUpload = (uploadFunction) => {
  return (req, res, next) => {
    uploadFunction(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // Multer-specific errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          return ApiResponse.badRequest(res, 'File size exceeds limit');
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return ApiResponse.badRequest(res, 'Unexpected file field');
        }
        return ApiResponse.badRequest(res, err.message);
      } else if (err) {
        // Other errors
        return ApiResponse.badRequest(res, err.message);
      }
      next();
    });
  };
};

/**
 * Middleware to handle resume upload to memory
 */
const handleResumeUploadMemory = handleUpload(uploadToMemory('resume').single('resume'));

/**
 * Middleware to handle logo upload to memory
 */
const handleLogoUploadMemory = handleUpload(uploadToMemory('logo').single('logo'));

/**
 * Middleware to handle avatar upload to memory
 */
const handleAvatarUploadMemory = handleUpload(uploadToMemory('avatar').single('avatar'));

module.exports = {
  handleAvatarUpload: handleAvatarUploadMemory,
  handleResumeUpload: handleResumeUploadMemory,
  handleLogoUpload: handleLogoUploadMemory,
  handleAvatarUploadMemory,
  handleResumeUploadMemory,
  handleLogoUploadMemory,
};

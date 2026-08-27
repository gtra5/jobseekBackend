/**
 * File Upload Middleware
 * Handles file uploads using Multer with memory storage for S3/R2 or Cloudinary storage
 */

const multer = require('multer');
const { createCloudinaryStorage } = require('../config/cloudinary');
const ApiResponse = require('../utils/apiResponse');

/**
 * Configure memory storage for S3/R2 uploads
 */
const memoryStorage = multer.memoryStorage();

/**
 * Configure storage for resume uploads
 */
const resumeStorage = createCloudinaryStorage('resumes');

/**
 * Configure storage for company logo uploads
 */
const logoStorage = createCloudinaryStorage('company-logos');

/**
 * Configure storage for avatar uploads
 */
const avatarStorage = createCloudinaryStorage('avatars');

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
 * Multer upload configuration for memory storage (S3/R2)
 */
const uploadToMemory = (type) => {
  return multer({
    storage: memoryStorage,
    fileFilter: getFileFilter(type),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
  });
};

/**
 * Multer upload configuration for resumes (Cloudinary)
 */
const uploadResume = multer({
  storage: resumeStorage,
  fileFilter: getFileFilter('resume'),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
}).single('resume');

/**
 * Multer upload configuration for company logos (Cloudinary)
 */
const uploadLogo = multer({
  storage: logoStorage,
  fileFilter: getFileFilter('logo'),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
}).single('logo');

/**
 * Multer upload configuration for avatars (Cloudinary)
 */
const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: getFileFilter('avatar'),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
}).single('avatar');

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
 * Middleware to handle resume upload to memory (for S3/R2)
 */
const handleResumeUploadMemory = handleUpload(uploadToMemory('resume').single('resume'));

/**
 * Middleware to handle logo upload to memory (for S3/R2)
 */
const handleLogoUploadMemory = handleUpload(uploadToMemory('logo').single('logo'));

/**
 * Middleware to handle avatar upload to memory (for S3/R2)
 */
const handleAvatarUploadMemory = handleUpload(uploadToMemory('avatar').single('avatar'));

/**
 * Middleware to handle resume upload (Cloudinary)
 */
const handleResumeUpload = handleUpload(uploadResume);

/**
 * Middleware to handle logo upload (Cloudinary)
 */
const handleLogoUpload = handleUpload(uploadLogo);

/**
 * Middleware to handle avatar upload (Cloudinary)
 */
const handleAvatarUpload = handleUpload(uploadAvatar);

module.exports = {
  handleResumeUpload,
  handleLogoUpload,
  handleAvatarUpload,
  handleResumeUploadMemory,
  handleLogoUploadMemory,
  handleAvatarUploadMemory,
};

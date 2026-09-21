/**
 * Cloudinary Configuration
 * Handles file uploads for resumes and company logos
 */

const cloudinary = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

/**
 * Configure Cloudinary with environment variables
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Create Cloudinary storage engine for Multer
 * @param {string} folder - Cloudinary folder name (e.g., 'resumes', 'company-logos')
 * @returns {CloudinaryStorage} Configured storage instance
 */
const createCloudinaryStorage = (folder) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
      public_id: (req, file) => {
        // Generate unique filename: timestamp + original name
        const timestamp = Date.now();
        const name = file.originalname.split('.')[0];
        return `${name}-${timestamp}`;
      },
    },
  });
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID of the file
 * @returns {Promise} Cloudinary deletion result
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error(`Error deleting from Cloudinary: ${error.message}`);
    throw error;
  }
};

/**
 * Upload file to Cloudinary (manual upload)
 * @param {string} filePath - Local file path
 * @param {string} folder - Cloudinary folder
 * @returns {Promise} Upload result with URL and public ID
 */
const uploadToCloudinary = async (filePath, folder) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error(`Error uploading to Cloudinary: ${error.message}`);
    throw error;
  }
};

/**
 * Upload an in-memory Buffer to Cloudinary.
 * Used with multer memory storage so we avoid the old
 * multer-storage-cloudinary engine, which hangs on this stack.
 * @param {Buffer} buffer - File contents already in memory
 * @param {string} folder - Cloudinary folder (e.g. 'avatars', 'resumes')
 * @param {string} [resourceType='auto'] - 'image' | 'raw' | 'auto'; resumes are raw
 * @param {Object} [options] - Extra upload options (e.g. allowed_formats)
 * @returns {Promise<{url: string, publicId: string}>}
 */
const uploadBufferToCloudinary = (buffer, folder, resourceType = 'auto', options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType, ...options },
      (error, result) => {
        if (error) {
          console.error(`Error uploading buffer to Cloudinary: ${error.message}`);
          return reject(error);
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

module.exports = {
  cloudinary,
  createCloudinaryStorage,
  deleteFromCloudinary,
  uploadToCloudinary,
  uploadBufferToCloudinary,
};

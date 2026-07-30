/**
 * Upload Service
 * Handles file uploads to Cloudinary
 */

const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

/**
 * Upload resume
 * @param {string} filePath - Local file path
 * @returns {Promise<Object>} Upload result with URL and public ID
 */
const uploadResume = async (filePath) => {
  return await uploadToCloudinary(filePath, 'resumes');
};

/**
 * Upload company logo
 * @param {string} filePath - Local file path
 * @returns {Promise<Object>} Upload result with URL and public ID
 */
const uploadLogo = async (filePath) => {
  return await uploadToCloudinary(filePath, 'company-logos');
};

/**
 * Upload avatar
 * @param {string} filePath - Local file path
 * @returns {Promise<Object>} Upload result with URL and public ID
 */
const uploadAvatar = async (filePath) => {
  return await uploadToCloudinary(filePath, 'avatars');
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} Deletion result
 */
const deleteFile = async (publicId) => {
  return await deleteFromCloudinary(publicId);
};

/**
 * Clean up local file after upload
 * @param {string} filePath - Local file path
 */
const cleanupLocalFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Local file deleted:', filePath);
    }
  } catch (error) {
    console.error('Error deleting local file:', error.message);
  }
};

/**
 * Upload file and clean up local copy
 * @param {string} filePath - Local file path
 * @param {string} type - Upload type (resume, logo, avatar)
 * @returns {Promise<Object>} Upload result
 */
const uploadAndCleanup = async (filePath, type) => {
  try {
    let result;
    switch (type) {
      case 'resume':
        result = await uploadResume(filePath);
        break;
      case 'logo':
        result = await uploadLogo(filePath);
        break;
      case 'avatar':
        result = await uploadAvatar(filePath);
        break;
      default:
        throw new Error('Invalid upload type');
    }

    cleanupLocalFile(filePath);
    return result;
  } catch (error) {
    cleanupLocalFile(filePath);
    throw error;
  }
};

module.exports = {
  uploadResume,
  uploadLogo,
  uploadAvatar,
  deleteFile,
  cleanupLocalFile,
  uploadAndCleanup,
};

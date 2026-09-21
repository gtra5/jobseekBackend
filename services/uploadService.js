/**
 * Upload Service
 * Handles file uploads to AWS S3 using presigned URLs
 */

const { generatePresignedUploadUrl, generatePresignedAccessUrl, deleteFile, BUCKET_NAME } = require('../config/storage');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Generate unique file key
 * @param {string} originalName - Original file name
 * @param {string} folder - Folder name (resumes, logos, avatars)
 * @returns {string} Unique file key
 */
const generateFileKey = (originalName, folder) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${folder}/${timestamp}-${randomString}-${sanitizedName}`;
};

/**
 * Generate presigned upload URL for a file
 * @param {string} originalName - Original file name
 * @param {string} contentType - MIME type
 * @param {string} folder - Folder name (resumes, logos, avatars)
 * @returns {Promise<{uploadUrl: string, fileKey: string}>}
 */
const generateUploadUrl = async (originalName, contentType, folder = 'uploads') => {
  const fileKey = generateFileKey(originalName, folder);
  const uploadUrl = await generatePresignedUploadUrl(fileKey, contentType);
  
  return {
    uploadUrl,
    fileKey,
    publicUrl: `https://${BUCKET_NAME}.s3.amazonaws.com/${fileKey}`
  };
};

/**
 * Generate presigned access URL for a file
 * @param {string} fileKey - File key in bucket
 * @param {number} expiresIn - URL expiration time in seconds (default: 3600)
 * @returns {Promise<string>} Presigned access URL
 */
const generateAccessUrl = async (fileKey, expiresIn = 3600) => {
  return await generatePresignedAccessUrl(fileKey, expiresIn);
};

/**
 * Delete file from S3
 * @param {string} fileKey - File key in bucket
 * @returns {Promise<void>}
 */
const deleteFileByKey = async (fileKey) => {
  return await deleteFile(fileKey);
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
 * Upload file using presigned URL (for direct browser uploads)
 * @param {string} originalName - Original file name
 * @param {string} contentType - MIME type
 * @param {string} folder - Folder name (resumes, logos, avatars)
 * @returns {Promise<{uploadUrl: string, fileKey: string, publicUrl: string}>}
 */
const uploadAndCleanup = async (originalName, contentType, folder = 'uploads') => {
  try {
    const result = await generateUploadUrl(originalName, contentType, folder);
    return result;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  generateUploadUrl,
  generateAccessUrl,
  deleteFileByKey,
  cleanupLocalFile,
  uploadAndCleanup,
};

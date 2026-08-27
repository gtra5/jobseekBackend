/**
 * Storage Service
 * Handles file uploads to AWS S3 or Cloudflare R2 using @aws-sdk/client-s3
 */

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const logger = require('../utils/logger');

// Initialize S3/R2 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT || undefined, // For Cloudflare R2
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true', // Required for some S3-compatible services
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'jobseek-uploads';

/**
 * Upload file to S3/R2
 * @param {Buffer} fileBuffer - File buffer from multer memory storage
 * @param {string} key - File key/path in bucket
 * @param {string} contentType - MIME type of the file
 * @param {string} folder - Folder to store the file in (resumes, logos, avatars)
 * @returns {Promise<{key: string, url: string}>}
 */
const uploadFile = async (fileBuffer, key, contentType, folder = 'uploads') => {
  try {
    const fullKey = `${folder}/${key}`;
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fullKey,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await s3Client.send(command);
    
    logger.info(`File uploaded successfully: ${fullKey}`);
    
    return {
      key: fullKey,
      url: `${process.env.S3_PUBLIC_URL || `https://${BUCKET_NAME}.s3.amazonaws.com`}/${fullKey}`,
    };
  } catch (error) {
    logger.error(`Error uploading file to S3/R2: ${error.message}`);
    throw new Error('Failed to upload file to storage');
  }
};

/**
 * Generate presigned URL for file access
 * @param {string} key - File key in bucket
 * @param {number} expiresIn - URL expiration time in seconds (default: 3600)
 * @returns {Promise<string>}
 */
const getPresignedUrl = async (key, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    logger.error(`Error generating presigned URL: ${error.message}`);
    throw new Error('Failed to generate presigned URL');
  }
};

/**
 * Stream file from S3/R2
 * @param {string} key - File key in bucket
 * @returns {Promise<GetObjectCommand>}
 */
const getFile = async (key) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    return response;
  } catch (error) {
    logger.error(`Error getting file from S3/R2: ${error.message}`);
    throw new Error('Failed to retrieve file');
  }
};

/**
 * Delete file from S3/R2
 * @param {string} key - File key in bucket
 * @returns {Promise<void>}
 */
const deleteFile = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    logger.info(`File deleted successfully: ${key}`);
  } catch (error) {
    logger.error(`Error deleting file from S3/R2: ${error.message}`);
    throw new Error('Failed to delete file');
  }
};

/**
 * Delete multiple files from S3/R2
 * @param {string[]} keys - Array of file keys to delete
 * @returns {Promise<void>}
 */
const deleteMultipleFiles = async (keys) => {
  try {
    const deletePromises = keys.map(key => deleteFile(key));
    await Promise.all(deletePromises);
    logger.info(`Multiple files deleted successfully: ${keys.length} files`);
  } catch (error) {
    logger.error(`Error deleting multiple files from S3/R2: ${error.message}`);
    throw new Error('Failed to delete multiple files');
  }
};

module.exports = {
  uploadFile,
  getPresignedUrl,
  getFile,
  deleteFile,
  deleteMultipleFiles,
};

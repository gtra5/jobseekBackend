/**
 * AWS S3 Storage Configuration
 * Handles file uploads using presigned URLs for secure uploads
 */

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const logger = require('../utils/logger');

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'voraq-uploads';

/**
 * Upload a file buffer directly to S3 (server-side).
 * Use this when the file already arrived at this server via multer (memory
 * storage) — there is no reason to also hand the client a presigned upload
 * URL in that case, since the bytes are already here.
 * @param {Buffer} buffer - File contents already in memory
 * @param {string} key - File key/path in bucket
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<{key: string, url: string}>}
 */
const uploadBuffer = async (buffer, key, contentType) => {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);
    logger.info(`File uploaded successfully: ${key}`);

    return {
      key,
      url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`,
    };
  } catch (error) {
    logger.error(`Error uploading file to S3: ${error.message}`);
    throw new Error('Failed to upload file to storage');
  }
};

/**
 * Generate presigned URL for file upload
 * @param {string} key - File key/path in bucket
 * @param {string} contentType - MIME type of the file
 * @param {number} expiresIn - URL expiration time in seconds (default: 3600)
 * @returns {Promise<string>} Presigned upload URL
 */
const generatePresignedUploadUrl = async (key, contentType, expiresIn = 3600) => {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    logger.info(`Generated presigned upload URL for: ${key}`);
    return url;
  } catch (error) {
    logger.error(`Error generating presigned upload URL: ${error.message}`);
    throw new Error('Failed to generate upload URL');
  }
};

/**
 * Generate presigned URL for file access
 * @param {string} key - File key in bucket
 * @param {number} expiresIn - URL expiration time in seconds (default: 3600)
 * @returns {Promise<string>} Presigned access URL
 */
const generatePresignedAccessUrl = async (key, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    logger.error(`Error generating presigned access URL: ${error.message}`);
    throw new Error('Failed to generate access URL');
  }
};

/**
 * Delete file from S3
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
    logger.error(`Error deleting file from S3: ${error.message}`);
    throw new Error('Failed to delete file');
  }
};

/**
 * Check if file exists in S3
 * @param {string} key - File key in bucket
 * @returns {Promise<boolean>}
 */
const fileExists = async (key) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
      return false;
    }
    logger.error(`Error checking file existence: ${error.message}`);
    throw new Error('Failed to check file existence');
  }
};

module.exports = {
  s3Client,
  BUCKET_NAME,
  uploadBuffer,
  generatePresignedUploadUrl,
  generatePresignedAccessUrl,
  deleteFile,
  fileExists,
};
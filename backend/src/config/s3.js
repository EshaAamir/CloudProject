const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {String} fileName - File name
 * @param {String} mimetype - File MIME type
 * @returns {Promise<String>} - S3 object key
 */
const uploadToS3 = async (fileBuffer, fileName, mimetype) => {
  const timestamp = Date.now();
  const key = `uploads/${timestamp}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimetype,
    ACL: 'public-read' // For public access, or remove for private
  });

  await s3Client.send(command);
  
  // Return public URL
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
};

/**
 * Get presigned URL for private file access
 * @param {String} key - S3 object key
 * @param {Number} expiresIn - URL expiration in seconds (default: 3600)
 * @returns {Promise<String>} - Presigned URL
 */
const getPresignedUrl = async (key, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
};

module.exports = {
  s3Client,
  uploadToS3,
  getPresignedUrl,
  BUCKET_NAME
};


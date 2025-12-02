const { uploadToS3 } = require('../config/s3');

/**
 * Upload file to S3
 * POST /upload
 */
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    // Check if AWS credentials are configured
    if (!process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID === 'your-access-key-id' ||
        !process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY === 'your-secret-access-key' ||
        !process.env.S3_BUCKET_NAME || process.env.S3_BUCKET_NAME === 'your-s3-bucket-name') {
      return res.status(503).json({
        success: false,
        message: 'File upload is not configured. AWS S3 credentials are required.',
        note: 'For local development, configure AWS credentials in backend/.env or skip file upload feature.'
      });
    }

    const { buffer, originalname, mimetype } = req.file;

    // Upload to S3
    const fileUrl = await uploadToS3(buffer, originalname, mimetype);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        url: fileUrl,
        fileName: originalname,
        mimetype
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Provide helpful error messages
    let errorMessage = 'Error uploading file';
    if (error.name === 'InvalidAccessKeyId' || error.Code === 'InvalidAccessKeyId') {
      errorMessage = 'Invalid AWS credentials. Please check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in backend/.env';
    } else if (error.name === 'NoSuchBucket' || error.Code === 'NoSuchBucket') {
      errorMessage = 'S3 bucket not found. Please check your S3_BUCKET_NAME in backend/.env';
    } else {
      errorMessage = error.message || 'Error uploading file';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  uploadFile
};


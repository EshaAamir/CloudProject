const { uploadToS3, getPresignedUrl } = require('../config/s3');
const File = require('../models/File'); // Sequelize model for files

/**
 * Upload file to S3
 * POST /upload
 */
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const { buffer, originalname, mimetype } = req.file;
    const { isPublic } = req.body; // 'true' or 'false' from frontend
    const userId = req.user.id; // from authenticate middleware

    // Determine S3 key prefix
    const prefix = isPublic === 'true'
      ? 'public'
      : `private/user-uploads/${userId}`;

    const key = `${prefix}/${Date.now()}-${originalname}`;

    // Upload file to S3
    await uploadToS3(buffer, key, mimetype, isPublic === 'true');

    // Save record in Postgres
    const fileRecord = await File.create({
      user_id: userId,
      file_key: key,
      file_name: originalname,
      is_public: isPublic === 'true'
    });

    // Generate URL
    let fileUrl;
    if (isPublic === 'true') {
      fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } else {
      fileUrl = await getPresignedUrl(key, 300); // 5 min expiration
    }

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        id: fileRecord.id,
        file_name: originalname,
        file_key: key,
        is_public: isPublic === 'true',
        url: fileUrl
      }
    });
  } catch (error) {
    console.error('Upload error:', error);

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

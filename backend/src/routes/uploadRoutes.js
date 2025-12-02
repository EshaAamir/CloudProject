const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadFile } = require('../controllers/uploadController');

// All routes require authentication
router.use(authenticate);

// Upload route
router.post('/', upload.single('file'), uploadFile);

module.exports = router;


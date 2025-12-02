const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote
} = require('../controllers/noteController');

// Validation rules
const noteValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  body('content')
    .optional({ checkFalsy: true })
    .trim(),
  body('imageUrl')
    .optional({ checkFalsy: true })
    .trim()
    .custom((value) => {
      // If imageUrl is provided, it must be a valid URL
      if (value && value.length > 0) {
        try {
          new URL(value);
          return true;
        } catch {
          throw new Error('Image URL must be a valid URL');
        }
      }
      return true; // Empty string is allowed
    })
];

const idValidation = [
  param('id')
    .notEmpty()
    .withMessage('Note ID is required')
    .isInt({ min: 1 })
    .withMessage('Note ID must be a positive integer')
];

// All routes require authentication
router.use(authenticate);

// Routes - specific routes first, then parameterized routes
router.get('/', getNotes);
router.post('/', noteValidation, createNote);
router.get('/:id', idValidation, getNoteById);
router.put('/:id', [...idValidation, ...noteValidation], updateNote);
router.delete('/:id', idValidation, deleteNote);

module.exports = router;


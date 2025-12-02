const { validationResult } = require('express-validator');
const Note = require('../models/Note');
const User = require('../models/User');

/**
 * Create a new note
 * POST /notes
 */
const createNote = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, content, imageUrl } = req.body;
    const userId = req.userId;

    const note = await Note.create({
      title,
      content,
      imageUrl,
      userId
    });

    res.status(201).json({
      success: true,
      message: 'Note created successfully',
      data: { note }
    });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating note',
      error: error.message
    });
  }
};

/**
 * Get all notes for authenticated user
 * GET /notes
 */
const getNotes = async (req, res) => {
  try {
    // Ensure userId is set (should be set by authenticate middleware)
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userId = req.userId;

    const notes = await Note.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }]
    });

    res.json({
      success: true,
      message: 'Notes retrieved successfully',
      data: { notes, count: notes.length }
    });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving notes',
      error: error.message
    });
  }
};

/**
 * Get a single note by ID
 * GET /notes/:id
 */
const getNoteById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const note = await Note.findOne({
      where: { id, userId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }]
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    res.json({
      success: true,
      message: 'Note retrieved successfully',
      data: { note }
    });
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving note',
      error: error.message
    });
  }
};

/**
 * Update a note
 * PUT /notes/:id
 */
const updateNote = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const userId = req.userId;
    const { title, content, imageUrl } = req.body;

    const note = await Note.findOne({ where: { id, userId } });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    await note.update({
      title: title || note.title,
      content: content !== undefined ? content : note.content,
      imageUrl: imageUrl !== undefined ? imageUrl : note.imageUrl
    });

    res.json({
      success: true,
      message: 'Note updated successfully',
      data: { note }
    });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating note',
      error: error.message
    });
  }
};

/**
 * Delete a note
 * DELETE /notes/:id
 */
const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const note = await Note.findOne({ where: { id, userId } });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    await note.destroy();

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting note',
      error: error.message
    });
  }
};

module.exports = {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote
};


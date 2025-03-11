// server/routes/admin.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadPath = path.join(__dirname, '../data/videos');
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function(req, file, cb) {
    // Generate a unique filename with the original extension
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    cb(null, fileName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: function(req, file, cb) {
    // Accept only video files
    const fileTypes = /mp4|webm|ogg|avi|mkv/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'));
    }
  }
});

// Get all courses (Admin view)
router.get('/courses', [auth, isAdmin], async (req, res) => {
  try {
    // Here we'd typically get courses from database
    // For now, reusing the existing courses route
    res.redirect('/api/courses');
  } catch (err) {
    console.error('Error in admin/courses:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new course
router.post('/courses', [
  auth, 
  isAdmin,
  [
    check('title', 'Title is required').not().isEmpty(),
    check('language', 'Language is required').not().isEmpty()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id, title, description, language, videos } = req.body;
    
    // Here we would save to the database
    // For now, we'll use a mock implementation
    
    // Generate a simple course object
    const newCourse = {
      id: id || uuidv4(),
      title,
      description: description || '',
      language: language || 'ru',
      videos: videos || []
    };
    
    // Return the created course
    res.status(201).json(newCourse);
  } catch (err) {
    console.error('Error creating course:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a course
router.put('/courses/:courseId', [auth, isAdmin], async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, language, videos } = req.body;
    
    // Here we would update the course in the database
    // For now, we'll use a mock implementation
    
    // Return the updated course
    res.json({
      id: courseId,
      title,
      description,
      language,
      videos
    });
  } catch (err) {
    console.error(`Error updating course ${req.params.courseId}:`, err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a course
router.delete('/courses/:courseId', [auth, isAdmin], async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Here we would delete the course from the database
    // For now, we'll use a mock implementation
    
    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    console.error(`Error deleting course ${req.params.courseId}:`, err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a video to a course
router.post('/courses/:courseId/videos', [auth, isAdmin], async (req, res) => {
  try {
    const { courseId } = req.params;
    const videoData = req.body;
    
    // Here we would add the video to the course in the database
    // For now, we'll use a mock implementation
    
    // Generate video ID if not provided
    const newVideo = {
      ...videoData,
      id: videoData.id || uuidv4()
    };
    
    res.status(201).json(newVideo);
  } catch (err) {
    console.error('Error adding video:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a video
router.put('/courses/:courseId/videos/:videoId', [auth, isAdmin], async (req, res) => {
  try {
    const { courseId, videoId } = req.params;
    const videoData = req.body;
    
    // Here we would update the video in the database
    // For now, we'll use a mock implementation
    
    res.json({
      ...videoData,
      id: videoId
    });
  } catch (err) {
    console.error(`Error updating video ${req.params.videoId}:`, err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a video
router.delete('/courses/:courseId/videos/:videoId', [auth, isAdmin], async (req, res) => {
  try {
    const { courseId, videoId } = req.params;
    
    // Here we would delete the video from the database
    // For now, we'll use a mock implementation
    
    res.json({ message: 'Video deleted successfully' });
  } catch (err) {
    console.error(`Error deleting video ${req.params.videoId}:`, err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update video positions (reordering)
router.put('/courses/:courseId/videos/positions', [auth, isAdmin], async (req, res) => {
  try {
    const { courseId } = req.params;
    const { positions } = req.body;
    
    // Here we would update the positions in the database
    // For now, we'll use a mock implementation
    
    res.json({ message: 'Video positions updated successfully' });
  } catch (err) {
    console.error('Error updating video positions:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload a video file
router.post('/upload', [auth, isAdmin, upload.single('video')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Get the path relative to the videos directory
    const relativePath = '/videos/' + path.basename(req.file.path);
    
    res.json({
      message: 'File uploaded successfully',
      filePath: relativePath,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
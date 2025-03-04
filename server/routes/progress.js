// server/routes/progress.js
const express = require('express');
const router = express.Router();
const { courseModel } = require('../models/data-model');
const auth = require('../middleware/auth');

// @access  Private
router.post('/:courseId/:videoId', auth, async (req, res) => {
  const { courseId, videoId } = req.params;

  
  // Проверяем существование курса и видео
  const language = req.query.language || 'ru';
  const course = courseModel.findById(courseId, language);
  
  if (!course) {
    console.log('Курс не найден');
    return res.status(404).json({ message: 'Course not found' });
  }
  
  const video = course.videos.find(v => v.id === videoId);
  
  if (!video) {
    console.log('Видео не найдено');
    return res.status(404).json({ message: 'Video not found' });
  }
});

// @route   GET api/progress/:courseId
// @desc    Get course progress
// @access  Private
router.get('/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    
    // Проверяем существование курса
    const language = req.query.language || 'ru';
    const course = courseModel.findById(courseId, language);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
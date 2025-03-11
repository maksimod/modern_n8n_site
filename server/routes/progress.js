// server/routes/progress.js
const express = require('express');
const router = express.Router();
const { courseModel } = require('../models/data-model');
const progressModel = require('../models/progress.model');
const auth = require('../middleware/auth');

// @route   POST api/progress/:courseId/:videoId
// @desc    Mark video as completed/uncompleted
// @access  Private
router.post('/:courseId/:videoId', auth, async (req, res) => {
  const { courseId, videoId } = req.params;
  const { isCompleted } = req.body;
  const userId = req.user.id;
  const language = req.query.language || 'ru';

  try {
    // Проверяем существование курса и видео
    const course = courseModel.findById(courseId, language);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    const video = course.videos.find(v => v.id === videoId);
    
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Отмечаем видео как просмотренное/непросмотренное
    progressModel.markVideoAsCompleted(userId, courseId, videoId, isCompleted);
    
    res.json({ 
      message: 'Progress updated successfully',
      status: isCompleted
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/progress/:courseId
// @desc    Get course progress
// @access  Private
router.get('/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const language = req.query.language || 'ru';
    
    // Проверяем существование курса
    const course = courseModel.findById(courseId, language);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Получаем прогресс по курсу
    const courseProgress = progressModel.getCourseCompletionStatus(userId, courseId);
    
    res.json({
      courseId,
      progress: courseProgress
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
// server/routes/progress.js
const express = require('express');
const router = express.Router();
const { courseModel, progressModel } = require('../models/data-model');
const auth = require('../middleware/auth');

// @route   POST api/progress/:courseId/:videoId
// @desc    Update video progress
// @access  Private
router.post('/:courseId/:videoId', auth, async (req, res) => {
  try {
    console.log('Получен запрос на обновление прогресса:', req.params, req.body);
    
    const { courseId, videoId } = req.params;
    const { completed } = req.body;
    const userId = req.user.id;
    
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
    
    // Обновляем прогресс
    const progressResults = progressModel.updateProgress(userId, courseId, videoId, completed);
    
    // Форматируем прогресс для ответа
    const progress = {};
    
    progressResults.forEach(row => {
      progress[row.video_id] = row.is_completed;
    });
    
    res.json(progress);
  } catch (err) {
    console.error('Ошибка при обновлении прогресса:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
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
    
    // Получаем прогресс пользователя по курсу
    const progressResults = progressModel.getCourseProgress(userId, courseId);
    
    // Форматируем прогресс для ответа
    const progress = {};
    
    progressResults.forEach(row => {
      progress[row.video_id] = row.is_completed;
    });
    
    res.json(progress);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
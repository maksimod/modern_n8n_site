console.log("test1");
// server/routes/progress.js
const express = require('express');
const router = express.Router();
const db = require('../db/db');
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
    const courseCheck = await db.query('SELECT * FROM courses WHERE id = $1 AND language = $2', [courseId, language]);
    
    if (courseCheck.rows.length === 0) {
      console.log('Курс не найден');
      return res.status(404).json({ message: 'Course not found' });
    }
    
    const videoCheck = await db.query('SELECT * FROM videos WHERE id = $1 AND course_id = $2', [videoId, courseId]);
    
    if (videoCheck.rows.length === 0) {
      console.log('Видео не найдено');
      return res.status(404).json({ message: 'Video not found' });
    }
    
    // Проверяем существует ли уже прогресс
    const progressCheck = await db.query(
      'SELECT * FROM user_progress WHERE user_id = $1 AND course_id = $2 AND video_id = $3',
      [userId, courseId, videoId]
    );
    
    if (progressCheck.rows.length > 0) {
      // Обновляем существующий прогресс
      await db.query(
        'UPDATE user_progress SET is_completed = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND course_id = $3 AND video_id = $4',
        [completed, userId, courseId, videoId]
      );
    } else {
      // Создаем новую запись прогресса
      await db.query(
        'INSERT INTO user_progress (user_id, course_id, video_id, is_completed) VALUES ($1, $2, $3, $4)',
        [userId, courseId, videoId, completed]
      );
    }
    
    // Получаем весь прогресс пользователя по курсу
    const progressResult = await db.query(
      'SELECT video_id, is_completed FROM user_progress WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );
    
    // Форматируем прогресс для ответа
    const progress = {};
    
    progressResult.rows.forEach(row => {
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
    const courseCheck = await db.query('SELECT * FROM courses WHERE id = $1 AND language = $2', [courseId, language]);
    
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Получаем прогресс пользователя по курсу
    const progressResult = await db.query(
      'SELECT video_id, is_completed FROM user_progress WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );
    
    // Форматируем прогресс для ответа
    const progress = {};
    
    progressResult.rows.forEach(row => {
      progress[row.video_id] = row.is_completed;
    });
    
    res.json(progress);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
// server/routes/courses.js
const express = require('express');
const router = express.Router();
const db = require('../db/db');
const auth = require('../middleware/auth');

// @route   GET api/courses
// @desc    Get all courses
// @access  Public
router.get('/', async (req, res) => {
  try {
    const language = req.query.language || 'ru';
    console.log('Запрошенный язык:', language);

    const coursesResult = await db.query(
      'SELECT * FROM courses WHERE language = $1',
      [language]
    );

    const courses = [];
    
    // Для каждого курса получаем его видео
    for (const course of coursesResult.rows) {
      const videosResult = await db.query(
        'SELECT * FROM videos WHERE course_id = $1 AND language = $2 ORDER BY order_index',
        [course.id, language]
      );
      
      const formattedVideos = videosResult.rows.map(video => ({
        id: video.id,
        title: video.title,
        description: video.description || '',
        duration: video.duration,
        videoUrl: video.video_url,
        isPrivate: video.is_private
      }));
      
      courses.push({
        id: course.id,
        title: course.title,
        description: course.description,
        language: course.language,
        videos: formattedVideos
      });
    }
    
    res.json(courses);
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/courses/:courseId
// @desc    Get course by ID
// @access  Public
// server/routes/courses.js - обновленный метод получения курса
router.get('/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const language = req.query.language || 'ru';
    
    console.log(`Запрос курса: ${courseId}, язык: ${language}`);
    
    // Получаем курс на нужном языке
    const courseResult = await db.query(
      'SELECT * FROM courses WHERE id = $1 AND language = $2',
      [courseId, language]
    );
    
    if (courseResult.rows.length === 0) {
      console.log(`Курс не найден: ${courseId}, язык: ${language}`);
      
      // Если курс не найден на запрошенном языке, пробуем найти на любом другом
      const anyCourseResult = await db.query(
        'SELECT * FROM courses WHERE id = $1 LIMIT 1',
        [courseId]
      );
      
      if (anyCourseResult.rows.length === 0) {
        return res.status(404).json({ message: 'Course not found' });
      }
      
      // Берем курс на доступном языке
      const course = anyCourseResult.rows[0];
      console.log(`Найден курс на языке: ${course.language}`);
      
      // Находим все видео для этого курса на том же языке
      const videosResult = await db.query(
        'SELECT * FROM videos WHERE course_id = $1 AND language = $2 ORDER BY order_index',
        [courseId, course.language]
      );
      
      const formattedVideos = videosResult.rows.map(video => ({
        id: video.id,
        title: video.title,
        description: video.description || '',
        duration: video.duration,
        videoUrl: video.video_url,
        isPrivate: video.is_private
      }));
      
      return res.json({
        id: course.id,
        title: course.title,
        description: course.description,
        language: course.language, // Добавляем информацию о языке
        videos: formattedVideos
      });
    }
    
    const course = courseResult.rows[0];
    
    // Получаем видео для курса на том же языке
    const videosResult = await db.query(
      'SELECT * FROM videos WHERE course_id = $1 AND language = $2 ORDER BY order_index',
      [courseId, language]
    );
    
    const formattedVideos = videosResult.rows.map(video => ({
      id: video.id,
      title: video.title,
      description: video.description || '',
      duration: video.duration,
      videoUrl: video.video_url,
      isPrivate: video.is_private
    }));
    
    res.json({
      id: course.id,
      title: course.title,
      description: course.description,
      language: course.language,
      videos: formattedVideos
    });
  } catch (err) {
    console.error('Error fetching course:', err);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/courses/:courseId/videos/:videoId
// @desc    Get video by ID
// @access  Public
// server/routes/courses.js - обновленный метод получения видео
router.get('/:courseId/videos/:videoId', async (req, res) => {
  try {
    const { courseId, videoId } = req.params;
    const language = req.query.language || 'ru';
    
    const videoResult = await db.query(
      'SELECT * FROM videos WHERE id = $1 AND course_id = $2 AND language = $3',
      [videoId, courseId, language]
    );
    
    if (videoResult.rows.length === 0) {
      // Если видео не найдено на запрошенном языке, пробуем найти на любом доступном
      const anyVideoResult = await db.query(
        'SELECT * FROM videos WHERE id = $1 AND course_id = $2 LIMIT 1',
        [videoId, courseId]
      );
      
      if (anyVideoResult.rows.length === 0) {
        return res.status(404).json({ message: 'Video not found' });
      }
      
      const video = anyVideoResult.rows[0];
      
      return res.json({
        id: video.id,
        title: video.title,
        description: video.description || '',
        duration: video.duration,
        videoUrl: video.video_url,
        isPrivate: video.is_private,
        language: video.language
      });
    }
    
    const video = videoResult.rows[0];
    
    res.json({
      id: video.id,
      title: video.title,
      description: video.description || '',
      duration: video.duration,
      videoUrl: video.video_url,
      isPrivate: video.is_private,
      language: video.language
    });
  } catch (err) {
    console.error('Error fetching video:', err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
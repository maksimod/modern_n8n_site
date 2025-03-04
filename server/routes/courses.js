// server/routes/courses.js
const express = require('express');
const router = express.Router();
const db = require('../db/db');
const auth = require('../middleware/auth');

// @route   GET api/courses
// @desc    Get all courses
// @access  Public
router.get('/', async (req, res) => {
  console.log('GET /api/courses - Запрос курсов получен');
  try {
    const language = req.query.language || 'ru';
    
    const coursesResult = await db.query(
      'SELECT * FROM courses WHERE language = $1',
      [language]
    );
    
    console.log('Результаты запроса курсов:', coursesResult.rows.length, 'курсов найдено');

    const courses = [];
    
    // Для каждого курса получаем его видео
    for (const course of coursesResult.rows) {
      const videosResult = await db.query(
        'SELECT * FROM videos WHERE course_id = $1 ORDER BY order_index',
        [course.id]
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
        videos: formattedVideos
      });
    }
    
    res.json(courses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/courses/:courseId
// @desc    Get course by ID
// @access  Public
router.get('/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const language = req.query.language || 'ru';
    
    const courseResult = await db.query(
      'SELECT * FROM courses WHERE id = $1 AND language = $2',
      [courseId, language]
    );
    
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    const course = courseResult.rows[0];
    
    const videosResult = await db.query(
      'SELECT * FROM videos WHERE course_id = $1 ORDER BY order_index',
      [courseId]
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
      videos: formattedVideos
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/courses/:courseId/videos/:videoId
// @desc    Get video by ID
// @access  Public
router.get('/:courseId/videos/:videoId', async (req, res) => {
  try {
    const { courseId, videoId } = req.params;
    
    const videoResult = await db.query(
      'SELECT * FROM videos WHERE id = $1 AND course_id = $2',
      [videoId, courseId]
    );
    
    if (videoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    const video = videoResult.rows[0];
    
    res.json({
      id: video.id,
      title: video.title,
      description: video.description || '',
      duration: video.duration,
      videoUrl: video.video_url,
      isPrivate: video.is_private
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
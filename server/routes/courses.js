// server/routes/courses.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { courseModel } = require('../models/data-model');

// @route   GET api/courses
// @desc    Get all courses
// @access  Public
router.get('/', async (req, res) => {
  try {
    const language = req.query.language || 'ru';
    console.log('Запрошенный язык:', language);

    const courses = courseModel.getAll(language);
    
    // Форматирование ответа
    const formattedCourses = courses.map(course => {
      const formattedVideos = course.videos.map(video => {
        // Проверка наличия локального видео
        if (video.localVideo) {
          const videoPath = path.join(__dirname, '../data/videos', video.localVideo);
          const hasLocalVideo = fs.existsSync(videoPath);
          
          if (hasLocalVideo) {
            return {
              id: video.id,
              title: video.title,
              description: video.description || '',
              duration: video.duration,
              localVideo: `/videos/${video.localVideo}`,
              isPrivate: video.isPrivate
            };
          }
        }
        
        // Если нет локального видео или оно не существует, возвращаем ссылку на внешнее видео
        return {
          id: video.id,
          title: video.title,
          description: video.description || '',
          duration: video.duration,
          videoUrl: video.videoUrl,
          isPrivate: video.isPrivate
        };
      });
      
      return {
        id: course.id,
        title: course.title,
        description: course.description,
        language: course.language,
        videos: formattedVideos
      };
    });
    
    res.json(formattedCourses);
  } catch (err) {
    console.error('Error fetching courses:', err);
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
    
    console.log(`Запрос курса: ${courseId}, язык: ${language}`);
    
    // Получаем курс на нужном языке
    let course = courseModel.findById(courseId, language);
    
    if (!course) {
      console.log(`Курс не найден: ${courseId}, язык: ${language}`);
      
      // Если курс не найден на запрошенном языке, ищем на другом языке
      const allCourses = courseModel.getAll();
      course = allCourses.find(c => c.id === courseId);
      
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }
      
      console.log(`Найден курс на языке: ${course.language}`);
    }
    
    // Форматируем видео с проверкой наличия локальных файлов
    const formattedVideos = course.videos.map(video => {
      // Проверка наличия локального видео
      if (video.localVideo) {
        const videoPath = path.join(__dirname, '../data/videos', video.localVideo);
        const hasLocalVideo = fs.existsSync(videoPath);
        
        if (hasLocalVideo) {
          return {
            id: video.id,
            title: video.title,
            description: video.description || '',
            duration: video.duration,
            localVideo: `/videos/${video.localVideo}`,
            isPrivate: video.isPrivate
          };
        }
      }
      
      // Если нет локального видео или оно не существует, возвращаем ссылку на внешнее видео
      return {
        id: video.id,
        title: video.title,
        description: video.description || '',
        duration: video.duration,
        videoUrl: video.videoUrl,
        isPrivate: video.isPrivate
      };
    });
    
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
router.get('/:courseId/videos/:videoId', async (req, res) => {
  try {
    const { courseId, videoId } = req.params;
    const language = req.query.language || 'ru';
    
    // Поиск курса
    const course = courseModel.findById(courseId, language);
    
    if (!course) {
      // Если курс не найден на запрошенном языке, ищем на другом языке
      const allCourses = courseModel.getAll();
      const alternativeCourse = allCourses.find(c => c.id === courseId);
      
      if (!alternativeCourse) {
        return res.status(404).json({ message: 'Course not found' });
      }
      
      // Поиск видео в альтернативном курсе
      const video = alternativeCourse.videos.find(v => v.id === videoId);
      
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }
      
      // Проверка наличия локального видео
      if (video.localVideo) {
        const videoPath = path.join(__dirname, '../data/videos', video.localVideo);
        const hasLocalVideo = fs.existsSync(videoPath);
        
        if (hasLocalVideo) {
          return res.json({
            id: video.id,
            title: video.title,
            description: video.description || '',
            duration: video.duration,
            localVideo: `/videos/${video.localVideo}`,
            isPrivate: video.isPrivate,
            language: alternativeCourse.language
          });
        }
      }
      
      // Если нет локального видео или оно не существует, возвращаем ссылку на внешнее видео
      return res.json({
        id: video.id,
        title: video.title,
        description: video.description || '',
        duration: video.duration,
        videoUrl: video.videoUrl,
        isPrivate: video.isPrivate,
        language: alternativeCourse.language
      });
    }
    
    // Поиск видео в найденном курсе
    const video = course.videos.find(v => v.id === videoId);
    
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    // Проверка наличия локального видео
    if (video.localVideo) {
      const videoPath = path.join(__dirname, '../data/videos', video.localVideo);
      const hasLocalVideo = fs.existsSync(videoPath);
      
      if (hasLocalVideo) {
        return res.json({
          id: video.id,
          title: video.title,
          description: video.description || '',
          duration: video.duration,
          localVideo: `/videos/${video.localVideo}`,
          isPrivate: video.isPrivate,
          language: course.language
        });
      }
    }
    
    // Если нет локального видео или оно не существует, возвращаем ссылку на внешнее видео
    res.json({
      id: video.id,
      title: video.title,
      description: video.description || '',
      duration: video.duration,
      videoUrl: video.videoUrl,
      isPrivate: video.isPrivate,
      language: course.language
    });
  } catch (err) {
    console.error('Error fetching video:', err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
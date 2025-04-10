// server/routes/courses.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { courseModel } = require('../models/data-model');
const { VIDEO_TYPES, STORAGE_CONFIG } = require('../config'); // Обновляем импорт констант

function formatYoutubeUrl(url) {
  if (!url) return '';
  
  // Различные регулярные выражения для извлечения ID из разных форматов URL
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }
  
  return url;
}

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
        // Проверяем тип видео
        const videoType = video.videoType || 
                          (video.storagePath ? VIDEO_TYPES.STORAGE :
                           (video.localVideo ? VIDEO_TYPES.LOCAL : 
                           (video.videoUrl ? VIDEO_TYPES.EXTERNAL : VIDEO_TYPES.TEXT)));
        
        // Если это видео из веб-хранилища
        if (videoType === VIDEO_TYPES.STORAGE && video.storagePath) {
          return {
            id: video.id,
            title: video.title,
            description: video.description || '',
            duration: video.duration,
            storagePath: video.storagePath,
            videoType: VIDEO_TYPES.STORAGE,
            isPrivate: video.isPrivate
          };
        }
        
        // Проверка наличия локального видео
        if (videoType === VIDEO_TYPES.LOCAL && video.localVideo) {
          const localVideoPath = typeof video.localVideo === 'string' ? video.localVideo.replace(/^\/videos\//, '') : '';
          const videoPath = path.join(__dirname, '../data/videos', localVideoPath);
          
          // Проверка существования файла
          let hasLocalVideo = false;
          try {
            hasLocalVideo = fs.existsSync(videoPath);
          } catch (e) {
            console.error(`Error checking video file: ${videoPath}`, e);
          }
          
          if (hasLocalVideo) {
            return {
              id: video.id,
              title: video.title,
              description: video.description || '',
              duration: video.duration,
              localVideo: `/videos/${localVideoPath}`,
              videoType: VIDEO_TYPES.LOCAL,
              isPrivate: video.isPrivate
            };
          } else {
            console.warn(`Local video file not found: ${videoPath}, returning as TEXT type`);
          }
        }
        
        // Если внешнее видео
        if (videoType === VIDEO_TYPES.EXTERNAL && video.videoUrl) {
          return {
            id: video.id,
            title: video.title,
            description: video.description || '',
            duration: video.duration,
            videoUrl: video.videoUrl,
            videoType: VIDEO_TYPES.EXTERNAL,
            isPrivate: video.isPrivate
          };
        }
        
        // Если ни один из типов не подошел или файл не найден, возвращаем текстовый тип
        return {
          id: video.id,
          title: video.title,
          description: video.description || '',
          duration: video.duration,
          videoType: VIDEO_TYPES.TEXT,
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
      // Сохраняем тип видео, если он есть
      const videoType = video.videoType || 
                       (video.storagePath ? VIDEO_TYPES.STORAGE :
                        (video.localVideo ? VIDEO_TYPES.LOCAL : 
                        (video.videoUrl ? VIDEO_TYPES.EXTERNAL : VIDEO_TYPES.TEXT)));
      
      // Определяем данные видео на основе типа
      if (videoType === VIDEO_TYPES.STORAGE && video.storagePath) {
        return {
          id: video.id,
          title: video.title,
          description: video.description || '',
          duration: video.duration,
          storagePath: video.storagePath,
          videoType: VIDEO_TYPES.STORAGE,
          isPrivate: video.isPrivate
        };
      } else if (videoType === VIDEO_TYPES.LOCAL && video.localVideo) {
        return {
          id: video.id,
          title: video.title,
          description: video.description || '',
          duration: video.duration,
          localVideo: `/videos/${video.localVideo.split('/').pop()}`,
          videoType: VIDEO_TYPES.LOCAL,
          isPrivate: video.isPrivate
        };
      } else if (videoType === VIDEO_TYPES.EXTERNAL && video.videoUrl) {
        return {
          id: video.id,
          title: video.title,
          description: video.description || '',
          duration: video.duration,
          videoUrl: video.videoUrl,
          videoType: VIDEO_TYPES.EXTERNAL,
          isPrivate: video.isPrivate
        };
      } else {
        // Текстовое видео или неопределенный тип
        return {
          id: video.id,
          title: video.title,
          description: video.description || '',
          duration: video.duration,
          videoType: VIDEO_TYPES.TEXT,
          isPrivate: video.isPrivate
        };
      }
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

      // Обработка YouTube URL для мобильных устройств
      if (video.videoUrl) {
        video.videoUrl = formatYoutubeUrl(video.videoUrl);
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
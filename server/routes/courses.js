// server/routes/courses.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { courseModel } = require('../models/data-model');
const { VIDEO_TYPES, STORAGE_CONFIG } = require('../config'); // Обновляем импорт констант
const mime = require('mime');

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
    console.log(`Запрос видео: courseId=${req.params.courseId}, videoId=${req.params.videoId}`);
    
    const language = req.query.language || 'ru';
    
    // Получаем все курсы
    const courses = courseModel.getAll(language);
    
    // Находим курс по ID
    const course = courses.find(c => c.id === req.params.courseId && c.language === language);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Находим видео в курсе
    const video = course.videos.find(v => v.id === req.params.videoId);
    
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    // Проверяем данные видео и корректируем их при необходимости
    if (video.localVideo && !video.storagePath && STORAGE_CONFIG.USE_REMOTE_STORAGE) {
      // Если есть localVideo, но нет storagePath при активном удаленном хранилище,
      // устанавливаем storagePath равным localVideo и меняем тип
      console.log(`Обновляем данные видео ${video.id}: добавляем storagePath на основе localVideo`);
      video.storagePath = video.localVideo;
      video.videoType = VIDEO_TYPES.STORAGE;
      
      // Сохраняем изменения в базе
      courseModel.save(courses);
    }
    
    // Определяем тип видео, если он не указан
    if (!video.videoType) {
      if (video.storagePath && STORAGE_CONFIG.USE_REMOTE_STORAGE) {
        video.videoType = VIDEO_TYPES.STORAGE;
      } else if (video.localVideo || video.storagePath) {
        video.videoType = VIDEO_TYPES.LOCAL;
      } else if (video.videoUrl) {
        video.videoType = VIDEO_TYPES.EXTERNAL;
      } else {
        video.videoType = VIDEO_TYPES.TEXT;
      }
      
      // Сохраняем изменения в базе
      courseModel.save(courses);
    }
    
    // Возвращаем видео
    console.log(`Отправляем данные видео: ${video.id}, тип: ${video.videoType}, storagePath: ${video.storagePath || 'нет'}`);
    
    return res.json(video);
  } catch (err) {
    console.error(`Error getting video ${req.params.videoId}:`, err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Маршрут для стриминга видео с поддержкой chunk-загрузки
router.get('/videos/:filename', async (req, res) => {
  const filename = req.params.filename;
  
  if (!filename) {
    return res.status(400).json({ message: 'Filename is required' });
  }
  
  try {
    // Очищаем имя файла от запрещенных символов
    const cleanFilename = filename.replace(/\.\./g, '');
    const videoPath = path.join(__dirname, '../data/videos', cleanFilename);
    
    console.log(`Streaming video: ${videoPath}`);
    
    if (!fs.existsSync(videoPath)) {
      console.error(`Video file not found: ${videoPath}`);
      return res.status(404).json({ message: 'Video not found' });
    }
    
    // Получение информации о файле
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const mimeType = mime.getType(path.extname(videoPath)) || 'video/mp4';
    
    // ТЕСТОВОЕ ОГРАНИЧЕНИЕ: ограничиваем размер видео до примерно 10 секунд
    const tenSecondsChunkSize = 10 * 1024 * 1024; // примерно 10 секунд видео
    const limitedFileSize = Math.min(fileSize, tenSecondsChunkSize);
    
    console.log(`ТЕСТ: ограничиваем видео до ${limitedFileSize} байт (≈10 секунд)`);
    
    // Получаем заголовок Range, если он присутствует
    const range = req.headers.range;
    
    if (range) {
      // Разбираем диапазон на начальную и конечную позиции
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      
      // Если начальная позиция больше нашего ограничения, возвращаем ошибку
      if (start >= limitedFileSize) {
        console.log(`ТЕСТ: запрошенный диапазон за пределами тестового лимита в 10 секунд`);
        return res.status(416).json({ message: 'Requested Range Not Satisfiable - Test limit' });
      }
      
      // Если конечная позиция не указана, используем размер чанка или конец файла
      const chunkSize = 1024 * 1024; // 1MB чанки
      let end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + chunkSize, limitedFileSize - 1);
      
      // Ограничиваем конечную позицию нашим лимитом
      end = Math.min(end, limitedFileSize - 1);
      
      // Размер части для отправки
      const contentLength = (end - start) + 1;
      
      console.log(`ТЕСТ: стриминг чанка: start=${start}, end=${end}, length=${contentLength}`);
      
      // Устанавливаем правильные заголовки для частичного контента
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${limitedFileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': contentLength,
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600'
      });
      
      // Создаем поток для чтения файла в заданном диапазоне
      const fileStream = fs.createReadStream(videoPath, { start, end });
      
      // При ошибке чтения отправляем 500
      fileStream.on('error', (error) => {
        console.error(`Error streaming file: ${error.message}`);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error streaming video' });
        }
      });
      
      // Отправляем поток клиенту
      fileStream.pipe(res);
    } else {
      // Если клиент не запросил Range, отправляем весь файл с правильными заголовками
      res.writeHead(200, {
        'Content-Length': limitedFileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600'
      });
      
      // Отправляем ограниченную часть файла
      const fileStream = fs.createReadStream(videoPath, { end: limitedFileSize - 1 });
      fileStream.on('error', (error) => {
        console.error(`Error streaming limited file: ${error.message}`);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error streaming video' });
        }
      });
      
      fileStream.pipe(res);
    }
  } catch (error) {
    console.error(`Error accessing video file: ${error.message}`);
    res.status(500).json({ message: 'Server error accessing video' });
  }
});

module.exports = router;
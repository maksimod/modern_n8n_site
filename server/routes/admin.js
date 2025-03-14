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
const { VIDEO_TYPES } = require('../config'); // Добавляем импорт констант


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

// Путь к файлу с курсами
const COURSES_FILE = path.join(__dirname, '../data/db/courses.json');

// Функция для чтения курсов из файла
const getCourses = () => {
  try {
    if (!fs.existsSync(COURSES_FILE)) {
      // Если файл не существует, создаем его с пустым массивом
      const dataDir = path.dirname(COURSES_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(COURSES_FILE, JSON.stringify([]));
      return [];
    }
    
    const data = fs.readFileSync(COURSES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading courses file:', error);
    return [];
  }
};

// Функция для сохранения курсов в файл
const saveCourses = (courses) => {
  try {
    const dataDir = path.dirname(COURSES_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(COURSES_FILE, JSON.stringify(courses, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving courses file:', error);
    return false;
  }
};

// Get all courses (Admin view)
router.get('/courses', [auth, isAdmin], async (req, res) => {
  try {
    const language = req.query.language || 'ru';
    const courses = getCourses().filter(course => course.language === language);
    res.json(courses);
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
    
    // Проверяем наличие обязательных полей
    if (!id || !title || !language) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Получаем существующие курсы
    const courses = getCourses();
    
    // Проверяем, существует ли курс с таким ID и language
    const existingCourseIndex = courses.findIndex(c => c.id === id && c.language === language);
    
    // Создаем объект курса
    const courseData = {
      id,
      title,
      description: description || '',
      language: language || 'ru',
      videos: videos || []
    };
    
    if (existingCourseIndex !== -1) {
      // Обновляем существующий курс
      courses[existingCourseIndex] = courseData;
    } else {
      // Добавляем новый курс
      courses.push(courseData);
    }
    
    // Сохраняем курсы
    saveCourses(courses);
    
    // Возвращаем созданный/обновленный курс
    res.status(201).json(courseData);
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
    
    console.log("Updating course:", courseId);
    console.log("Videos data before processing:", videos);
    
    // Обработка видео перед сохранением
    const processedVideos = videos ? videos.map(video => {
      // Обработка типов видео
      let videoType = video.videoType || 'text';
      
      // Очистка путей к файлам от префиксов
      let localVideo = video.localVideo || '';
      if (localVideo.startsWith('/videos/')) {
        localVideo = localVideo.substring(8);
      }
      
      return {
        ...video,
        videoType,
        localVideo
      };
    }) : [];
    
    console.log("Videos after processing:", processedVideos);
    
    // Получаем существующие курсы
    const courses = getCourses();
    
    // Ищем курс для обновления
    const courseIndex = courses.findIndex(c => c.id === courseId && c.language === language);
    
    if (courseIndex === -1) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Обновляем курс
    courses[courseIndex] = {
      id: courseId,
      title,
      description: description || '',
      language,
      videos: processedVideos
    };
    
    // Сохраняем курсы
    saveCourses(courses);
    
    // Возвращаем обновленный курс
    res.json(courses[courseIndex]);
  } catch (err) {
    console.error(`Error updating course ${req.params.courseId}:`, err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a course
router.delete('/courses/:courseId', [auth, isAdmin], async (req, res) => {
  try {
    const { courseId } = req.params;
    const language = req.query.language || 'ru';
    
    // Получаем существующие курсы
    const courses = getCourses();
    
    // Находим курс перед удалением для обработки его видео
    const courseToDelete = courses.find(c => c.id === courseId && c.language === language);
    
    if (!courseToDelete) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Удаляем все локальные видеофайлы, связанные с курсом
    if (courseToDelete.videos && courseToDelete.videos.length > 0) {
      courseToDelete.videos.forEach(video => {
        if (video.localVideo) {
          // Очищаем путь от возможных префиксов
          const cleanVideoPath = video.localVideo.replace(/^\/videos\//, '');
          const videoPath = path.join(__dirname, '../data/videos', cleanVideoPath);
          
          console.log(`Attempting to delete course video file: ${videoPath}`);
          
          if (fs.existsSync(videoPath)) {
            try {
              fs.unlinkSync(videoPath);
              console.log(`Successfully deleted course video file: ${videoPath}`);
            } catch (fileError) {
              console.error(`Error deleting course video file: ${fileError}`);
            }
          } else {
            console.log(`Course video file not found: ${videoPath}`);
          }
        }
      });
    }
    
    // Фильтруем курсы, исключая удаляемый
    const filteredCourses = courses.filter(c => !(c.id === courseId && c.language === language));
    
    if (filteredCourses.length === courses.length) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Сохраняем обновленный список курсов
    saveCourses(filteredCourses);
    
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
    const language = req.query.language || videoData.language || 'ru';
    
    // Проверяем наличие обязательных полей
    if (!videoData.id || !videoData.title) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Получаем существующие курсы
    const courses = getCourses();
    
    // Ищем курс
    const courseIndex = courses.findIndex(c => c.id === courseId && c.language === language);
    
    if (courseIndex === -1) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Добавляем видео к курсу
    if (!courses[courseIndex].videos) {
      courses[courseIndex].videos = [];
    }
    
    // Проверяем, существует ли видео с таким ID
    const existingVideoIndex = courses[courseIndex].videos.findIndex(v => v.id === videoData.id);
    
    if (existingVideoIndex !== -1) {
      // Обновляем существующее видео
      courses[courseIndex].videos[existingVideoIndex] = videoData;
    } else {
      // Добавляем новое видео
      courses[courseIndex].videos.push(videoData);
    }
    
    // Сохраняем курсы
    saveCourses(courses);
    
    // Возвращаем добавленное/обновленное видео
    res.status(201).json(videoData);
  } catch (err) {
    console.error('Error adding video:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a video
// Маршрут для обновления видео - замените полностью
router.put('/courses/:courseId/videos/:videoId', [auth, isAdmin], async (req, res) => {
  try {
    const { courseId, videoId } = req.params;
    const videoData = req.body;
    const language = req.query.language || videoData.language || 'ru';
    
    // Получаем существующие курсы
    const courses = getCourses();
    
    // Ищем курс
    const courseIndex = courses.findIndex(c => c.id === courseId && c.language === language);
    
    if (courseIndex === -1) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Ищем видео
    if (!courses[courseIndex].videos) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    const videoIndex = courses[courseIndex].videos.findIndex(v => v.id === videoId);
    
    if (videoIndex === -1) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    // Получаем текущее видео
    const currentVideo = courses[courseIndex].videos[videoIndex];
    
    // Проверяем, нужно ли удалить видеофайл
    if (currentVideo.localVideo) {
      const shouldDeleteFile = 
        !videoData.localVideo || // Файла больше нет
        currentVideo.localVideo !== videoData.localVideo || // Имя файла изменилось
        videoData.videoType !== VIDEO_TYPES.LOCAL; // Тип изменился с локального
      
      if (shouldDeleteFile) {
        // Очищаем путь от возможных префиксов
        const cleanVideoPath = currentVideo.localVideo.replace(/^\/videos\//, '');
        const videoPath = path.join(__dirname, '../data/videos', cleanVideoPath);
        
        console.log(`Attempting to delete old video file: ${videoPath}`);
        
        if (fs.existsSync(videoPath)) {
          try {
            fs.unlinkSync(videoPath);
            console.log(`Successfully deleted old video file: ${videoPath}`);
          } catch (fileError) {
            console.error(`Error deleting old video file: ${fileError}`);
          }
        } else {
          console.log(`Old video file not found: ${videoPath}`);
        }
      }
    }
    
    // Очищаем путь к новому файлу, если он есть
    if (videoData.localVideo && videoData.localVideo.startsWith('/videos/')) {
      videoData.localVideo = videoData.localVideo.replace(/^\/videos\//, '');
    }
    
    // Обновляем видео
    courses[courseIndex].videos[videoIndex] = {
      ...videoData,
      id: videoId // Убеждаемся, что ID остается неизменным
    };
    
    // Сохраняем курсы
    saveCourses(courses);
    
    // Возвращаем обновленное видео
    res.json(courses[courseIndex].videos[videoIndex]);
  } catch (err) {
    console.error(`Error updating video ${req.params.videoId}:`, err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a video
// Маршрут для удаления курса - замените полностью
router.delete('/courses/:courseId', [auth, isAdmin], async (req, res) => {
  try {
    const { courseId } = req.params;
    const language = req.query.language || 'ru';
    
    // Получаем существующие курсы
    const courses = getCourses();
    
    // Находим курс перед удалением для обработки его видео
    const courseToDelete = courses.find(c => c.id === courseId && c.language === language);
    
    if (!courseToDelete) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Удаляем все локальные видеофайлы, связанные с курсом
    if (courseToDelete.videos && courseToDelete.videos.length > 0) {
      courseToDelete.videos.forEach(video => {
        if (video.localVideo) {
          // Очищаем путь от возможных префиксов
          const cleanVideoPath = video.localVideo.replace(/^\/videos\//, '');
          const videoPath = path.join(__dirname, '../data/videos', cleanVideoPath);
          
          console.log(`Attempting to delete course video file: ${videoPath}`);
          
          if (fs.existsSync(videoPath)) {
            try {
              fs.unlinkSync(videoPath);
              console.log(`Successfully deleted course video file: ${videoPath}`);
            } catch (fileError) {
              console.error(`Error deleting course video file: ${fileError}`);
            }
          } else {
            console.log(`Course video file not found: ${videoPath}`);
          }
        }
      });
    }
    
    // Фильтруем курсы, исключая удаляемый
    const filteredCourses = courses.filter(c => !(c.id === courseId && c.language === language));
    
    if (filteredCourses.length === courses.length) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Сохраняем обновленный список курсов
    saveCourses(filteredCourses);
    
    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    console.error(`Error deleting course ${req.params.courseId}:`, err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Добавьте этот маршрут для удаления файлов - должен быть полностью новым
router.delete('/files/:fileName', [auth, isAdmin], async (req, res) => {
  try {
    const { fileName } = req.params;
    
    // Проверяем валидность имени файла (защита от path traversal)
    if (!fileName || fileName.includes('..') || fileName.includes('/')) {
      return res.status(400).json({ message: 'Invalid file name' });
    }
    
    const filePath = path.join(__dirname, '../data/videos', fileName);
    console.log(`Attempting to delete file: ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`Successfully deleted file: ${filePath}`);
        res.json({ success: true, message: 'File deleted successfully' });
      } catch (fileError) {
        console.error(`Error deleting file: ${fileError}`);
        res.status(500).json({ message: 'Error deleting file', error: fileError.message });
      }
    } else {
      console.log(`File not found: ${filePath}`);
      res.status(404).json({ message: 'File not found' });
    }
  } catch (err) {
    console.error('Error in file delete route:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update video positions (reordering)
router.put('/courses/:courseId/videos/positions', [auth, isAdmin], async (req, res) => {
  try {
    const { courseId } = req.params;
    const { positions } = req.body;
    const language = req.query.language || 'ru';
    
    // Получаем существующие курсы
    const courses = getCourses();
    
    // Ищем курс
    const courseIndex = courses.findIndex(c => c.id === courseId && c.language === language);
    
    if (courseIndex === -1) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Если есть массив позиций, обновляем порядок
    if (positions && Array.isArray(positions)) {
      // Обновляем порядок согласно предоставленным ID
      courses[courseIndex].videos = courses[courseIndex].videos.sort((a, b) => {
        return positions.indexOf(a.id) - positions.indexOf(b.id);
      });
    }
    
    // Сохраняем курсы
    saveCourses(courses);
    
    res.json({ 
      message: 'Video positions updated successfully',
      videos: courses[courseIndex].videos 
    });
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
    
    // Получаем ТОЛЬКО имя файла без пути
    const fileName = path.basename(req.file.path);
    
    // Формируем относительный путь для отображения
    const relativePath = `/videos/${fileName}`;
    
    console.log('File uploaded:', {
      originalName: req.file.originalname,
      savedAs: fileName,
      fullPath: req.file.path,
      relativePath: relativePath
    });
    
    // Но возвращаем ТОЛЬКО имя файла, без пути /videos/
    res.json({
      message: 'File uploaded successfully',
      filePath: fileName, // Только имя файла!
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});


const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
// API для получения информации о диске
// API для получения информации о диске
router.get('/disk-usage', [auth, isAdmin], async (req, res) => {
  try {
    // Путь к директории с видео
    const videosPath = path.join(__dirname, '../data/videos');
    
    // Если директория не существует, создаем её
    if (!fs.existsSync(videosPath)) {
      fs.mkdirSync(videosPath, { recursive: true });
    }
    
    // Получаем информацию о диске с помощью команды df
    let diskInfo;
    try {
      // Для Windows используем команду wmic
      if (process.platform === 'win32') {
        const drive = videosPath.split(path.sep)[0] || 'C:';
        const { stdout } = await execPromise(`wmic logicaldisk where "DeviceID='${drive}'" get Size,FreeSpace /format:value`);
        
        const sizeMatch = stdout.match(/Size=(\d+)/);
        const freeMatch = stdout.match(/FreeSpace=(\d+)/);
        
        if (sizeMatch && freeMatch) {
          const total = parseInt(sizeMatch[1]);
          const free = parseInt(freeMatch[1]);
          
          diskInfo = {
            total,
            free,
            used: total - free
          };
        }
      } else {
        // Для Unix-подобных систем используем df
        const { stdout } = await execPromise(`df -B1 "${videosPath}"`);
        const lines = stdout.trim().split('\n');
        const parts = lines[1].split(/\s+/);
        
        diskInfo = {
          total: parseInt(parts[1]),
          used: parseInt(parts[2]),
          free: parseInt(parts[3])
        };
      }
    } catch (cmdError) {
      console.error('Error executing disk command:', cmdError);
      
      // Запасной вариант - установить значения по умолчанию
      diskInfo = {
        total: 100 * 1024 * 1024 * 1024, // 100GB
        free: 50 * 1024 * 1024 * 1024,  // 50GB
        used: 50 * 1024 * 1024 * 1024   // 50GB
      };
    }
    
    // Вычисляем размер директории с видео
    const videoFiles = fs.readdirSync(videosPath);
    let videoSize = 0;
    
    for (const file of videoFiles) {
      const filePath = path.join(videosPath, file);
      try {
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          videoSize += stats.size;
        }
      } catch (err) {
        console.error(`Error getting stats for file ${file}:`, err);
      }
    }
    
    // Формируем ответ с полной информацией
    res.json({
      total: diskInfo.total,
      free: diskInfo.free,
      used: diskInfo.used,
      videos: {
        count: videoFiles.length,
        size: videoSize
      }
    });
  } catch (err) {
    console.error('Error getting disk usage:', err);
    res.status(500).json({ 
      message: 'Server error: ' + err.message,
      error: true
    });
  }
});

// Новый маршрут для удаления всех видео файлов
router.delete('/delete-all-videos', [auth, isAdmin], async (req, res) => {
  try {
    const videosPath = path.join(__dirname, '../data/videos');
    
    // Проверяем существование директории
    if (!fs.existsSync(videosPath)) {
      fs.mkdirSync(videosPath, { recursive: true });
      return res.json({ success: true, message: 'No videos to delete', deletedCount: 0 });
    }

    // Получаем список всех файлов
    const files = fs.readdirSync(videosPath);
    let deletedCount = 0;
    let errors = [];
    
    // Удаляем каждый файл
    for (const file of files) {
      const filePath = path.join(videosPath, file);
      try {
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          fs.unlinkSync(filePath);
          console.log(`Successfully deleted video file: ${filePath}`);
          deletedCount++;
        }
      } catch (error) {
        console.error(`Error deleting file ${file}:`, error);
        errors.push({ file, error: error.message });
      }
    }
    
    // Обновляем ссылки в JSON файле курсов
    const courses = getCourses();
    let updatedCourses = false;
    
    // Проходим по всем курсам и их видео
    for (const course of courses) {
      if (course.videos && course.videos.length > 0) {
        for (const video of course.videos) {
          if (video.localVideo) {
            // Удаляем ссылку на локальное видео, меняя тип на текстовый
            video.localVideo = '';
            video.videoType = VIDEO_TYPES.TEXT;
            updatedCourses = true;
          }
        }
      }
    }
    
    // Сохраняем обновленные курсы, если были изменения
    if (updatedCourses) {
      saveCourses(courses);
    }
    
    // Отправляем результат
    res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} video files`,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error('Error deleting all videos:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error: ' + err.message 
    });
  }
});

// Маршрут для удаления файла
router.delete('/files/:fileName', [auth, isAdmin], async (req, res) => {
  try {
    const { fileName } = req.params;
    
    // Проверяем валидность имени файла (защита от path traversal)
    if (!fileName || fileName.includes('..') || fileName.includes('/')) {
      return res.status(400).json({ message: 'Invalid file name' });
    }
    
    const filePath = path.join(__dirname, '../data/videos', fileName);
    console.log(`Attempting to delete file: ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`Successfully deleted file: ${filePath}`);
        res.json({ success: true, message: 'File deleted successfully' });
      } catch (fileError) {
        console.error(`Error deleting file: ${fileError}`);
        res.status(500).json({ message: 'Error deleting file', error: fileError.message });
      }
    } else {
      console.log(`File not found: ${filePath}`);
      res.status(404).json({ message: 'File not found' });
    }
  } catch (err) {
    console.error('Error in file delete route:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Добавьте этот маршрут для удаления видео внутри существующего файла
router.delete('/courses/:courseId/videos/:videoId', [auth, isAdmin], async (req, res) => {
  try {
    const { courseId, videoId } = req.params;
    const language = req.query.language || 'ru';
    
    console.log(`[DELETE VIDEO] Deleting video: courseId=${courseId}, videoId=${videoId}, language=${language}`);
    
    // Получаем существующие курсы
    const courses = getCourses();
    
    // Ищем курс
    const courseIndex = courses.findIndex(c => c.id === courseId && c.language === language);
    
    if (courseIndex === -1) {
      console.log(`[DELETE VIDEO] Course not found: ${courseId}, language=${language}`);
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Находим видео для получения информации о файле перед удалением
    const videoIndex = courses[courseIndex].videos.findIndex(v => v.id === videoId);
    
    if (videoIndex === -1) {
      console.log(`[DELETE VIDEO] Video not found: ${videoId}`);
      return res.status(404).json({ message: 'Video not found' });
    }
    
    // Получаем информацию о видео перед удалением
    const videoToDelete = courses[courseIndex].videos[videoIndex];
    console.log('[DELETE VIDEO] Video to delete:', videoToDelete);
    
    // Удаляем видеофайл, если он существует
    let fileDeleted = false;
    if (videoToDelete.localVideo) {
      // Очищаем путь от возможных префиксов
      const cleanVideoPath = videoToDelete.localVideo.replace(/^\/videos\//, '');
      const videoPath = path.join(__dirname, '../data/videos', cleanVideoPath);
      
      console.log(`[DELETE VIDEO] Attempting to delete video file: ${videoPath}`);
      
      if (fs.existsSync(videoPath)) {
        try {
          fs.unlinkSync(videoPath);
          console.log(`[DELETE VIDEO] Successfully deleted video file: ${videoPath}`);
          fileDeleted = true;
        } catch (fileError) {
          console.error(`[DELETE VIDEO] Error deleting video file: ${fileError}`);
          // Продолжаем выполнение даже при ошибке удаления файла
        }
      } else {
        console.log(`[DELETE VIDEO] Video file not found: ${videoPath}`);
      }
    }
    
    // Удаляем видео из списка
    courses[courseIndex].videos.splice(videoIndex, 1);
    
    // Сохраняем обновленный список курсов
    saveCourses(courses);
    
    console.log('[DELETE VIDEO] Video successfully removed from courses data');
    
    res.json({ 
      success: true,
      message: 'Video deleted successfully', 
      fileDeleted,
      videoId,
      courseId
    });
  } catch (err) {
    console.error(`[DELETE VIDEO] Error deleting video: ${err.message}`);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
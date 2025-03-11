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
    
    // Проверяем наличие обязательных полей
    if (!title || !language) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
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
      videos: videos || []
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
router.put('/courses/:courseId/videos/:videoId', [auth, isAdmin], async (req, res) => {
  try {
    const { courseId, videoId } = req.params;
    const videoData = req.body;
    const language = req.query.language || videoData.language || 'ru';
    
    // Проверяем наличие обязательных полей
    if (!videoData.title) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
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
router.delete('/courses/:courseId/videos/:videoId', [auth, isAdmin], async (req, res) => {
  try {
    const { courseId, videoId } = req.params;
    const language = req.query.language || 'ru';
    
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
    
    // Фильтруем видео, исключая удаляемое
    const filteredVideos = courses[courseIndex].videos.filter(v => v.id !== videoId);
    
    if (filteredVideos.length === courses[courseIndex].videos.length) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    // Обновляем список видео
    courses[courseIndex].videos = filteredVideos;
    
    // Сохраняем курсы
    saveCourses(courses);
    
    res.json({ message: 'Video deleted successfully' });
  } catch (err) {
    console.error(`Error deleting video ${req.params.videoId}:`, err);
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
    
    // Обновляем позиции видео
    // Здесь можно реализовать логику обновления позиций
    
    // Сохраняем курсы
    saveCourses(courses);
    
    res.json({ message: 'Video positions updated successfully' });
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
    
    // Получаем путь относительно директории videos
    const fileName = path.basename(req.file.path);
    const relativePath = `/videos/${fileName}`;
    
    console.log('File uploaded:', {
      originalName: req.file.originalname,
      savedAs: fileName,
      fullPath: req.file.path,
      relativePath: relativePath
    });
    
    res.json({
      message: 'File uploaded successfully',
      filePath: relativePath,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

module.exports = router;
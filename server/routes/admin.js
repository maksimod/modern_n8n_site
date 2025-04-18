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
const { VIDEO_TYPES, STORAGE_CONFIG } = require('../config'); // Обновляем импорт
const axios = require('axios'); // Добавляем axios для HTTP запросов
const FormData = require('form-data'); // Для отправки multipart/form-data
const { uploadFileToStorage } = require('../utils/file-uploader'); // Импортируем функцию загрузки файлов

// Временное хранилище для загрузки файлов перед отправкой в веб-хранилище
const tempStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadPath = path.join(__dirname, '../temp');
    
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
  storage: tempStorage,
  limits: { fileSize: 5000 * 1024 * 1024 }, // Увеличиваем до 5GB
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
    if (!data || data.trim() === '') {
      console.warn('Empty courses file found, returning empty array');
      return [];
    }
    
    try {
      return JSON.parse(data);
    } catch (parseError) {
      console.error('Error parsing courses JSON:', parseError);
      // Создаем резервную копию поврежденного файла
      const backupFile = `${COURSES_FILE}.backup.${Date.now()}`;
      fs.copyFileSync(COURSES_FILE, backupFile);
      console.log(`Created backup of corrupt courses file at: ${backupFile}`);
      return [];
    }
  } catch (error) {
    console.error('Error reading courses file:', error);
    return [];
  }
};

// Функция для сохранения курсов в файл с повторными попытками
const saveCourses = (courses) => {
  // Проверяем, что courses - массив
  if (!Array.isArray(courses)) {
    console.error('Cannot save courses: provided data is not an array');
    return false;
  }

  // Максимальное количество попыток записи файла
  const MAX_RETRIES = 3;
  let retryCount = 0;
  let saveSuccess = false;

  while (retryCount < MAX_RETRIES && !saveSuccess) {
    try {
      // Создаем директорию, если её нет
      const dataDir = path.dirname(COURSES_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Если это повторная попытка, ждем немного
      if (retryCount > 0) {
        console.log(`Retry attempt ${retryCount}/${MAX_RETRIES} to save courses file`);
        // Синхронная задержка для повторных попыток
        const waitTime = 100 * retryCount; // 100ms, 200ms, 300ms
        const startTime = Date.now();
        while (Date.now() - startTime < waitTime) {
          // Активное ожидание
        }
      }
      
      // Сначала записываем во временный файл
      const tempFile = `${COURSES_FILE}.temp`;
      const jsonData = JSON.stringify(courses, null, 2);
      
      // Проверяем, что данные для записи не пусты
      if (!jsonData || jsonData.trim() === '' || jsonData === '[]') {
        console.warn('Warning: Empty data or empty array to write');
      }
      
      // Запись с использованием синхронной операции
      fs.writeFileSync(tempFile, jsonData, { encoding: 'utf8', flag: 'w' });
      
      // Проверяем, что временный файл содержит валидный JSON и не пуст
      if (!fs.existsSync(tempFile)) {
        throw new Error('Temp file was not created');
      }
      
      const tempData = fs.readFileSync(tempFile, 'utf8');
      if (!tempData || tempData.trim() === '') {
        throw new Error('Empty data written to temp file');
      }
      
      try {
        // Проверяем, что можем распарсить записанный JSON
        JSON.parse(tempData);
      } catch (parseError) {
        throw new Error(`Invalid JSON written to temp file: ${parseError.message}`);
      }
      
      // Создаем резервную копию текущего файла если он существует
      if (fs.existsSync(COURSES_FILE)) {
        const backupFile = `${COURSES_FILE}.backup`;
        fs.copyFileSync(COURSES_FILE, backupFile);
      }
      
      // Атомарно заменяем основной файл временным
      fs.renameSync(tempFile, COURSES_FILE);
      
      // Верификация: проверяем, что файл обновился корректно
      const verifyData = fs.readFileSync(COURSES_FILE, 'utf8');
      const verifyJson = JSON.parse(verifyData);
      
      // Проверяем, что количество данных совпадает
      if (verifyJson.length !== courses.length) {
        throw new Error(`Data verification failed: Expected ${courses.length} items, got ${verifyJson.length}`);
      }
      
      console.log(`Courses file saved successfully at ${new Date().toISOString()}, with ${courses.length} courses`);
      saveSuccess = true;
      return true;
    } catch (error) {
      console.error(`Error saving courses file (attempt ${retryCount+1}/${MAX_RETRIES}):`, error);
      retryCount++;
      
      // При ошибке на последней попытке, попробуем сделать прямую запись в основной файл
      if (retryCount >= MAX_RETRIES) {
        try {
          console.warn('Last resort: attempting direct write to main file');
          fs.writeFileSync(COURSES_FILE, JSON.stringify(courses, null, 2), { encoding: 'utf8', flag: 'w' });
          console.log('Direct write to main file completed');
          return true;
        } catch (finalError) {
          console.error('Final write attempt failed:', finalError);
          return false;
        }
      }
    }
  }
  
  return saveSuccess;
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

// ВАЖНАЯ ФИКС: Правильный маршрут для удаления видео
router.delete('/courses/:courseId/videos/:videoId', [auth, isAdmin], async (req, res) => {
  try {
    const { courseId, videoId } = req.params;
    const language = req.query.language || 'ru';
    
    console.log(`==== DELETING VIDEO: courseId=${courseId}, videoId=${videoId}, language=${language} ====`);
    
    // Получаем существующие курсы
    let courses;
    try {
      courses = getCourses();
      if (!Array.isArray(courses)) {
        console.error('Error: courses is not an array!', typeof courses, courses);
        courses = []; // Защитная инициализация, если getCourses не вернул массив
      }
    } catch (courseReadError) {
      console.error('Critical error reading courses file:', courseReadError);
      return res.status(500).json({ 
        message: 'Failed to read courses data',
        error: courseReadError.message
      });
    }
    
    // Диагностическая информация о всех курсах
    console.log(`Total courses loaded: ${courses.length}`);
    
    // Ищем курс
    const courseIndex = courses.findIndex(c => c.id === courseId && c.language === language);
    
    if (courseIndex === -1) {
      console.log(`Course not found: ${courseId}, language=${language}`);
      return res.status(404).json({ message: 'Course not found' });
    }
    
    const course = courses[courseIndex];
    console.log(`Found course: ${course.title}, videos count: ${course.videos ? course.videos.length : 0}`);
    
    // Проверяем наличие массива видео
    if (!course.videos || !Array.isArray(course.videos)) {
      console.log(`No videos array in course: ${courseId}`);
      return res.status(404).json({ message: 'No videos in this course' });
    }
    
    // Выводим диагностическую информацию о всех видео в курсе
    course.videos.forEach((vid, idx) => {
      console.log(`[${idx}] Video ID=${vid.id}, Title=${vid.title}, Type=${vid.videoType || 'unknown'}`);
    });
    
    // Находим видео
    const videoIndex = course.videos.findIndex(v => v.id === videoId);
    
    if (videoIndex === -1) {
      console.log(`Video not found: ${videoId}`);
      
      // Расширенная диагностика - ищем похожие ID
      const similarVideos = course.videos.filter(v => 
        v.id && v.id.includes(videoId) || (videoId && videoId.includes(v.id))
      );
      
      if (similarVideos.length > 0) {
        console.log('Found similar video IDs:');
        similarVideos.forEach(v => console.log(`- ${v.id} (${v.title})`));
      }
      
      return res.status(404).json({ message: 'Video not found' });
    }
    
    // Получаем видео перед удалением
    const videoToDelete = course.videos[videoIndex];
    console.log(`Found video to delete: ${videoToDelete.title}, type: ${videoToDelete.videoType || 'unknown'}`);
    console.log('Full video object:', JSON.stringify(videoToDelete, null, 2));
    
    // Удаляем файл, только если это локальное видео 
    let fileDeleted = false;
    if (videoToDelete.videoType === VIDEO_TYPES.LOCAL && videoToDelete.localVideo) {
      const videoFileName = videoToDelete.localVideo.replace(/^\/videos\//, '');
      const videoPath = path.join(__dirname, '../data/videos', videoFileName);
      
      console.log(`Checking local video file: ${videoPath}`);
      
      if (fs.existsSync(videoPath)) {
        try {
          fs.unlinkSync(videoPath);
          console.log(`Successfully deleted local video file: ${videoPath}`);
          fileDeleted = true;
        } catch (fileErr) {
          console.error(`Error deleting local video file: ${fileErr.message}`);
        }
      } else {
        console.log(`Local video file not found: ${videoPath}`);
      }
    }
    
    // Создаем копию курса перед изменением для диагностики
    const originalVideosCount = course.videos.length;
    
    // ВАЖНО: Удаление видео из массива (для ВСЕХ типов видео)
    course.videos.splice(videoIndex, 1);
    console.log(`Removed video from array, new count: ${course.videos.length}, original count: ${originalVideosCount}`);
    
    // Проверяем, что видео действительно удалено
    const videoStillExists = course.videos.some(v => v.id === videoId);
    if (videoStillExists) {
      console.error('CRITICAL ERROR: Video still exists in the array after deletion!');
      // Принудительно удаляем видео с заданным ID
      course.videos = course.videos.filter(v => v.id !== videoId);
      console.log(`Forced array filtering, new count: ${course.videos.length}`);
    }
    
    // Сохраняем обновленные курсы
    let saveResult;
    try {
      saveResult = saveCourses(courses);
      console.log(`Courses saved result: ${saveResult}`);
      
      // Проверяем, что изменения действительно сохранились
      const verifiedCourses = getCourses();
      const verifiedCourse = verifiedCourses.find(c => c.id === courseId && c.language === language);
      
      if (!verifiedCourse) {
        console.error('VERIFICATION ERROR: Course not found after save!');
      } else {
        const videoStillExistsAfterSave = verifiedCourse.videos && 
                                        verifiedCourse.videos.some(v => v.id === videoId);
        
        if (videoStillExistsAfterSave) {
          console.error('VERIFICATION ERROR: Video still exists after save!');
          console.log('Attempting emergency direct removal...');
          
          // Экстренное повторное удаление
          verifiedCourse.videos = verifiedCourse.videos.filter(v => v.id !== videoId);
          const emergencySave = saveCourses(verifiedCourses);
          console.log(`Emergency save result: ${emergencySave}`);
        } else {
          console.log('Verification successful: Video successfully removed from database');
        }
      }
    } catch (saveError) {
      console.error('Error saving courses after video deletion:', saveError);
      // Даже если не удалось сохранить, видео уже удалено из памяти
      return res.status(500).json({ 
        message: 'Video removed from memory, but failed to save to database',
        error: saveError.message,
        partialSuccess: true,
        videoId
      });
    }
    
    if (!saveResult) {
      return res.status(500).json({ 
        message: 'Failed to save courses after video deletion',
        partialSuccess: true,
        videoId
      });
    }
    
    // Отправляем успешный ответ
    res.json({
      success: true,
      message: 'Video deleted successfully',
      videoId,
      fileDeleted,
      videoType: videoToDelete.videoType || 'unknown'
    });
    
    console.log(`==== VIDEO DELETION COMPLETED: ${videoId} ====`);
  } catch (err) {
    console.error(`Error deleting video: ${err.message}`, err.stack);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Upload a video file
router.post('/upload', [auth, isAdmin, upload.single('video')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Формируем имя файла и путь
    const fileName = path.basename(req.file.path);
    const filePath = req.file.path;
    
    console.log('Starting upload process:', {
      localPath: filePath,
      fileName: fileName,
      originalName: req.file.originalname,
      size: req.file.size,
      storageConfig: STORAGE_CONFIG
    });
    
    try {
      // Используем нашу функцию для загрузки файла в хранилище
      const uploadResult = await uploadFileToStorage(
        filePath, 
        fileName, 
        req.file.originalname, 
        req.file.size
      );
      
      console.log('Upload result from storage:', uploadResult);
      
      // Проверяем тип видео в результате и явно устанавливаем его
      let finalResult = { ...uploadResult };
      
      if (STORAGE_CONFIG.USE_REMOTE_STORAGE) {
        // Принудительно устанавливаем тип STORAGE если используется удаленное хранилище
        finalResult.videoType = VIDEO_TYPES.STORAGE;
        console.log('⭐ Override: Video type set to STORAGE');
        console.log('⭐ filePath (storagePath):', finalResult.filePath);
      } else {
        finalResult.videoType = VIDEO_TYPES.LOCAL;
        console.log('⭐ Override: Video type set to LOCAL');
        console.log('⭐ filePath (localVideo):', finalResult.filePath);
      }
      
      // Возвращаем результат загрузки
      return res.json(finalResult);
    } catch (processError) {
      console.error('Error processing file:', processError);
      
      // В случае общей ошибки, пытаемся удалить временный файл
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Temporary file deleted after process error: ${filePath}`);
        }
      } catch (e) {
        console.error(`Cannot delete temp file: ${filePath}`, e);
      }
      
      // Отправляем описательную ошибку
      return res.status(500).json({ 
        message: `File processing error: ${processError.message}`,
        error: processError.stack
      });
    }
  } catch (err) {
    console.error('Upload handler error:', err);
    return res.status(500).json({ 
      message: 'Server error during upload: ' + err.message,
      stack: err.stack
    });
  }
});

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// API для получения информации о диске
router.get('/disk-usage', [auth, isAdmin], async (req, res) => {
  try {
    // Путь к директории с видео
    const videosPath = path.join(__dirname, '../data/videos');

    // Если директория не существует, создаем её только если не используется удаленное хранилище
    // или включен режим резервного копирования
    if (!fs.existsSync(videosPath)) {
      if (!STORAGE_CONFIG.USE_REMOTE_STORAGE || STORAGE_CONFIG.FALLBACK_TO_LOCAL) {
        fs.mkdirSync(videosPath, { recursive: true });
        console.log(`Создана директория для видео при запросе места на диске: ${videosPath}`);
      } else {
        console.log('Пропускаем создание директории videos при запросе места на диске: используется удаленное хранилище без резервного копирования');
      }
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
    let videoFiles = [];
    let videoSize = 0;

    if (fs.existsSync(videosPath)) {
      videoFiles = fs.readdirSync(videosPath);
      
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
    // Удаляем только локальные видео, так как удаленные видео управляются отдельно
    const videosPath = path.join(__dirname, '../data/videos');

    // Проверяем существование директории
    if (!fs.existsSync(videosPath)) {
      // Не создаем директорию если используется удаленное хранилище без резервного копирования
      if (STORAGE_CONFIG.USE_REMOTE_STORAGE && !STORAGE_CONFIG.FALLBACK_TO_LOCAL) {
        console.log('Пропускаем создание директории videos при удалении: используется удаленное хранилище без резервного копирования');
        return res.json({ success: true, message: 'No videos to delete (remote storage mode)', deletedCount: 0 });
      }
      
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
          console.log(`Successfully deleted local video file: ${filePath}`);
          deletedCount++;
        }
      } catch (error) {
        console.error(`Error deleting file ${file}:`, error);
        errors.push({ file, error: error.message });
      }
    }

    // Обновляем ссылки в JSON файле курсов, только если используем удаленное хранилище
    const courses = getCourses();
    let updatedCourses = false;

    // Очищаем локальные ссылки на видео, так как удаленные видео всё равно останутся доступны
    if (STORAGE_CONFIG.USE_REMOTE_STORAGE) {
      console.log('Keeping remote video links in courses');
    } else {
      // Если не используем удаленное хранилище, очищаем все ссылки на локальные видео
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

// Update video positions (reordering)
router.put('/courses/:courseId/videos/positions', [auth, isAdmin], async (req, res) => {
  try {
    const { courseId } = req.params;
    const { positions } = req.body;
    const language = req.query.language || 'ru';
    
    if (!positions || !Array.isArray(positions)) {
      return res.status(400).json({ message: 'Video positions array is required' });
    }
    
    // Получаем существующие курсы
    const courses = getCourses();
    
    // Находим курс
    const courseIndex = courses.findIndex(c => c.id === courseId && c.language === language);
    
    if (courseIndex === -1) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    const course = courses[courseIndex];
    
    if (!course.videos || !Array.isArray(course.videos)) {
      return res.status(404).json({ message: 'No videos found in this course' });
    }
    
    // Создаем новый порядок видео
    const reorderedVideos = [];
    
    // Проходим по массиву позиций и формируем новый массив в нужном порядке
    for (const videoId of positions) {
      const video = course.videos.find(v => v.id === videoId);
      if (video) {
        reorderedVideos.push(video);
      }
    }
    
    // Добавляем видео, которые не были включены в массив positions (если такие есть)
    for (const video of course.videos) {
      if (!positions.includes(video.id)) {
        reorderedVideos.push(video);
      }
    }
    
    // Обновляем массив видео в курсе
    courses[courseIndex].videos = reorderedVideos;
    
    // Сохраняем обновленные курсы
    saveCourses(courses);
    
    // Возвращаем успешный результат
    res.json({ 
      success: true, 
      message: 'Video positions updated successfully',
      course: courses[courseIndex]
    });
  } catch (err) {
    console.error('Error updating video positions:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update course positions (reordering)
router.put('/courses/positions', [auth, isAdmin], async (req, res) => {
  try {
    const { positions } = req.body;
    const language = req.query.language || 'ru';
    
    if (!positions || !Array.isArray(positions)) {
      return res.status(400).json({ message: 'Course positions array is required' });
    }
    
    // Получаем существующие курсы
    const courses = getCourses();
    
    // Фильтруем курсы по языку
    const filteredCourses = courses.filter(course => course.language === language);
    
    // Сортируем курсы в соответствии с новым порядком
    const reorderedCourses = [];
    
    // Проходим по массиву позиций и формируем новый массив курсов в нужном порядке
    for (const courseId of positions) {
      const course = filteredCourses.find(c => c.id === courseId);
      if (course) {
        reorderedCourses.push(course);
      }
    }
    
    // Добавляем курсы, которые не были включены в массив positions
    for (const course of filteredCourses) {
      if (!positions.includes(course.id)) {
        reorderedCourses.push(course);
      }
    }
    
    // Создаем новый массив курсов, сохраняя курсы с другими языками
    const newCourses = courses.filter(course => course.language !== language);
    
    // Добавляем отсортированные курсы с выбранным языком
    newCourses.push(...reorderedCourses);
    
    // Сохраняем обновленные курсы
    saveCourses(newCourses);
    
    // Возвращаем успешный результат
    res.json({ 
      success: true, 
      message: 'Course positions updated successfully',
      courses: reorderedCourses
    });
  } catch (err) {
    console.error('Error updating course positions:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
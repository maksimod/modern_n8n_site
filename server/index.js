// server/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const fs = require('fs');
const progressRouter = require('./routes/progress');
// Система очистки должна быть включена только после того, 
// как все остальное будет работать корректно
// const { startCleanupJob } = require('./utils/user-cleaner');

const storageFixUtils = require('./utils/fix-storage');
const { getFileFromStorage } = require('./utils/file-uploader');
const { STORAGE_CONFIG } = require('./config');
require('dotenv').config();

// Создаем приложение Express
const app = express();

// Инициализируем директорию для видео
storageFixUtils.ensureVideosDirectory();

// Middleware
app.use(cors({
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
}));

// Увеличиваем лимит размера запроса
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Логирование запросов
app.use(morgan('dev'));

// Настраиваем обработку больших файлов
app.use((req, res, next) => {
  req.setTimeout(3600000); // 1 час
  res.setTimeout(3600000);
  next();
});

// Устанавливаем заглушки для хранилища
storageFixUtils.setupStorageMock(app);

// Подключаем маршруты
const authRouter = require('./routes/auth');
const coursesRouter = require('./routes/courses');
const adminRouter = require('./routes/admin');
const storageRouter = require('./routes/storage');

app.use('/api/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/storage', storageRouter);
app.use('/api/progress', progressRouter);

// Добавляем кэширование для статических файлов
const cacheTime = 86400000 * 7; // 7 дней

// Специальная настройка для видео-файлов
app.use((req, res, next) => {
  if (req.url.startsWith('/videos/') || req.url.endsWith('.mp4')) {
    // Добавляем CORS заголовки и настройки для видео
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
    res.setHeader('Accept-Ranges', 'bytes');
    
    if (req.url.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
    }
    
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 день
  }
  next();
});

// Единая функция для обработки видео-файлов
const handleVideoStream = async (req, res, filename) => {
  try {
    let videoData;
    let fileSize;
    
    if (STORAGE_CONFIG.USE_REMOTE_STORAGE) {
      // Получаем данные из удаленного хранилища
      try {
        videoData = await getFileFromStorage(filename);
        fileSize = videoData.length;
      } catch (error) {
        console.error(`Ошибка получения файла из удаленного хранилища: ${filename}`, error);
        return res.status(404).send('Файл не найден');
      }
    } else {
      // Используем локальное хранилище
      const videoPath = path.join(__dirname, 'data/videos', filename);
      
      if (!fs.existsSync(videoPath)) {
        return res.status(404).send('Файл не найден');
      }
      
      const stat = fs.statSync(videoPath);
      fileSize = stat.size;
    }
    
    // Поддержка частичной загрузки
    const range = req.headers.range;
    
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      
      // Устанавливаем общие заголовки
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
        'Cache-Control': 'public, max-age=86400'
      });
      
      if (STORAGE_CONFIG.USE_REMOTE_STORAGE) {
        // Отправляем часть буфера данных
        const chunk = videoData.slice(start, end + 1);
        res.end(chunk);
      } else {
        // Для локального хранилища создаем поток чтения
        const videoPath = path.join(__dirname, 'data/videos', filename);
        fs.createReadStream(videoPath, { start, end }).pipe(res);
      }
    } else {
      // Отправка всего файла
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Cache-Control': 'public, max-age=86400'
      });
      
      if (STORAGE_CONFIG.USE_REMOTE_STORAGE) {
        res.end(videoData);
      } else {
        const videoPath = path.join(__dirname, 'data/videos', filename);
        fs.createReadStream(videoPath).pipe(res);
      }
    }
  } catch (error) {
    console.error(`Ошибка при обработке видео ${filename}:`, error);
    res.status(500).send('Внутренняя ошибка сервера');
  }
};

// Маршрут для потоковой передачи видео
app.get('/videos/:filename', (req, res) => {
  const filename = req.params.filename;
  handleVideoStream(req, res, filename);
});

// Маршрут для скачивания видео
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  
  if (STORAGE_CONFIG.USE_REMOTE_STORAGE) {
    getFileFromStorage(filename)
      .then(videoData => {
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'video/mp4');
        res.send(videoData);
      })
      .catch(error => {
        console.error(`Ошибка при получении файла из хранилища: ${filename}`, error);
        res.status(404).json({ message: 'File not found' });
      });
  } else {
    const filePath = path.join(__dirname, 'data/videos', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    res.download(filePath);
  }
});

// Статические видео-файлы с кэшированием
app.use('/videos', express.static(path.join(__dirname, 'data/videos'), {
  maxAge: cacheTime,
  setHeaders: (res) => {
    res.set('Accept-Ranges', 'bytes');
    res.set('Content-Type', 'video/mp4');
    res.set('Cache-Control', 'public, max-age=86400');
  }
}));

// Обработка остальных маршрутов для API
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Storage configuration: ${STORAGE_CONFIG.USE_REMOTE_STORAGE ? 'Remote' : 'Local'}`);
});

// Обработка необработанных исключений
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
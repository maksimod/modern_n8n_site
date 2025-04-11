// server/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const fs = require('fs');
const progressRouter = require('./routes/progress');
// Закомментируем пока это - система очистки должна быть включена только после того, 
// как все остальное будет работать корректно
// const { startCleanupJob } = require('./utils/user-cleaner');

// Добавляем фикс для проблем с хранилищем
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
  origin: '*', // Разрешаем запросы с любого источника
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
}));

// Увеличиваем лимит размера запроса
app.use(express.json({ limit: '5000mb' }));
app.use(express.urlencoded({ extended: true, limit: '5000mb' }));

// Логирование запросов
app.use(morgan('dev'));

// Настраиваем обработку больших файлов
app.use((req, res, next) => {
  // Увеличиваем таймаут для больших запросов
  req.setTimeout(7200000); // 2 часа в миллисекундах
  res.setTimeout(7200000);
  next();
});

// Устанавливаем заглушки для хранилища
storageFixUtils.setupStorageMock(app);

app.use('/api/progress', progressRouter);

// Добавляем кэширование для статических файлов
const cacheTime = 86400000 * 7; // 7 дней

// Специальная настройка для видео-файлов
app.use((req, res, next) => {
  if (req.url.startsWith('/videos/') || req.url.endsWith('.mp4')) {
    // Добавляем CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
    
    // Для потоковой передачи видео
    res.setHeader('Accept-Ranges', 'bytes');
    
    // Правильный MIME-тип
    if (req.url.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
    }
    
    // Кэширование видео на клиенте
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 день
  }
  next();
});

// Обработка потоковой передачи видео
app.get('/videos/:filename', async (req, res) => {
  const filename = req.params.filename;
  
  console.log(`🎬 Запрос видео: ${filename}`);
  console.log(`🎬 Конфигурация хранилища:`, STORAGE_CONFIG);
  
  try {
    let videoData;
    let fileSize;
    
    if (STORAGE_CONFIG.USE_REMOTE_STORAGE) {
      // Получаем данные из удаленного хранилища
      try {
        console.log(`🎬 Получаем файл из удаленного хранилища: ${filename}`);
        videoData = await getFileFromStorage(filename);
        fileSize = videoData.length;
        console.log(`🎬 Файл получен из удаленного хранилища, размер: ${fileSize} байт`);
      } catch (error) {
        console.error(`🎬 Ошибка получения файла из удаленного хранилища: ${filename}`, error);
        return res.status(404).send('Файл не найден');
      }
    } else {
      // Используем локальное хранилище
      const videoPath = path.join(__dirname, 'data/videos', filename);
      console.log(`🎬 Ищем файл в локальном хранилище: ${videoPath}`);
      
      // Проверяем, существует ли файл
      if (!fs.existsSync(videoPath)) {
        console.error(`🎬 Файл не найден в локальном хранилище: ${videoPath}`);
        return res.status(404).send('Файл не найден');
      }
      
      // Получаем размер файла
      const stat = fs.statSync(videoPath);
      fileSize = stat.size;
      console.log(`🎬 Файл найден в локальном хранилище, размер: ${fileSize} байт`);
    }
    
    // Поддержка частичной загрузки
    const range = req.headers.range;
    
    if (range) {
      // Парсим Range header
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      
      if (STORAGE_CONFIG.USE_REMOTE_STORAGE) {
        // В случае с удаленным хранилищем отправляем часть буфера данных
        const chunk = videoData.slice(start, end + 1);
        
        // Устанавливаем заголовки
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': 'video/mp4',
          'Cache-Control': 'public, max-age=86400'
        });
        
        // Отправляем часть файла
        res.end(chunk);
      } else {
        // Для локального хранилища создаем поток чтения
        const videoPath = path.join(__dirname, 'data/videos', filename);
        const fileStream = fs.createReadStream(videoPath, { start, end });
        
        // Устанавливаем заголовки
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': 'video/mp4',
          'Cache-Control': 'public, max-age=86400'
        });
        
        // Передаем поток
        fileStream.pipe(res);
      }
    } else {
      // Отправка всего файла, если нет запроса на частичную загрузку
      if (STORAGE_CONFIG.USE_REMOTE_STORAGE) {
        // Устанавливаем заголовки
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
          'Cache-Control': 'public, max-age=86400'
        });
        
        // Отправляем весь буфер данных
        res.end(videoData);
      } else {
        // Для локального хранилища
        const videoPath = path.join(__dirname, 'data/videos', filename);
        
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
          'Cache-Control': 'public, max-age=86400'
        });
        
        fs.createReadStream(videoPath).pipe(res);
      }
    }
  } catch (error) {
    console.error(`Ошибка при обработке видео ${filename}:`, error);
    res.status(500).send('Внутренняя ошибка сервера');
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

// Маршруты
const authRouter = require('./routes/auth');
const coursesRouter = require('./routes/courses');
const adminRouter = require('./routes/admin');

// ВАЖНО: Проверяем существование файла маршрутов перед импортом
// let trustedUsersRouter;
// try {
//   trustedUsersRouter = require('./routes/trusted-users');
// } catch (error) {
//   console.warn('Trusted users routes not found, skipping: ', error.message);
// }

app.use('/api/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/admin', adminRouter);

// Регистрируем маршрут только если файл существует
// if (trustedUsersRouter) {
//   app.use('/api/admin/trusted-users', trustedUsersRouter);
// }

// Специальный маршрут для скачивания видео
app.get('/download/:filename', async (req, res) => {
  const filename = req.params.filename;
  
  try {
    if (STORAGE_CONFIG.USE_REMOTE_STORAGE) {
      // Получаем данные из удаленного хранилища
      try {
        const videoData = await getFileFromStorage(filename);
        
        // Устанавливаем заголовки для скачивания
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'video/mp4');
        
        // Отправляем файл
        return res.send(videoData);
      } catch (error) {
        console.error(`Ошибка при получении файла из удаленного хранилища: ${filename}`, error);
        return res.status(404).json({ message: 'File not found' });
      }
    } else {
      // Используем локальное хранилище
      const filePath = path.join(__dirname, 'data/videos', filename);
      
      // Проверяем, существует ли файл
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      // Отправляем файл для скачивания
      res.download(filePath);
    }
  } catch (error) {
    console.error(`Ошибка при скачивании файла ${filename}:`, error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Маршрут-прокси для видео из удаленного хранилища
// Решает проблему CORS при прямом доступе к удаленному хранилищу
app.get('/api/proxy/storage/:filename', async (req, res) => {
  const filename = req.params.filename;
  
  console.log(`Запрос на проксирование файла: ${filename}`);
  
  if (!STORAGE_CONFIG.USE_REMOTE_STORAGE) {
    return res.status(400).json({ message: 'Remote storage is disabled' });
  }
  
  try {
    // Получаем данные из удаленного хранилища через серверный API
    const videoData = await getFileFromStorage(filename);
    
    // Устанавливаем заголовки для стриминга видео
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Кэширование на 1 день
    
    // Добавляем CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
    
    // Отправляем файл
    return res.send(videoData);
  } catch (error) {
    console.error(`Ошибка при проксировании файла ${filename}:`, error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Обслуживание статических файлов в production с кэшированием
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist'), {
    maxAge: cacheTime,
    etag: true,
    lastModified: true
  }));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client', 'dist', 'index.html'));
  });
}

// Middleware для обработки ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message || 'Internal Server Error'
  });
});

// Временно отключаем задачу очистки отозванных пользователей
// пока не убедимся, что все остальное работает
// startCleanupJob();

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Сервер доступен по адресу: http://0.0.0.0:${PORT}`);
  console.log(`Окружение: ${process.env.NODE_ENV || 'development'}`);
  // console.log('Система доверенных пользователей активирована');
});
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
app.get('/videos/:filename', (req, res) => {
  const videoPath = path.join(__dirname, 'data/videos', req.params.filename);
  
  // Проверяем, существует ли файл
  fs.stat(videoPath, (err, stat) => {
    if (err) {
      console.error(`Файл не найден: ${videoPath}`, err);
      return res.status(404).send('Файл не найден');
    }
    
    // Получаем размер файла
    const fileSize = stat.size;
    const range = req.headers.range;
    
    // Поддержка частичной загрузки для мобильных устройств
    if (range) {
      // Парсим Range header
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      
      // Создаем поток чтения
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
    } else {
      // Если нет Range header, отдаем весь файл
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Cache-Control': 'public, max-age=86400'
      });
      
      fs.createReadStream(videoPath).pipe(res);
    }
  });
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
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'data/videos', filename);
  
  // Проверяем, существует ли файл
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' });
  }
  
  // Отправляем файл для скачивания
  res.download(filePath);
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
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Сервер доступен по адресу: http://127.0.0.1:${PORT}`);
  console.log(`Окружение: ${process.env.NODE_ENV || 'development'}`);
  // console.log('Система доверенных пользователей активирована');
});
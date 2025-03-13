// server/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const fs = require('fs');
const progressRouter = require('./routes/progress');
require('dotenv').config();

// Создаем приложение Express
const app = express();

// Middleware
app.use(cors({
  origin: '*', // Разрешаем запросы с любого источника
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
}));

app.use(express.json());
app.use(morgan('dev'));
app.use('/api/progress', progressRouter);

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
        'Content-Type': 'video/mp4'
      });
      
      // Передаем поток
      fileStream.pipe(res);
    } else {
      // Если нет Range header, отдаем весь файл
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4'
      });
      
      fs.createReadStream(videoPath).pipe(res);
    }
  });
});

// Статические видео-файлы
app.use('/videos', express.static(path.join(__dirname, 'data/videos'), {
  setHeaders: (res) => {
    res.set('Accept-Ranges', 'bytes');
    res.set('Content-Type', 'video/mp4');
  }
}));

// Маршруты
const authRouter = require('./routes/auth');
const coursesRouter = require('./routes/courses');
const adminRouter = require('./routes/admin');

app.use('/api/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/admin', adminRouter);

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

// Обслуживание статических файлов в production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
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

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Окружение: ${process.env.NODE_ENV || 'development'}`);
});
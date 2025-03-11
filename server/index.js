// server/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
require('dotenv').config();

// Создаем приложение Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use((req, res, next) => {
  if (req.url.endsWith('.mp4')) {
    res.setHeader('Content-Type', 'video/mp4');
  }
  next();
});

app.use('/videos', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  // Важно для потоковой передачи видео
  res.header('Accept-Ranges', 'bytes');
  
  // Правильный MIME-тип
  if (req.path.endsWith('.mp4')) {
    res.header('Content-Type', 'video/mp4');
  }
  
  console.log(`Запрос к видео: ${req.path}`);
  next();
});

// Статическая директория для видео
app.use('/videos', express.static(path.join(__dirname, 'data/videos')));

// Обработка ошибок при отсутствии токена
app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth') || 
      (req.path.startsWith('/api/courses') && req.method === 'GET') ||
      req.path.startsWith('/videos/')) {
    return next();
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  
  next();
});

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
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Окружение: ${process.env.NODE_ENV}`);
});
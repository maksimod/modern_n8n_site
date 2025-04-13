// server/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const fs = require('fs');
const axios = require('axios');
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
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ extended: true, limit: '1gb' }));

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

// Маршрут-прокси для видео из удаленного хранилища
app.get('/api/proxy/storage/:filename', async (req, res) => {
  const filename = req.params.filename;
  
  if (!STORAGE_CONFIG.USE_REMOTE_STORAGE) {
    return res.status(400).json({ message: 'Remote storage is disabled' });
  }
  
  try {
    console.log(`ПОТОК: Проксирование запроса к хранилищу для файла ${filename}`);
    console.log(`ПОТОК: URL API хранилища: ${STORAGE_CONFIG.API_URL}`);
    console.log(`ПОТОК: Заголовки запроса:`, req.headers);
    
    // Формируем URL для запроса с правильными параметрами согласно API хранилища
    const apiUrl = `${STORAGE_CONFIG.API_URL}/download`;
    
    // Настройка запроса
    const options = {
      method: 'GET',
      url: apiUrl,
      params: { filePath: filename }, // filePath должен быть в параметрах запроса
      headers: {
        'X-API-KEY': STORAGE_CONFIG.API_KEY
      },
      responseType: 'stream', // Используем поток вместо arraybuffer
      maxRedirects: 0,
      validateStatus: null, // Не выбрасывать ошибки для любых статус-кодов
      timeout: 30000 // Таймаут 30 секунд
    };
    
    // Пробрасываем заголовок Range, если он есть
    if (req.headers.range) {
      console.log(`ПОТОК: Проксирование с Range: ${req.headers.range}`);
      options.headers['Range'] = req.headers.range;
    }
    
    console.log(`ПОТОК: Отправка запроса к API хранилища: ${apiUrl} с параметрами:`, {
      filePath: filename,
      headers: options.headers
    });
    
    // Выполняем запрос
    const response = await axios(options);
    
    console.log(`ПОТОК: Ответ от API хранилища: статус ${response.status}`);
    
    // Копируем статус и заголовки ответа
    res.status(response.status);
    
    // Копируем все заголовки из ответа API, кроме некоторых системных
    if (response.headers) {
      Object.entries(response.headers).forEach(([key, value]) => {
        const lowerKey = key.toLowerCase();
        if (lowerKey !== 'connection' && lowerKey !== 'keep-alive' && 
            lowerKey !== 'transfer-encoding' && lowerKey !== 'content-encoding') {
          console.log(`ПОТОК: Копирование заголовка ${key}: ${value}`);
          res.setHeader(key, value);
        }
      });
    } else {
      console.log(`ПОТОК: Нет заголовков в ответе от API хранилища`);
    }
    
    // Добавляем CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
    
    // На всякий случай проверяем наличие data в response
    if (!response.data) {
      console.error(`ПОТОК: В ответе от API хранилища отсутствуют данные`);
      return res.status(500).json({ message: 'Empty response from storage API' });
    }
    
    // Передаем поток данных клиенту
    response.data.pipe(res);
    
    // Обработка ошибок потока
    response.data.on('error', (err) => {
      console.error(`ПОТОК: Ошибка при передаче данных: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).send('Ошибка при передаче данных');
      } else {
        res.end();
      }
    });
  } catch (error) {
    console.error(`ПОТОК: Ошибка при проксировании файла ${filename}:`, error.message);
    console.error(`ПОТОК: Полная ошибка:`, error);
    
    if (error.response) {
      console.error(`ПОТОК: Статус ответа: ${error.response.status}`);
      console.error(`ПОТОК: Данные ответа:`, error.response.data);
      
      // Если файл не найден, возвращаем такой же статус
      if (error.response.status === 404) {
        return res.status(404).json({ message: 'File not found in storage' });
      }
    } else if (error.request) {
      console.error(`ПОТОК: Запрос был сделан, но ответа не получено`);
    } else {
      console.error(`ПОТОК: Ошибка при настройке запроса:`, error.message);
    }
    
    // Пробуем использовать локальное хранилище как запасной вариант
    try {
      const localPath = path.join(__dirname, 'data/videos', filename);
      
      if (fs.existsSync(localPath)) {
        console.log(`ПОТОК: Найден локальный файл ${localPath}, используем его как запасной вариант`);
        
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Accept-Ranges', 'bytes');
        
        const fileStream = fs.createReadStream(localPath);
        fileStream.pipe(res);
        return;
      }
    } catch (localError) {
      console.error(`ПОТОК: Ошибка при попытке использовать локальное хранилище:`, localError);
    }
    
    res.status(500).json({ message: 'Error proxying file from storage' });
  }
});

// Единая функция для обработки видео-файлов
const handleVideoStream = async (req, res, filename) => {
  try {
    console.log(`ПОТОК: Запрос на поток видео ${filename}, заголовки:`, req.headers);
    
    if (STORAGE_CONFIG.USE_REMOTE_STORAGE) {
      try {
        // Передаем заголовок Range при запросе к удаленному хранилищу
        const response = await getFileFromStorage(filename, req.headers.range);
        
        // Копируем статус и заголовки из ответа API
        res.status(response.status || 200);
        
        // Копируем все заголовки из ответа API, кроме некоторых системных
        if (response.headers) {
          Object.entries(response.headers).forEach(([key, value]) => {
            const lowerKey = key.toLowerCase();
            if (lowerKey !== 'connection' && lowerKey !== 'keep-alive' && 
                lowerKey !== 'transfer-encoding' && lowerKey !== 'content-encoding') {
              res.setHeader(key, value);
            }
          });
        }
        
        // Всегда устанавливаем эти важные заголовки
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        
        console.log(`ПОТОК: Отправка видео ${filename}, статус: ${response.status}, размер: ${response.data.length} байт`);
        
        // Отправляем данные
        return res.end(response.data);
      } catch (error) {
        console.error(`Ошибка получения файла из удаленного хранилища: ${filename}`, error);
        
        // Пробуем локальное хранилище как запасной вариант
        console.log(`ПОТОК: Попытка использовать локальное хранилище для ${filename}`);
        // Продолжаем выполнение - код ниже попробует локальное хранилище
      }
    }
    
    // Код для локального хранилища (без изменений, оставляем как есть)
    const videoPath = path.join(__dirname, 'data/videos', filename);
    
    if (!fs.existsSync(videoPath)) {
      console.error(`ПОТОК: Файл не найден локально: ${videoPath}`);
      return res.status(404).send('Файл не найден');
    }
    
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    
    console.log(`ПОТОК: Размер файла ${filename}: ${fileSize} байт`);
    
    // ПРИНУДИТЕЛЬНО используем частичный запрос, даже если клиент не прислал Range
    // Это гарантирует, что браузер начнет воспроизведение до получения всего файла
    
    // Максимальный размер чанка - 1 МБ (это ОЧЕНЬ важно для быстрой загрузки)
    const maxChunkSize = 1 * 1024 * 1024; // 1 MB
    
    const range = req.headers.range;
    
    if (range) {
      console.log(`ПОТОК: Получен запрос с Range: ${range}`);
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      
      // Ограничиваем end, чтобы гарантировать маленькие чанки
      let end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + maxChunkSize, fileSize - 1);
      
      // Принудительно ограничиваем размер чанка
      end = Math.min(end, start + maxChunkSize, fileSize - 1);
      
      // Проверка выхода за пределы
      if (start >= fileSize) {
        console.log(`ПОТОК: Запрошенный диапазон за пределами файла: ${start}-${end}/${fileSize}`);
        return res.status(416).send('Range Not Satisfiable');
      }
      
      const chunkSize = (end - start) + 1;
      
      console.log(`ПОТОК: Отправка чанка: ${start}-${end}/${fileSize} (${chunkSize} bytes)`);
      
      // Устанавливаем заголовки для частичного контента
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      // Для локального хранилища создаем поток чтения с ограничением
      const readStream = fs.createReadStream(videoPath, { start, end });
      
      readStream.on('error', (err) => {
        console.error(`ПОТОК: Ошибка чтения файла ${filename}:`, err);
        if (!res.headersSent) {
          res.status(500).send('Internal Server Error');
        }
      });
      
      readStream.pipe(res);
    } else {
      // Если клиент не запросил Range, отправляем только первый чанк
      // Это заставит браузер запрашивать остальные чанки через Range
      const start = 0;
      const end = Math.min(maxChunkSize - 1, fileSize - 1);
      const chunkSize = (end - start) + 1;
      
      console.log(`ПОТОК: Клиент не запросил Range. Отправляем первый чанк: ${start}-${end}/${fileSize}`);
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      // Для локального хранилища создаем поток для первого чанка
      const readStream = fs.createReadStream(videoPath, { start, end });
      
      readStream.on('error', (err) => {
        console.error(`ПОТОК: Ошибка чтения первого чанка ${filename}:`, err);
        if (!res.headersSent) {
          res.status(500).send('Internal Server Error');
        }
      });
      
      readStream.pipe(res);
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

// Перехватываем все запросы к /videos и перенаправляем на наш кастомный обработчик
app.use('/videos', (req, res, next) => {
  const url = req.url;
  console.log(`Перехватываем запрос к статическому файлу: /videos${url}`);
  
  // Извлекаем имя файла из URL (убираем параметры запроса если есть)
  const filename = url.split('?')[0].split('#')[0].replace(/^\//, '');
  
  if (!filename || filename === '/' || filename === '') {
    return res.status(400).send('Filename is required');
  }
  
  console.log(`Перенаправляем запрос к статическому файлу на кастомный обработчик: ${filename}`);
  // Вызываем наш кастомный обработчик вместо отдачи файла напрямую
  handleVideoStream(req, res, filename);
});

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
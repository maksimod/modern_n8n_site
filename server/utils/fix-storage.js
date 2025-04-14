/**
 * Модуль для хранилища видео
 * Создает необходимые директории и настраивает API
 */

const fs = require('fs');
const path = require('path');
const { STORAGE_CONFIG } = require('../config');

// Проверяем существование директории для видео и создаем её при необходимости
function ensureVideosDirectory() {
  // Создаем директорию для видео только если не используется удаленное хранилище
  // или если включен режим резервного копирования
  if (!STORAGE_CONFIG.USE_REMOTE_STORAGE || STORAGE_CONFIG.FALLBACK_TO_LOCAL) {
    const videosDir = path.join(__dirname, '../data/videos');
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
      console.log(`Created videos directory: ${videosDir}`);
    }
  } else {
    console.log('Skipping videos directory creation: using remote storage without fallback');
  }
  
  // Создаем директорию для временных файлов (нужна всегда)
  ensureTempDirectory();
}

// Выделяем создание директории для временных файлов в отдельную функцию
function ensureTempDirectory() {
  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log(`Created temp directory: ${tempDir}`);
  }
}

// Настраиваем API для хранилища
function setupStorageMock(app) {
  // Если используется реальное удаленное хранилище, заглушки не нужны
  if (STORAGE_CONFIG.USE_REMOTE_STORAGE) {
    console.log('[STORAGE] Using real remote storage API:', STORAGE_CONFIG.API_URL);
    return;
  }
  
  // Иначе создаем заглушки
  console.log('[STORAGE] Setting up mock storage endpoints');
  
  // Заглушка для загрузки файлов
  app.post('/api/remote/files/:disk/upload', (req, res) => {
    console.log(`[STORAGE] Mock upload request received`);
    res.json({
      success: true,
      message: 'File uploaded successfully (mock)',
      filePath: req.body.filePath || 'mock-file.mp4'
    });
  });
  
  // Заглушка для скачивания файлов
  app.get('/api/remote/files/:disk/download', (req, res) => {
    console.log(`[STORAGE] Mock download request received for: ${req.query.filePath}`);
    res.json({
      success: true,
      message: 'This is a mock response from storage API',
      filePath: req.query.filePath
    });
  });
  
  console.log('[STORAGE] Mock storage endpoints are set up');
}

module.exports = {
  ensureVideosDirectory,
  ensureTempDirectory,
  setupStorageMock
}; 
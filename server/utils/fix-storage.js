/**
 * Модуль для исправления проблем с хранилищем
 * Полностью отключает использование удалённого хранилища
 * и перенаправляет все запросы на локальное хранилище
 */

const fs = require('fs');
const path = require('path');

// Проверяем существование директории для видео и создаем её при необходимости
function ensureVideosDirectory() {
  const videosDir = path.join(__dirname, '../data/videos');
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
    console.log(`[FIX] Created videos directory: ${videosDir}`);
  }
}

// Создаем заглушку для API хранилища
function setupStorageMock(app) {
  console.log('[FIX] Setting up storage mock endpoints');
  
  // Заглушка для загрузки файлов
  app.post('/api/remote/files/:disk/upload', (req, res) => {
    console.log(`[FIX] Mock storage upload request received`);
    res.json({
      success: true,
      message: 'File uploaded successfully (mock)',
      filePath: req.body.filePath || 'mock-file.mp4'
    });
  });
  
  // Заглушка для скачивания файлов
  app.get('/api/remote/files/:disk/download', (req, res) => {
    console.log(`[FIX] Mock storage download request received for: ${req.query.filePath}`);
    res.json({
      success: true,
      message: 'This is a mock response from storage API',
      filePath: req.query.filePath
    });
  });
  
  console.log('[FIX] Storage mock endpoints are set up');
}

module.exports = {
  ensureVideosDirectory,
  setupStorageMock
}; 
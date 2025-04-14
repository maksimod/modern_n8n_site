// server/config.js
const VIDEO_TYPES = {
    EXTERNAL: 'external',
    LOCAL: 'local',
    STORAGE: 'storage',
    TEXT: 'text'
  };
  
// Настройка удаленного хранилища
const STORAGE_CONFIG = {
  // Основной URL API
  API_URL: process.env.STORAGE_API_URL || 'http://46.35.241.37:6005/api/remote/files/Videos',
  // Ключ API для авторизации
  API_KEY: process.env.STORAGE_API_KEY || 'iq-banana-secure-api-key-2024',
  // Включаем удаленное хранилище
  USE_REMOTE_STORAGE: process.env.USE_REMOTE_STORAGE === 'false' ? false : true,
  // Настройки для отладки
  DEBUG: process.env.STORAGE_DEBUG === 'true' ? true : false,
  // Попытка снова использовать локальное хранилище при ошибках
  FALLBACK_TO_LOCAL: process.env.FALLBACK_TO_LOCAL === 'false' ? false : true
};

console.log('Загружена конфигурация хранилища:', {
  API_URL: STORAGE_CONFIG.API_URL,
  USE_REMOTE_STORAGE: STORAGE_CONFIG.USE_REMOTE_STORAGE,
  DEBUG: STORAGE_CONFIG.DEBUG,
  FALLBACK_TO_LOCAL: STORAGE_CONFIG.FALLBACK_TO_LOCAL
});

module.exports = {
  VIDEO_TYPES,
  STORAGE_CONFIG
};
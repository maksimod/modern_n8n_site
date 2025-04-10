// server/config.js
const VIDEO_TYPES = {
    EXTERNAL: 'external',
    LOCAL: 'local',
    STORAGE: 'storage',
    TEXT: 'text'
  };
  
// Сейчас используем только локальное хранилище из-за проблем с удаленным API
const STORAGE_CONFIG = {
  // Отключаем обращение к удалённому хранилищу
  API_URL: 'http://localhost:5000/api/remote/files/C',
  API_KEY: 'iq-banana-secure-api-key-2024',
  // Полностью отключаем удаленное хранилище
  USE_REMOTE_STORAGE: false
};

module.exports = {
  VIDEO_TYPES,
  STORAGE_CONFIG
};
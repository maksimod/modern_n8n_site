// server/config.js
const VIDEO_TYPES = {
    EXTERNAL: 'external',
    LOCAL: 'local',
    STORAGE: 'storage',
    TEXT: 'text'
  };
  
// Настройка удаленного хранилища
const STORAGE_CONFIG = {
  API_URL: 'http://46.35.241.37:6005/api/remote/files/Videos',
  API_KEY: 'iq-banana-secure-api-key-2024',
  // Включаем удаленное хранилище
  USE_REMOTE_STORAGE: true
};

module.exports = {
  VIDEO_TYPES,
  STORAGE_CONFIG
};
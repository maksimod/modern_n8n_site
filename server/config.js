// server/config.js
const VIDEO_TYPES = {
    EXTERNAL: 'external',
    LOCAL: 'local',
    STORAGE: 'storage',
    TEXT: 'text'
  };
  
const STORAGE_CONFIG = {
  API_URL: 'http://46.35.241.37:6005/api/remote/files/C',
  API_KEY: 'iq-banana-secure-api-key-2024'
};

module.exports = {
  VIDEO_TYPES,
  STORAGE_CONFIG
};
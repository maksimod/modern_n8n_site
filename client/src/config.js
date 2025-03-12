// client/src/config.js

// Base URL for API endpoints
export const SERVER_URL = process.env.NODE_ENV === 'production' 
  ? 'http://192.168.0.102:5000' // Ваш IP в локальной сети + порт сервера
  : window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' // Для локальной разработки
    : `http://${window.location.hostname}:5000`; // Для доступа через IP

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'ru', name: 'Русский' },
  { code: 'en', name: 'English' }
];

// Video types
export const VIDEO_TYPES = {
  EXTERNAL: 'external',
  LOCAL: 'local',
  TEXT: 'text'
};

// Breakpoints for responsive design
export const BREAKPOINTS = {
  mobile: 480, 
  tablet: 768,
  desktop: 1024
};
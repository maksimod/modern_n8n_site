// client/src/config.js
// Определяем базовый URL для API
const getServerUrl = () => {
  // В production используем хост сервера напрямую
  if (process.env.NODE_ENV === 'production') {
    return window.location.origin;
  }
  
  // Для локальной разработки
  return window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : `http://${window.location.hostname}:5000`;
};

// Базовый URL для API
export const SERVER_URL = getServerUrl();

// Поддерживаемые языки
export const SUPPORTED_LANGUAGES = [
  { code: 'ru', name: 'Русский' },
  { code: 'en', name: 'English' }
];

// Типы видео
export const VIDEO_TYPES = {
  EXTERNAL: 'external',
  LOCAL: 'local',
  TEXT: 'text'
};

// Брейкпоинты для адаптивного дизайна
export const BREAKPOINTS = {
  mobile: 480, 
  tablet: 768,
  desktop: 1024
};
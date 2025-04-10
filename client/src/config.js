// client/src/config.js
// Определяем базовый URL для API

// Мемоизируем определение URL сервера для избежания повторных вычислений
let _serverUrl = null;

const getServerUrl = () => {
  if (_serverUrl) return _serverUrl;
  
  // В production используем хост сервера напрямую
  if (process.env.NODE_ENV === 'production') {
    _serverUrl = window.location.origin;
    return _serverUrl;
  }
  
  // Определяем режим разработки через vite
  const isDev = import.meta.env.DEV;
  
  // Для локальной разработки
  if (isDev) {
    // В режиме разработки Vite клиент работает на порту 4000, а сервер на 5000
    _serverUrl = 'http://127.0.0.1:5000';
  } else {
    _serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://127.0.0.1:5000'
      : `http://${window.location.hostname}:5000`;
  }
  
  return _serverUrl;
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
  STORAGE: 'storage',
  TEXT: 'text'
};

// Брейкпоинты для адаптивного дизайна
export const BREAKPOINTS = {
  mobile: 480, 
  tablet: 768,
  desktop: 1024
};

// Константы для кэширования
export const CACHE_TTL = {
  COURSE: 60 * 60 * 1000, // 1 час
  VIDEO: 30 * 60 * 1000,  // 30 минут
  USER: 24 * 60 * 60 * 1000 // 24 часа
};

// Конфигурация видеохранилища
export const STORAGE_CONFIG = {
  API_URL: window.location.origin + '/api/remote/files/C',
  API_KEY: 'iq-banana-secure-api-key-2024',
  // Полностью отключаем удаленное хранилище - используем только локальное
  USE_REMOTE_STORAGE: false
};
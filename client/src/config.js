// client/src/config.js
// Определяем базовый URL для API

// Мемоизируем определение URL сервера для избежания повторных вычислений
let _serverUrl = null;

const getServerUrl = () => {
  if (_serverUrl) return _serverUrl;
  
  // В production используем явно порт 5000
  if (process.env.NODE_ENV === 'production') {
    // В production-режиме всегда используем порт 5000, независимо от порта клиента
    _serverUrl = `${window.location.protocol}//${window.location.hostname}:5000`;
    return _serverUrl;
  }
  
  // Определяем режим разработки через vite
  const isDev = import.meta.env.DEV;
  
  // Для локальной разработки
  if (isDev) {
    // В режиме разработки Vite клиент работает на порту 4000, а сервер на 5000
    _serverUrl = 'http://127.0.0.1:5000';
  } else {
    // В production всегда используем порт 5000
    _serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://127.0.0.1:5000'
      : `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  
  console.log('Server URL determined:', _serverUrl);
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
// Получаем параметры из переменных окружения при сборке клиента
export const STORAGE_CONFIG = {
  API_URL: import.meta.env.VITE_STORAGE_API_URL || 'http://46.35.241.37:6005/api/remote/files/Videos',
  API_KEY: import.meta.env.VITE_STORAGE_API_KEY || 'iq-banana-secure-api-key-2024',
  // Включаем удаленное хранилище
  USE_REMOTE_STORAGE: import.meta.env.VITE_USE_REMOTE_STORAGE !== 'false'
};
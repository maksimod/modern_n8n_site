// client/src/services/api.js
import axios from 'axios';
import { SERVER_URL } from '../config';

// Определяем режим разработки через vite
const isDev = import.meta.env.DEV;

// В режиме разработки используем относительные пути, так как настроен прокси
// В продакшене используем полный URL из конфигурации
const API_BASE_URL = isDev ? '' : SERVER_URL;

// Создаем экземпляр axios с базовым URL сервера
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Добавляем перехватчик для добавления токена авторизации
api.interceptors.request.use(
  (config) => {
    // Получаем токен напрямую из localStorage
    const token = localStorage.getItem('token');
  
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Добавляем обработчик ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Обработка ошибок авторизации
    if (error.response) {
      // Проверка на ошибку отозванного доступа
      if (error.response.data && error.response.data.code === 'ACCESS_REVOKED') {
        console.error('Доступ пользователя был отозван');
        
        // Очищаем данные пользователя
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        
        // Добавляем информацию о причине ошибки
        error.accessRevoked = true;
        
        // Перенаправляем на страницу авторизации с соответствующим сообщением
        const currentPath = window.location.pathname + window.location.search;
        window.location.href = `/auth?redirect=${encodeURIComponent(currentPath)}&revoked=true`;
        
        return Promise.reject(error);
      }
      
      // Обычная 401 ошибка (неавторизован)
      if (error.response.status === 401) {
        // Очищаем данные пользователя и токен
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        
        // Перенаправляем на страницу авторизации, сохраняя текущий URL
        const currentPath = window.location.pathname + window.location.search;
        window.location.href = `/auth?redirect=${encodeURIComponent(currentPath)}`;
        
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
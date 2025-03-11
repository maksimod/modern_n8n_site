import axios from 'axios';

// Создаем экземпляр axios с базовым URL сервера
const api = axios.create({
  baseURL: 'http://localhost:5000', // URL сервера
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
    // При 401 ошибке (неавторизован) перенаправляем на страницу логина
    if (error.response && error.response.status === 401) {
      // Очищаем данные пользователя и токен
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      
      // Перенаправляем на страницу авторизации, сохраняя текущий URL
      const currentPath = window.location.pathname + window.location.search;
      window.location.href = `/auth?redirect=${encodeURIComponent(currentPath)}`;
    }
    return Promise.reject(error);
  }
);

export default api;
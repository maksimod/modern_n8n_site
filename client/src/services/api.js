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
    const user = JSON.parse(localStorage.getItem('user') || '{}');
  
    console.log(user);
    console.log(user.token)
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
      console.log("ok")
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
      localStorage.removeItem('user');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

export default api;
// import axios from 'axios';

// // Создаем экземпляр axios с базовым URL сервера
// const api = axios.create({
//   baseURL: 'http://localhost:5000', // URL сервера
//   headers: {
//     'Content-Type': 'application/json'
//   }
// });

// // Добавляем перехватчик для добавления токена авторизации
// api.interceptors.request.use(
//   (config) => {
//     console.log("try-req");

//     const user = JSON.parse(localStorage.getItem('user') || '{}');
  
//     console.log(user);
//     console.log(user.token)
//     if (user && user.token) {
//       config.headers.Authorization = `Bearer ${user.token}`;
//       console.log("ok")
//     }

//     console.log("next")
//     debugger;

//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// // Добавляем обработчик ошибок
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     // При 401 ошибке (неавторизован) перенаправляем на страницу логина
//     if (error.response && error.response.status === 401) {
//       localStorage.removeItem('user');
//       window.location.href = '/auth';
//     }
//     return Promise.reject(error);
//   }
// );

// export default api;

// import axios from 'axios';

// const api = axios.create({
//   baseURL: 'http://localhost:5000', // Или process.env.REACT_APP_API_URL
//   headers: {
//     'Content-Type': 'application/json'
//   }
// });

// api.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem('token');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response && error.response.status === 401) {
//       localStorage.removeItem('user');
//       localStorage.removeItem('token');
//       window.location.href = '/auth';
//     }
//     return Promise.reject(error);
//   }
// );

// export default api;

import axios from 'axios';

// Создаем экземпляр axios с базовым URL
const api = axios.create({
  baseURL: 'http://localhost:5000', // Убедитесь, что это соответствует вашему серверу
  headers: {
    'Content-Type': 'application/json'
  }
});

// Перехватчик для добавления токена
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Извлекаем токен напрямую
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Перехватчик для обработки ошибок 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.href = '/auth'; // Перенаправление на страницу входа
    }
    return Promise.reject(error);
  }
);

export default api;
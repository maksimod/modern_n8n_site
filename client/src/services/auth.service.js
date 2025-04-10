// client/src/services/auth.service.js
import api from './api';

export const checkUsername = async (username) => {
  try {
    const response = await api.get(`/api/auth/check-username/${username}`);
    // Обновленный ответ теперь должен содержать available и trusted
    return {
      available: response.data.available,
      trusted: response.data.trusted
    };
  } catch (error) {
    console.error('Error checking username:', error);
    return {
      available: false,
      trusted: false,
      error: error.message
    };
  }
};

export const register = async (username, password) => {
  try {
    const response = await api.post('/api/auth/register', { username, password });
    
    // Возвращаем объект с токеном и пользователем
    return { 
      user: response.data.user, 
      token: response.data.token 
    };
  } catch (error) {
    console.error('Registration error:', error);
    
    // Проверяем наличие конкретной ошибки доверенного пользователя
    if (error.response && error.response.data && error.response.data.code === 'NOT_TRUSTED') {
      throw new Error('Registration is restricted to trusted users only');
    }
    
    throw new Error(error.response?.data?.message || 'Registration failed');
  }
};

export const login = async (username, password) => {
  try {
    const response = await api.post('/api/auth/login', { username, password });
    
    if (!response.data || !response.data.token) {
      throw new Error('Invalid response from server');
    }
    
    // Возвращаем объект с токеном и пользователем
    return { 
      user: response.data.user, 
      token: response.data.token 
    };
  } catch (error) {
    console.error('Login error:', error);
    
    // Проверяем на ошибку отозванного доступа
    if (error.response && error.response.data && error.response.data.code === 'ACCESS_REVOKED') {
      throw new Error('Your access has been revoked. Please contact administration.');
    }
    
    // Более подробная информация об ошибке
    if (error.response) {
      throw new Error(error.response.data?.message || 'Login failed with status: ' + error.response.status);
    } else if (error.request) {
      throw new Error('No response from server. Check your internet connection.');
    } else {
      throw new Error(error.message || 'Login failed');
    }
  }
};

export const logout = () => {
  return Promise.resolve(true);
};

export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};
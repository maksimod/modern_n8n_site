import api from './api';

export const checkUsername = async (username) => {
  try {
    const response = await api.get(`/api/auth/check-username/${username}`);
    return response.data.available;
  } catch (error) {
    console.error('Error checking username:', error);
    return false;
  }
};

export const register = async (username, password) => {
  try {
    const response = await api.post('/api/auth/register', { username, password });
    
    // Сохраняем токен и данные пользователя
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    
    return response.data.user;
  } catch (error) {
    console.error('Registration error:', error);
    throw new Error(error.response?.data?.message || 'Registration failed');
  }
};

export const login = async (username, password) => {
  try {
    const response = await api.post('/api/auth/login', { username, password });
    
    if (!response.data || !response.data.token) {
      throw new Error('Invalid response from server');
    }
    
    // Сохраняем токен и данные пользователя
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    
    return response.data.user;
  } catch (error) {
    console.error('Login error:', error);
    
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
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  return Promise.resolve(true);
};

export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  return JSON.parse(userStr);
};

export const updateUserProgress = async (userId, courseId, videoId, completed) => {
  try {
    const response = await api.post(`/api/progress/${courseId}/${videoId}`, { completed });
    
    // Обновляем информацию о прогрессе в локальном хранилище
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      
      if (!user.progress) {
        user.progress = {};
      }
      
      if (!user.progress[courseId]) {
        user.progress[courseId] = {};
      }
      
      user.progress[courseId][videoId] = completed;
      localStorage.setItem('user', JSON.stringify(user));
    }
    
    return response.data;
  } catch (error) {
    console.error('Error updating progress:', error);
    throw error;
  }
};
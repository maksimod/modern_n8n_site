import api from './api';

// Получить все курсы (от сервера или из локальных данных)
export const getCourses = async (language = 'ru') => {
  try {
    const response = await api.get(`/api/courses?language=${language}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching courses:', error);
    // Возвращаем пустой массив при ошибке
    return [];
  }
};

// Получить курс по ID (от сервера или из локальных данных)
export const getCourseById = async (courseId, language = 'ru') => {
  try {
    const response = await api.get(`/api/courses/${courseId}?language=${language}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching course ${courseId}:`, error);
    return null;
  }
};

// Получить видео по ID (от сервера или из локальных данных)
export const getVideoById = async (courseId, videoId, language = 'ru') => {
  try {
    const response = await api.get(`/api/courses/${courseId}/videos/${videoId}?language=${language}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching video ${videoId}:`, error);
    return null;
  }
};

// Отметить видео как просмотренное (обновляем локальные данные)
export const markVideoAsCompleted = async (userId, courseId, videoId, completed = true) => {
  try {
    // Получаем текущего пользователя из localStorage
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      throw new Error('Пользователь не авторизован');
    }
    
    const user = JSON.parse(userStr);
    
    // Инициализируем структуру прогресса, если она отсутствует
    if (!user.progress) {
      user.progress = {};
    }
    
    if (!user.progress[courseId]) {
      user.progress[courseId] = {};
    }
    
    // Обновляем статус просмотра
    user.progress[courseId][videoId] = completed;
    
    // Сохраняем обновленные данные обратно в localStorage
    localStorage.setItem('user', JSON.stringify(user));
    
    // Также обновляем пользователя в 'users' массиве
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
      // Убедимся, что структура прогресса инициализирована
      if (!users[userIndex].progress) {
        users[userIndex].progress = {};
      }
      
      if (!users[userIndex].progress[courseId]) {
        users[userIndex].progress[courseId] = {};
      }
      
      users[userIndex].progress[courseId][videoId] = completed;
      localStorage.setItem('users', JSON.stringify(users));
    }
    
    return user.progress;
  } catch (error) {
    console.error('Error marking video as completed:', error);
    throw error;
  }
};

// Получить прогресс по курсу для пользователя
export const getCourseProgress = (user, courseId) => {
  if (!user || !user.progress || !user.progress[courseId]) {
    return {};
  }
  return user.progress[courseId];
};

// Рассчитать процент выполнения курса
export const calculateCourseCompletion = (user, course) => {
  if (!user || !course || !user.progress || !user.progress[course.id]) {
    return 0;
  }
  
  const progress = user.progress[course.id];
  const totalVideos = course.videos.length;
  const completedVideos = Object.values(progress).filter(completed => completed).length;
  
  return totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
};
import api from './api';

// Получить все курсы
export const getCourses = async (language = 'ru') => {
  try {
    const response = await api.get(`/api/courses?language=${language}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching courses:', error);
    return [];
  }
};

// Получить курс по ID
export const getCourseById = async (courseId, language = 'ru') => {
  try {
    const response = await api.get(`/api/courses/${courseId}?language=${language}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching course ${courseId}:`, error);
    return null;
  }
};

// Получить видео по ID
export const getVideoById = async (courseId, videoId, language = 'ru') => {
  try {
    const response = await api.get(`/api/courses/${courseId}/videos/${videoId}?language=${language}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching video ${videoId}:`, error);
    return null;
  }
};

// Проверить, завершено ли видео для пользователя
export const isVideoCompleted = (user, courseId, videoId) => {
  if (!user || !user.progress || !user.progress[courseId]) {
    return false;
  }
  return !!user.progress[courseId][videoId];
};

// Отметить видео как просмотренное
export const markVideoAsCompleted = async (userId, courseId, videoId, completed = true) => {
  try {
    const response = await api.post(`/api/progress/${courseId}/${videoId}`, { completed });
    console.log("started");
    debugger;
    // Обновляем информацию о пользователе в локальном хранилище
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
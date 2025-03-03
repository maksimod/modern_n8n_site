import api from './api';

// Получить все курсы (ТОЛЬКО с сервера)
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

// Получить курс по ID (ТОЛЬКО с сервера)
export const getCourseById = async (courseId, language = 'ru') => {
  try {
    const response = await api.get(`/api/courses/${courseId}?language=${language}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching course ${courseId}:`, error);
    return null;
  }
};

// Получить видео по ID (ТОЛЬКО с сервера)
export const getVideoById = async (courseId, videoId, language = 'ru') => {
  try {
    const response = await api.get(`/api/courses/${courseId}/videos/${videoId}?language=${language}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching video ${videoId}:`, error);
    return null;
  }
};

// Отметить видео как просмотренное (ТОЛЬКО с сервера)
export const markVideoAsCompleted = async (userId, courseId, videoId, completed = true) => {
  try {
    const response = await api.post(`/api/progress/${courseId}/${videoId}`, { completed });
    return response.data;
  } catch (error) {
    console.error('Error marking video as completed:', error);
    return null;
  }
};

// Получить прогресс по курсу
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
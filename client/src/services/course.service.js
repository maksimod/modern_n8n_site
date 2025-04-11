// client/src/services/course.service.js
import api from './api';
import { SERVER_URL } from '../config';

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

// Функция для проверки, просмотрено ли видео
export const isVideoCompleted = async (user, courseId, videoId) => {
  try {
    const response = await api.get(`/api/progress/${courseId}/${videoId}`);
    return response.data.status;
  } catch (error) {
    console.error('Error checking video completion', error);
    return false;
  }
};


// Функция для отметки видео как просмотренного
export const markVideoAsCompleted = async (courseId, videoId, isCompleted) => {
  try {
    console.log('Sending progress update:', { courseId, videoId, isCompleted });
    const response = await api.post(`/api/progress/${courseId}/${videoId}`, { 
      isCompleted 
    });
    console.log('Progress update response:', response.data);
    return response.data.success;
  } catch (error) {
    console.error('Error marking video as completed', error);
    return false;
  }
};

// Получение прогресса по курсу
export const getCourseProgress = async (courseId) => {
  try {
    console.log("Requesting progress for course:", courseId);
    const response = await api.get(`/api/progress/${courseId}`);
    console.log('Progress API response:', response.data);
    
    // Если прогресс приходит в нужном формате - возвращаем его
    if (response.data && response.data.progress) {
      return response.data;
    }
    
    // Если прогресс приходит в другом формате - адаптируем его
    if (response.data && typeof response.data === 'object') {
      // Если API возвращает прогресс напрямую, без обертки .progress
      return {
        success: true,
        progress: response.data
      };
    }
    
    // В крайнем случае возвращаем пустой объект
    return {
      success: true,
      progress: {}
    };
  } catch (error) {
    console.error('Error getting course progress', error);
    return {
      success: false,
      progress: {}
    };
  }
};

// ADMIN METHODS

// Create new course
export const createCourse = async (courseData) => {
  try {
    console.log('Creating course with data:', courseData);
    const response = await api.post('/api/admin/courses', courseData);
    return response.data;
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
};

// Update course
export const updateCourse = async (courseId, courseData) => {
  try {
    console.log('Updating course with data:', courseData);
    const response = await api.put(`/api/admin/courses/${courseId}`, courseData);
    return response.data;
  } catch (error) {
    console.error(`Error updating course ${courseId}:`, error);
    throw error;
  }
};

// Delete course
export const deleteCourse = async (courseId) => {
  try {
    const response = await api.delete(`/api/admin/courses/${courseId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting course ${courseId}:`, error);
    throw error;
  }
};

// Add video to course
export const addVideo = async (courseId, videoData) => {
  try {
    const response = await api.post(`/api/admin/courses/${courseId}/videos`, videoData);
    return response.data;
  } catch (error) {
    console.error('Error adding video:', error);
    throw error;
  }
};

// Update video
export const updateVideo = async (courseId, videoId, videoData) => {
  try {
    const response = await api.put(`/api/admin/courses/${courseId}/videos/${videoId}`, videoData);
    return response.data;
  } catch (error) {
    console.error(`Error updating video ${videoId}:`, error);
    throw error;
  }
};

// Delete video
export const deleteVideo = async (courseId, videoId, language = 'ru') => {
  try {
    console.log(`Deleting video: courseId=${courseId}, videoId=${videoId}, language=${language}`);
    const response = await api.delete(`/api/admin/courses/${courseId}/videos/${videoId}?language=${language}`);
    console.log('Delete video response:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error deleting video ${videoId}:`, error);
    throw error;
  }
};

// Upload video file
export const uploadVideoFile = async (file, onProgress) => {
  try {
    // Проверка размера файла
    const maxSizeInMB = 900; // Безопасный лимит
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    
    if (file.size > maxSizeInBytes) {
      console.error('File too large:', file.size);
      return {
        success: false,
        message: `Файл слишком большой (${Math.round(file.size / (1024 * 1024))}MB). Максимальный размер ${maxSizeInMB}MB.`
      };
    }
    
    console.log('Загрузка файла:', file.name, 'размер:', Math.round(file.size / 1024), 'KB');
    
    // Создаем FormData для отправки файла
    const formData = new FormData();
    formData.append('file', file);
    
    // Отправляем запрос на сервер
    const response = await fetch('/api/simple-upload', {
      method: 'POST',
      body: formData,
      // Функция для отслеживания прогресса не поддерживается fetch API напрямую
      // Для простоты мы будем имитировать прогресс
    });
    
    // Имитируем прогресс загрузки
    if (onProgress) {
      setTimeout(() => onProgress(30), 100);
      setTimeout(() => onProgress(70), 300);
      setTimeout(() => onProgress(90), 500);
    }
    
    // Проверяем статус ответа
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка загрузки: ${response.status} ${response.statusText}. ${errorText}`);
    }
    
    // Завершаем прогресс
    if (onProgress) {
      setTimeout(() => onProgress(100), 700);
    }
    
    // Получаем данные ответа
    const data = await response.json();
    console.log('Ответ от сервера:', data);
    
    return {
      success: true,
      message: 'Файл успешно загружен',
      filePath: data.filePath,
      fileName: data.fileName,
      videoType: data.videoType
    };
  } catch (error) {
    console.error('Ошибка загрузки файла:', error);
    return {
      success: false,
      message: error.message || 'Произошла неизвестная ошибка'
    };
  }
};

// Удаление видеофайла
export const deleteVideoFile = async (fileName) => {
  try {
    if (!fileName) {
      console.error('Empty file name provided to deleteVideoFile');
      return { success: false, message: 'No file name provided' };
    }
    
    // Улучшенный лог с полным именем файла
    console.log(`Attempting to delete file: ${fileName}`);
    
    // Очищаем путь от возможных префиксов
    const cleanFileName = fileName.replace(/^\/videos\//, '');
    
    // Добавляем дополнительные данные для отладки
    console.log(`Using cleaned file name for deletion: ${cleanFileName}`);
    
    const response = await api.delete('/api/storage/delete', {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        pattern: cleanFileName
      }
    });
    
    console.log('File deletion response:', response.data);
    return response.data || { success: true, message: 'File deleted successfully' };
  } catch (error) {
    console.error('Error deleting video file:', error);
    
    // Более детальное логирование ошибки
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
      console.error('Request URL:', error.config?.url);
      console.error('Request method:', error.config?.method);
    }
    
    return { 
      success: false, 
      message: error.response?.data?.message || error.message || 'Unknown error',
      status: error.response?.status || 'N/A'
    };
  }
};

// Update video positions (reordering)
export const updateVideoPositions = async (courseId, videoIds) => {
  try {
    const response = await api.put(`/api/admin/courses/${courseId}/videos/positions`, { 
      positions: videoIds 
    });
    return response.data;
  } catch (error) {
    console.error('Error updating video positions:', error);
    throw error;
  }
};
// client/src/services/course.service.js
import api from './api';
import { SERVER_URL } from '../config';

// Track recent error messages to avoid console spam
const errorCache = {
  deleteVideo: null,
  getCourses: null  
};

// Получить все курсы
export const getCourses = async (language = 'ru') => {
  try {
    const response = await api.get(`/api/courses?language=${language}`);
    // Clear error cache on success
    errorCache.getCourses = null;
    return response.data;
  } catch (error) {
    // Only log if we haven't logged this error before
    const errorMsg = error.message || 'Unknown error';
    if (errorCache.getCourses !== errorMsg) {
      console.error('Error fetching courses:', error);
      errorCache.getCourses = errorMsg;
    }
    throw error;
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
    
    // Add retry mechanism for 502 errors
    let retries = 3;
    let lastError = null;
    
    while (retries > 0) {
      try {
        const response = await api.put(`/api/admin/courses/${courseId}`, courseData);
        console.log('Course update successful:', response.data);
        return response.data;
      } catch (error) {
        lastError = error;
        
        // If it's a 502 Bad Gateway, retry
        if (error.response && error.response.status === 502) {
          console.log(`Got 502 error, retrying... (${retries} attempts left)`);
          retries--;
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          // For other errors, don't retry
          throw error;
        }
      }
    }
    
    // If we've exhausted retries, throw the last error
    console.error(`Exhausted ${3-retries} retries updating course ${courseId}`);
    throw lastError;
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
    
    let maxRetries = 3;
    let retryCount = 0;
    let lastError = null;
    
    while (retryCount < maxRetries) {
      try {
        const response = await api.delete(`/api/admin/courses/${courseId}/videos/${videoId}?language=${language}`);
        // Clear error cache on success
        errorCache.deleteVideo = null;
        return response.data;
      } catch (error) {
        lastError = error;
        
        // Handle 404 errors gracefully - the video may have already been deleted
        if (error.response && error.response.status === 404) {
          console.log(`Video ${videoId} not found on server, considering it already deleted`);
          
          // Return a successful response to avoid UI errors
          return {
            success: true,
            message: 'Video deleted successfully (was already removed from server)',
            videoId: videoId,
            fileDeleted: false
          };
        }
        
        // Retry on 502 Bad Gateway errors
        if (error.response && error.response.status === 502) {
          retryCount++;
          console.warn(`Video deletion caused a 502 error (attempt ${retryCount}/${maxRetries}): ${videoId}`);
          
          // Wait before retrying (increasing timeout with each retry)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          
          // Continue with next iteration
          continue;
        }
        
        // For other errors, rethrow
        throw error;
      }
    }
    
    // If we've exhausted all retries
    if (retryCount >= maxRetries) {
      console.error(`Failed to delete video after ${maxRetries} attempts due to 502 errors`);
      
      // Return partial success to update UI anyway
      return {
        success: true,
        message: 'Video removed from UI, but server is unavailable. Database may not be updated.',
        videoId: videoId,
        serverError: true
      };
    }
    
    // If we get here, all retries failed but not due to 502
    throw lastError;
  } catch (error) {
    // Log error but prevent duplicate logs
    const errorMsg = error.message || 'Unknown error';
    if (errorCache.deleteVideo !== errorMsg) {
      console.error(`Error deleting video ${videoId}:`, error);
      errorCache.deleteVideo = errorMsg;
    }
    
    throw error;
  }
};

// Upload video file
export const uploadVideoFile = async (file, onProgress) => {
  try {
    // Инициализируем сессию загрузки
    const sessionData = await initializeUpload(file.name, file.size);
    if (!sessionData.success) {
      throw new Error(`Ошибка инициализации загрузки: ${sessionData.message}`);
    }
    
    console.log('Initialized upload session:', sessionData);
    
    // Используем оптимальный размер чанка - баланс между размером и количеством запросов
    const CHUNK_SIZE = 256 * 1024; // 256KB - уменьшит количество чанков в ~2.5 раза
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    console.log(`Загрузка файла размером ${file.size} байт в ${totalChunks} чанках по ${CHUNK_SIZE} байт каждый`);
    
    // Загрузка файла по частям
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunk = file.slice(start, end);
      
      // Вычисляем прогресс
      const progress = Math.round((i / totalChunks) * 100);
      if (onProgress) {
        onProgress(progress);
      }
      
      // Загружаем чанк с увеличенным таймаутом
      const chunkResult = await uploadChunk(
        sessionData.sessionId, 
        chunk, 
        i, 
        totalChunks
      );
      
      if (!chunkResult.success) {
        throw new Error(`Ошибка загрузки части ${i+1}/${totalChunks}: ${chunkResult.message}`);
      }
      
      console.log(`Uploaded chunk ${i+1}/${totalChunks}`);
    }
    
    // Завершаем загрузку и объединяем чанки на сервере
    let finalizeResult = await finalizeUpload(sessionData.sessionId, file.name);
    
    if (finalizeResult.status === 'processing') {
      // Если финализация происходит асинхронно, начинаем опрос статуса
      console.log('File assembly started in background, polling for status...');
      
      let uploadStatus = finalizeResult;
      let attempts = 0;
      const maxAttempts = 120; // Максимальное число попыток
      
      // Определяем интервал проверки в зависимости от размера файла
      let checkInterval;
      if (file.size < 10 * 1024 * 1024) { // < 10MB
        checkInterval = 1000; // 1 секунда для маленьких файлов
        console.log('Small file detected, checking status every 1 second');
      } else if (file.size < 100 * 1024 * 1024) { // < 100MB
        checkInterval = 5000; // 5 секунд для средних файлов
        console.log('Medium file detected, checking status every 5 seconds');
      } else {
        checkInterval = 15000; // 15 секунд для больших файлов
        console.log('Large file detected, checking status every 15 seconds');
      }
      
      while (uploadStatus.status === 'processing' && attempts < maxAttempts) {
        // Ждем перед следующей проверкой
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        
        // Проверяем статус
        uploadStatus = await checkUploadStatus(sessionData.sessionId);
        attempts++;
        
        console.log(`Check upload status (attempt ${attempts}/${maxAttempts}):`, uploadStatus);
        
        // Обновляем индикатор прогресса для пользователя
        if (onProgress && uploadStatus.progress) {
          const finalizingProgress = 90 + Math.round((uploadStatus.progress.chunksProcessed / uploadStatus.progress.totalChunks) * 10);
          onProgress(finalizingProgress);
        }
      }
      
      // Проверяем окончательный статус
      if (uploadStatus.status !== 'completed') {
        throw new Error(`Ошибка финализации загрузки: ${uploadStatus.message || 'Превышено время ожидания'}`);
      }
      
      // Используем результат последней проверки
      finalizeResult = uploadStatus;
    } else if (!finalizeResult.success) {
      throw new Error(`Ошибка финализации загрузки: ${finalizeResult.message}`);
    }
    
    console.log('Upload finalized successfully:', finalizeResult);
    
    // Устанавливаем 100% прогресс
    if (onProgress) {
      onProgress(100);
    }
    
    // Возвращаем результат загрузки
    return {
      success: true,
      message: 'Файл успешно загружен',
      filePath: finalizeResult.filePath,
      fileName: finalizeResult.originalName || file.name,
      videoType: finalizeResult.videoType || 'local'
    };
  } catch (error) {
    console.error('Ошибка загрузки файла:', error);
    return {
      success: false,
      message: error.message || 'Произошла неизвестная ошибка'
    };
  }
};

// Инициализация сессии загрузки
const initializeUpload = async (fileName, fileSize) => {
  try {
    const response = await api.post('/api/storage/init-upload', {
      fileName,
      fileSize
    });
    return response.data;
  } catch (error) {
    console.error('Error initializing upload:', error);
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

// Загрузка одного чанка
const uploadChunk = async (sessionId, chunk, chunkIndex, totalChunks) => {
  try {
    console.log(`Uploading chunk ${chunkIndex+1}/${totalChunks}, size: ${chunk.size} bytes`);
    
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('chunkIndex', chunkIndex);
    formData.append('totalChunks', totalChunks);
    formData.append('chunk', chunk, 'chunk.bin');
    
    const response = await api.post('/api/storage/upload-chunk', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000 // Увеличенный таймаут до 60 секунд для загрузки больших чанков
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error uploading chunk ${chunkIndex}:`, error);
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

// Завершение загрузки
const finalizeUpload = async (sessionId, originalName) => {
  try {
    const response = await api.post('/api/storage/finalize-upload', {
      sessionId,
      originalName
    }, {
      timeout: 600000 // Увеличенный таймаут до 10 минут для финализации
    });
    return response.data;
  } catch (error) {
    console.error('Error finalizing upload:', error);
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

// Новая функция для проверки статуса загрузки
const checkUploadStatus = async (sessionId) => {
  try {
    const response = await api.get(`/api/storage/upload-status/${sessionId}`, {
      timeout: 30000 // 30 секунд таймаут
    });
    return response.data;
  } catch (error) {
    console.error('Error checking upload status:', error);
    return {
      success: false,
      status: 'failed',
      message: error.response?.data?.message || error.message
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
    
    // Clean the filename - keep only the actual filename without paths
    let cleanFileName = fileName;
    if (fileName.includes('/')) {
      cleanFileName = fileName.split('/').pop();
    }
    cleanFileName = cleanFileName.replace(/^\/videos\//, '');
    
    console.log(`Using clean filename: ${cleanFileName} for deletion`);
    
    // Directly follow the curl command format that works manually
    const response = await api.delete('/api/storage/delete', {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        pattern: cleanFileName,
        confirm: true // This is the key parameter that was missing
      }
    });
    
    console.log('File deletion response:', response.data);
    return response.data || { success: true, message: 'File deleted successfully' };
  } catch (error) {
    console.error('Error deleting video file:', error);
    
    // If we get a 404, consider it already deleted
    if (error.response && error.response.status === 404) {
      return { 
        success: true, 
        message: 'File not found (already deleted)',
        status: 404
      };
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

// Update course positions (reordering)
export const updateCoursePositions = async (courseIds) => {
  try {
    const response = await api.put('/api/admin/courses/positions', { 
      positions: courseIds 
    });
    return response.data;
  } catch (error) {
    console.error('Error updating course positions:', error);
    throw error;
  }
};
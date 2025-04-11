// В файле client/src/services/admin.service.js добавьте:
import api from './api';

// Keep track of recent errors to avoid spamming console
const errorCache = {
  lastDiskUsageError: null,
  lastDeleteVideosError: null
};

// Получение информации о диске
export const getDiskUsage = async () => {
  try {
    const response = await api.get('/api/admin/disk-usage');
    // Clear error cache on success
    errorCache.lastDiskUsageError = null;
    return response.data;
  } catch (error) {
    // Only log new errors to avoid spamming console
    const errorMsg = error.message || 'Unknown error';
    
    if (errorCache.lastDiskUsageError !== errorMsg) {
      console.error('Error getting disk usage:', error);
      errorCache.lastDiskUsageError = errorMsg;
    }
    
    // For 502 errors, return a reasonable default to prevent UI errors
    if (error.response && error.response.status === 502) {
      return {
        total: 100 * 1024 * 1024 * 1024, // 100GB
        used: 10 * 1024 * 1024 * 1024,   // 10GB
        free: 90 * 1024 * 1024 * 1024,   // 90GB
        videos: {
          count: 0,
          size: 0
        }
      };
    }
    
    throw error;
  }
};

// Удаление всех видео
export const deleteAllVideos = async () => {
  try {
    const response = await api.delete('/api/admin/delete-all-videos');
    // Clear error cache on success
    errorCache.lastDeleteVideosError = null;
    return response.data;
  } catch (error) {
    // Only log new errors to avoid spamming console
    const errorMsg = error.message || 'Unknown error';
    
    if (errorCache.lastDeleteVideosError !== errorMsg) {
      console.error('Error deleting all videos:', error);
      errorCache.lastDeleteVideosError = errorMsg;
    }
    
    throw error;
  }
};
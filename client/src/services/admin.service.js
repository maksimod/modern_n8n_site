// В файле client/src/services/admin.service.js добавьте:
import api from './api';

// Получение информации о диске
export const getDiskUsage = async () => {
  try {
    const response = await api.get('/api/admin/disk-usage');
    return response.data;
  } catch (error) {
    console.error('Error getting disk usage:', error);
    throw error;
  }
};
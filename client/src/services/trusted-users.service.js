// client/src/services/trusted-users.service.js
import api from './api';

// Получить список всех доверенных пользователей
export const getTrustedUsers = async (showDisabled = false) => {
  try {
    const response = await api.get(`/api/admin/trusted-users?showDisabled=${showDisabled}`);
    return response.data;
  } catch (error) {
    console.error('Error getting trusted users:', error);
    throw error;
  }
};

// Добавить нового доверенного пользователя
export const addTrustedUser = async (username, notes = "") => {
  try {
    const response = await api.post('/api/admin/trusted-users', { username, notes });
    return response.data;
  } catch (error) {
    console.error('Error adding trusted user:', error);
    throw error;
  }
};

// Отозвать доступ пользователя
export const revokeTrustedUser = async (username) => {
  try {
    const response = await api.delete(`/api/admin/trusted-users/${username}`);
    return response.data;
  } catch (error) {
    console.error('Error revoking trusted user:', error);
    throw error;
  }
};

// Запустить очистку отозванных пользователей
export const runUserCleanup = async () => {
  try {
    const response = await api.post('/api/admin/trusted-users/cleanup');
    return response.data;
  } catch (error) {
    console.error('Error running user cleanup:', error);
    throw error;
  }
};

// Проверить, является ли пользователь доверенным
export const checkIfTrusted = async (username) => {
  try {
    const response = await api.get(`/api/auth/check-username/${username}`);
    return response.data.trusted === true;
  } catch (error) {
    console.error('Error checking if user is trusted:', error);
    return false;
  }
};
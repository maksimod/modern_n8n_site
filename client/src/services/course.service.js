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
export const isVideoCompleted = (user, courseId, videoId) => {
  // Здесь должна быть логика проверки из localStorage
  return false;
};

// Функция для отметки видео как просмотренного
export const markVideoAsCompleted = async (userId, courseId, videoId, completed) => {
  // Здесь должна быть логика сохранения в localStorage
  return true;
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
export const deleteVideo = async (courseId, videoId) => {
  try {
    const response = await api.delete(`/api/admin/courses/${courseId}/videos/${videoId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting video ${videoId}:`, error);
    throw error;
  }
};

// Upload video file
export const uploadVideoFile = async (file, onProgress) => {
  try {
    console.log('Uploading file:', file.name);
    const formData = new FormData();
    formData.append('video', file);
    
    const response = await api.post('/api/admin/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
          console.log('Upload progress:', percentCompleted + '%');
        }
      }
    });
    
    console.log('Upload response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error uploading video:', error);
    throw error;
  }
};

// Update video positions (reordering)
export const updateVideoPositions = async (courseId, videoPositions) => {
  try {
    const response = await api.put(`/api/admin/courses/${courseId}/videos/positions`, { positions: videoPositions });
    return response.data;
  } catch (error) {
    console.error('Error updating video positions:', error);
    throw error;
  }
};
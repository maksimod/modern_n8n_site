// client/src/contexts/ProgressContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getCourseProgress, markVideoAsCompleted } from '../services/course.service';

const ProgressContext = createContext(null);

export const useProgress = () => {
  return useContext(ProgressContext);
};

export const ProgressProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [courseProgresses, setCourseProgresses] = useState({});

  const loadCourseProgress = async (courseId) => {
    if (!currentUser) return null;

    try {
      const progress = await getCourseProgress(courseId);
      setCourseProgresses(prev => ({
        ...prev,
        [courseId]: progress
      }));
      return progress;
    } catch (error) {
      console.error('Error loading course progress', error);
      return null;
    }
  };

  const updateVideoProgress = async (courseId, videoId, isCompleted) => {
    if (!currentUser) return false;

    try {
      const result = await markVideoAsCompleted(
        currentUser.id, 
        courseId, 
        videoId, 
        isCompleted
      );

      // Обновляем локальное состояние прогресса
      setCourseProgresses(prev => {
        const currentProgress = prev[courseId] || { 
          completedVideos: [], 
          totalVideos: 0 
        };

        const updatedCompletedVideos = isCompleted
          ? [...new Set([...currentProgress.completedVideos, videoId])]
          : currentProgress.completedVideos.filter(id => id !== videoId);

        return {
          ...prev,
          [courseId]: {
            ...currentProgress,
            completedVideos: updatedCompletedVideos
          }
        };
      });

      return result;
    } catch (error) {
      console.error('Error updating video progress', error);
      return false;
    }
  };

  const isVideoCompleted = (courseId, videoId) => {
    const courseProgress = courseProgresses[courseId];
    return courseProgress 
      ? courseProgress.completedVideos.includes(videoId) 
      : false;
  };

  const value = {
    loadCourseProgress,
    updateVideoProgress,
    isVideoCompleted,
    courseProgresses
  };

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
};
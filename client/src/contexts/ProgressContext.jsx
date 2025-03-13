// client/src/contexts/ProgressContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import { getCourseProgress, markVideoAsCompleted } from '../services/course.service';

const ProgressContext = createContext(null);

export const useProgress = () => useContext(ProgressContext);

export const ProgressProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [courseProgresses, setCourseProgresses] = useState({});

  // Загрузка прогресса при инициализации из localStorage
  useEffect(() => {
    if (!currentUser) return;
    
    try {
      const storedProgress = localStorage.getItem(`progress_${currentUser.id}`);
      if (storedProgress) {
        setCourseProgresses(JSON.parse(storedProgress));
      }
    } catch (error) {
      console.error('Error loading progress from localStorage:', error);
    }
  }, [currentUser]);

  // Загрузка прогресса для конкретного курса с сервера
  const loadCourseProgress = async (courseId) => {
    if (!currentUser) return null;

    try {
      const response = await getCourseProgress(courseId);
      
      if (response?.success && response?.progress) {
        // Сохраняем ответ сервера
        setCourseProgresses(prev => {
          const updatedProgress = {
            ...prev,
            [courseId]: response.progress
          };
          
          // Сохраняем в localStorage
          localStorage.setItem(`progress_${currentUser.id}`, JSON.stringify(updatedProgress));
          
          return updatedProgress;
        });
        
        return response.progress;
      }
      return {};
    } catch (error) {
      console.error('Error loading course progress:', error);
      return {};
    }
  };

  // Обновление статуса просмотра видео
  const updateVideoProgress = async (courseId, videoId, isCompleted) => {
    if (!currentUser) return false;

    try {
      // Отправляем данные на сервер
      await markVideoAsCompleted(courseId, videoId, isCompleted);
      
      // Обновляем локальное состояние
      setCourseProgresses(prev => {
        // Получаем текущий прогресс для этого курса или создаем новый объект
        const courseProgress = {...(prev[courseId] || {})};
        
        // Устанавливаем значение для видео
        courseProgress[videoId] = isCompleted;
        
        const updatedProgress = {
          ...prev,
          [courseId]: courseProgress
        };
        
        // Сохраняем в localStorage
        localStorage.setItem(`progress_${currentUser.id}`, JSON.stringify(updatedProgress));
        
        return updatedProgress;
      });

      return true;
    } catch (error) {
      console.error('Error updating video progress:', error);
      return false;
    }
  };

  // Проверка статуса просмотра видео
  const isVideoCompleted = (courseId, videoId) => {
    if (!courseId || !videoId) return false;
    
    // Получаем прогресс для этого курса
    const courseProgress = courseProgresses[courseId];
    if (!courseProgress) return false;
    
    // Проверяем значение для этого видео
    return !!courseProgress[videoId];
  };

  return (
    <ProgressContext.Provider value={{
      loadCourseProgress,
      updateVideoProgress,
      isVideoCompleted,
      courseProgresses
    }}>
      {children}
    </ProgressContext.Provider>
  );
};

export default ProgressProvider;
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import { getCourseProgress, markVideoAsCompleted } from '../services/course.service';

const ProgressContext = createContext(null);

export const useProgress = () => {
  return useContext(ProgressContext);
};

export const ProgressProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [courseProgresses, setCourseProgresses] = useState({});

  // Загрузка прогресса при инициализации
  useEffect(() => {
    if (!currentUser) return;
   
    console.log('ProgressProvider initialized with user:', currentUser.id);
    
    // Попытка загрузить прогресс из localStorage
    try {
      const storedProgress = localStorage.getItem(`progress_${currentUser.id}`);
      if (storedProgress) {
        const parsedProgress = JSON.parse(storedProgress);
        setCourseProgresses(parsedProgress);
        console.log('Loaded progress from localStorage:', parsedProgress);
      }
    } catch (error) {
      console.error('Error loading progress from localStorage:', error);
    }
  }, [currentUser]);

  // Загрузка прогресса для конкретного курса с сервера
  const loadCourseProgress = async (courseId) => {
    if (!currentUser) return null;

    try {
      console.log('Loading progress for course:', courseId);
      const response = await getCourseProgress(courseId);
      console.log('Progress API response:', response);
      
      if (response && response.success && response.progress) {
        // Сохраняем ответ сервера
        setCourseProgresses(prev => {
          const updatedProgress = {
            ...prev,
            [courseId]: response.progress
          };
         
          console.log('Updated progress state after API load:', updatedProgress);
          
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
   
    console.log('Updating video progress:', { courseId, videoId, isCompleted });

    try {
      // Отправляем данные на сервер
      await markVideoAsCompleted(courseId, videoId, isCompleted);
     
      // Обновляем локальное состояние
      setCourseProgresses(prev => {
        // Получаем текущий прогресс для этого курса или создаем новый объект
        const courseProgress = {...(prev[courseId] || {})};
        
        // Устанавливаем значение для видео
        if (isCompleted) {
          courseProgress[videoId] = true;
        } else {
          // Если false, можно либо установить false, либо удалить ключ
          courseProgress[videoId] = false;
        }
        
        const updatedProgress = {
          ...prev,
          [courseId]: courseProgress
        };
       
        console.log('Updated progress after toggle:', updatedProgress);
        
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

  // Проверка статуса просмотра видео - с подробным логированием для отладки
  const isVideoCompleted = (courseId, videoId) => {
    console.log('Checking video completion:', { courseId, videoId });
    console.log('Current courseProgresses:', courseProgresses);
   
    if (!courseId || !videoId) return false;
   
    // Получаем прогресс для этого курса
    const courseProgress = courseProgresses[courseId];
    console.log('Course progress for', courseId, ':', courseProgress);
   
    if (!courseProgress) return false;
   
    // Проверяем значение для этого видео
    const videoStatus = courseProgress[videoId];
    console.log('Video status for', videoId, ':', videoStatus);
   
    // Любое истинное значение (true, объект и т.д.) считается "выполненным"
    return !!videoStatus;
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

export default ProgressProvider;
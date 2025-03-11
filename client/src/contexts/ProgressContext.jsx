import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useProgress } from '../contexts/ProgressContext'; // Добавьте этот импорт
import styles from '../styles/courses.module.css';

const CourseItem = ({ course, currentVideo }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { updateVideoProgress, isVideoCompleted } = useProgress(); // Деструктуризируйте хук

  // Остальной код без изменений
};

const ProgressContext = createContext(null);

export const ProgressProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [courseProgresses, setCourseProgresses] = useState({});

  // Новый метод загрузки прогресса при инициализации
  useEffect(() => {
    const loadInitialProgress = async () => {
      if (!currentUser) return;

      try {
        const storedProgress = localStorage.getItem(`progress_${currentUser.id}`);
        
        if (storedProgress) {
          const parsedProgress = JSON.parse(storedProgress);
          setCourseProgresses(parsedProgress);
        }
      } catch (error) {
        console.error('Error loading initial progress', error);
      }
    };

    loadInitialProgress();
  }, [currentUser]);

  const loadCourseProgress = async (courseId) => {
    if (!currentUser) return null;

    try {
      const response = await getCourseProgress(courseId);
      
      // Обновляем локальное состояние и localStorage
      setCourseProgresses(prev => {
        const updatedProgress = {
          ...prev,
          [courseId]: response
        };
        
        // Сохраняем в localStorage
        localStorage.setItem(`progress_${currentUser.id}`, JSON.stringify(updatedProgress));
        
        return updatedProgress;
      });

      return response;
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

      // Обновляем локальное состояние и localStorage
      setCourseProgresses(prev => {
        const updatedProgress = {
          ...prev,
          [courseId]: {
            ...(prev[courseId] || {}),
            [videoId]: isCompleted
          }
        };
        
        // Сохраняем в localStorage
        localStorage.setItem(`progress_${currentUser.id}`, JSON.stringify(updatedProgress));
        
        return updatedProgress;
      });

      return result;
    } catch (error) {
      console.error('Error updating video progress', error);
      return false;
    }
  };

  const isVideoCompleted = (courseId, videoId) => {
    const courseProgress = courseProgresses[courseId];
    return courseProgress?.[videoId] || false;
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
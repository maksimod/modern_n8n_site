import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getCourses, deleteCourse } from '../services/course.service';
import Header from '../components/Layout/Header';
import CourseEditor from '../components/Admin/CourseEditor';
import styles from '../styles/admin.module.css';
import componentStyles from '../styles/components.module.css';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCourseEditor, setShowCourseEditor] = useState(false);
  const [currentCourse, setCurrentCourse] = useState(null);
  
  // Проверяем статус админа
  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);
  
  // Загружаем курсы
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getCourses(language);
        setCourses(data);
      } catch (err) {
        console.error('Ошибка загрузки курсов:', err);
        setError('Не удалось загрузить курсы. Пожалуйста, убедитесь, что сервер запущен.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [language]);
  
  // Создание нового курса
  const handleCreateCourse = () => {
    setCurrentCourse(null);
    setShowCourseEditor(true);
  };
  
  // Редактирование существующего курса
  const handleEditCourse = (course) => {
    setCurrentCourse(course);
    setShowCourseEditor(true);
  };
  
  // Удаление курса
  const handleDeleteCourse = async (courseId) => {
    if (window.confirm(t('admin.confirmDeleteCourse'))) {
      try {
        await deleteCourse(courseId);
        // Обновляем список после удаления
        setCourses(courses.filter(course => course.id !== courseId));
      } catch (error) {
        console.error('Error deleting course:', error);
        alert('Failed to delete course');
      }
    }
  };
  
  // Закрытие редактора курса
  const handleCloseEditor = (refreshNeeded = false) => {
    setShowCourseEditor(false);
    
    // Если нужно обновить список курсов
    if (refreshNeeded) {
      setLoading(true);
      getCourses(language)
        .then(data => setCourses(data))
        .catch(err => console.error('Error refreshing courses:', err))
        .finally(() => setLoading(false));
    }
  };
  
  if (loading) {
    return (
      <>
        <Header />
        <div className={componentStyles.loadingContainer}>
          <div className={componentStyles.loadingSpinner}></div>
          {t('loading')}
        </div>
      </>
    );
  }
  
  // Показываем редактор курса, если открыт
  if (showCourseEditor) {
    return <CourseEditor 
      course={currentCourse} 
      onClose={handleCloseEditor} 
      language={language}
    />;
  }

  return (
    <div>
      <Header />
      
      <div className={componentStyles.container}>
        <div className={componentStyles.pageHeader}>
          <h1 className={componentStyles.pageTitle}>{t('admin.dashboard')}</h1>
          
          <button 
            className={`${componentStyles.button} ${componentStyles.buttonPrimary}`}
            onClick={handleCreateCourse}
          >
            {t('admin.createCourse')}
          </button>
        </div>
        
        {error && (
          <div className={styles.errorAlert}>
            {error}
          </div>
        )}
        
        <div className={styles.courseGrid}>
          {courses.length === 0 ? (
            <p className={styles.noCourses}>No courses found.</p>
          ) : (
            courses.map(course => (
              <div key={course.id} className={styles.courseCard}>
                <div className={styles.courseHeader}>
                  <h3 className={styles.courseTitle}>{course.title}</h3>
                </div>
                
                <p className={styles.courseDescription}>{course.description}</p>
                <div className={styles.courseMeta}>
                  <span className={styles.videoCount}>
                    {course.videos?.length || 0} {t('videos')}
                  </span>
                </div>
                
                <div className={styles.courseActions}>
                  <button 
                    className={`${componentStyles.button} ${componentStyles.buttonSecondary}`}
                    onClick={() => navigate(`/course/${course.id}`)}
                  >
                    {t('view')}
                  </button>
                  <button 
                    className={`${componentStyles.button} ${componentStyles.buttonPrimary}`}
                    onClick={() => handleEditCourse(course)}
                  >
                    {t('admin.editCourse')}
                  </button>
                  <button 
                    className={`${componentStyles.button} ${componentStyles.buttonDanger}`}
                    onClick={() => handleDeleteCourse(course.id)}
                  >
                    {t('admin.deleteCourse')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
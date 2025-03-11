// client/src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getCourses, deleteCourse } from '../services/course.service';
import Header from '../components/Layout/Header';
import CourseEditor from '../components/Admin/CourseEditor';
import styles from '../styles/courses.module.css';

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
    setCurrentCourse(null); // Reset current course to create new
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
    return <div className={styles.loading}>{t('loading')}</div>;
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
      
      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1>{t('admin.dashboard')}</h1>
          
          <button 
            className={styles.adminButton}
            onClick={handleCreateCourse}
          >
            {t('admin.createCourse')}
          </button>
        </div>
        
        {error && (
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#ffe0e0', 
            color: '#d32f2f', 
            borderRadius: '8px',
            marginBottom: '20px' 
          }}>
            {error}
          </div>
        )}
        
        <div className={styles.adminCourseList}>
          {courses.length === 0 ? (
            <p>No courses found.</p>
          ) : (
            courses.map(course => (
              <div key={course.id} className={styles.adminCourseItem}>
                <div className={styles.adminCourseHeader}>
                  <h3 className={styles.adminCourseTitle}>{course.title}</h3>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      className={styles.adminButtonSecondary}
                      onClick={() => navigate(`/course/${course.id}`)}
                    >
                      View
                    </button>
                    <button 
                      className={styles.adminButton}
                      onClick={() => handleEditCourse(course)}
                    >
                      {t('admin.editCourse')}
                    </button>
                    <button 
                      className={styles.adminButtonDanger}
                      onClick={() => handleDeleteCourse(course.id)}
                    >
                      {t('admin.deleteCourse')}
                    </button>
                  </div>
                </div>
                
                <p>{course.description}</p>
                <p>{course.videos?.length || 0} {t('videos')}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
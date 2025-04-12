// client/src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getCourses, deleteCourse, updateCoursePositions, createCourse } from '../services/course.service';
import { deleteAllVideos } from '../services/admin.service';
import Header from '../components/Layout/Header';
import CourseEditor from '../components/Admin/CourseEditor';
import styles from '../styles/admin.module.css';
import componentStyles from '../styles/components.module.css';
import DiskUsage from '../components/Admin/DiskUsage';

// Временно закомментировано до исправления ошибок
// import TrustedUsersManager from '../components/Admin/TrustedUsersManager';

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
  const [deletingVideos, setDeletingVideos] = useState(false);
  const [deleteVideoResult, setDeleteVideoResult] = useState(null);
  
  // Упрощаем админ дашборд - убираем вкладки, пока не наладим работу
  // const [activeTab, setActiveTab] = useState('courses');
  
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
  
  // Удаление всех видео
  const handleDeleteAllVideos = async () => {
    if (window.confirm('Вы действительно хотите удалить ВСЕ видеофайлы? Это действие невозможно отменить.')) {
      try {
        setDeletingVideos(true);
        setDeleteVideoResult(null);
        const result = await deleteAllVideos();
        setDeleteVideoResult(result);
        // Перезагружаем данные о диске
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } catch (error) {
        console.error('Error deleting all videos:', error);
        setDeleteVideoResult({
          success: false,
          message: error.message || 'Не удалось удалить видеофайлы'
        });
      } finally {
        setDeletingVideos(false);
      }
    }
  };
  
  // Закрытие редактора курса
  const handleCloseEditor = (refreshNeeded = false) => {
    setShowCourseEditor(false);
    
    // Disable automatic refreshing which can cause 502 errors
    // Only refresh if explicitly needed and the server is not having issues
    if (refreshNeeded) {
      // Set a loading state but don't make the API call right away
      setLoading(true);
      
      // Instead, just use whatever data we have and reset loading state after a short delay
      setTimeout(() => {
        setLoading(false);
      }, 500);
      
      // Show a message to the user that they may need to refresh manually if data is stale
      console.log('Course editor closed. Manual refresh may be needed for latest data.');
    }
  };
  
  // Обработчик для перетаскивания курсов (перемещение вверх/вниз)
  const handleReorderCourses = (courseId, direction) => {
    const coursesCopy = [...courses];
    const index = coursesCopy.findIndex(c => c.id === courseId);
    
    if (index === -1) return;
    
    if (direction === 'up' && index > 0) {
      // Move course up
      [coursesCopy[index], coursesCopy[index - 1]] = [coursesCopy[index - 1], coursesCopy[index]];
    } else if (direction === 'down' && index < coursesCopy.length - 1) {
      // Move course down
      [coursesCopy[index], coursesCopy[index + 1]] = [coursesCopy[index + 1], coursesCopy[index]];
    }
    
    // Обновить состояние
    setCourses(coursesCopy);
    
    // Async call to update course positions on the server
    const courseIds = coursesCopy.map(course => course.id);
    updateCoursePositions(courseIds)
      .catch(err => {
        console.error('Error saving course positions:', err);
        // В случае ошибки, просто восстанавливаем состояние, запрашивая курсы заново
        setLoading(true);
        getCourses(language)
          .then(data => {
            setCourses(data);
            setLoading(false);
          })
          .catch(fetchErr => {
            console.error('Failed to refresh courses after reordering error:', fetchErr);
            setLoading(false);
          });
      });
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
        <DiskUsage />
        
        <div className={styles.adminActions}>
          <button 
            className={`${styles.adminButtonDanger} ${styles.deleteAllVideosButton}`}
            onClick={handleDeleteAllVideos}
            disabled={deletingVideos}
          >
            {deletingVideos ? 'Удаление...' : 'Удалить все видео'}
          </button>
        </div>
        
        {deleteVideoResult && (
          <div className={`${styles.resultMessage} ${deleteVideoResult.success ? styles.successMessage : styles.errorMessage}`}>
            {deleteVideoResult.message}
            {deleteVideoResult.deletedCount !== undefined && (
              <p>Удалено файлов: {deleteVideoResult.deletedCount}</p>
            )}
          </div>
        )}
        
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
                  
                  <div className={styles.reorderButtons}>
                    <button
                      className={`${componentStyles.button} ${componentStyles.buttonSecondary}`}
                      onClick={() => handleReorderCourses(course.id, 'up')}
                      disabled={courses.indexOf(course) === 0}
                      title={t('admin.moveUp')}
                      style={{ padding: '0.375rem 0.75rem' }}
                    >
                      ↑
                    </button>
                    <button
                      className={`${componentStyles.button} ${componentStyles.buttonSecondary}`}
                      onClick={() => handleReorderCourses(course.id, 'down')}
                      disabled={courses.indexOf(course) === courses.length - 1}
                      title={t('admin.moveDown')}
                      style={{ padding: '0.375rem 0.75rem' }}
                    >
                      ↓
                    </button>
                  </div>
                  
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
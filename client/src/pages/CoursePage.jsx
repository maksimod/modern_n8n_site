// client/src/pages/CoursePage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useProgress } from '../contexts/ProgressContext';
import { getCourseById, getVideoById, deleteVideo } from '../services/course.service';
import Header from '../components/Layout/Header';
import VideoPlayer from '../components/Courses/VideoPlayer';
import styles from '../styles/courses.module.css';

const CoursePage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const videoId = searchParams.get('video');
  const { language } = useLanguage();
  const { currentUser } = useAuth();
  const { updateVideoProgress, isVideoCompleted, loadCourseProgress } = useProgress();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState(null);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  
  // Используем реф для отслеживания, загрузился ли прогресс
  const progressLoadedRef = useRef(false);
  // Храним предыдущий videoId, чтобы избежать лишних перезагрузок
  const prevVideoIdRef = useRef(null);
  
  // Функция для загрузки видео
  const fetchVideo = useCallback(async (cId, vId, lang) => {
    try {
      if (!vId || prevVideoIdRef.current === vId) return null;
      
      const videoData = await getVideoById(cId, vId, lang);
      prevVideoIdRef.current = vId;
      return videoData;
    } catch (error) {
      console.error('Error loading video:', error);
      return null;
    }
  }, []);
  
  // Загружаем курс
  const fetchCourse = useCallback(async () => {
    try {
      setLoading(true);
      const courseData = await getCourseById(courseId, language);
      
      if (courseData) {
        setCourse(courseData);
      }
    } catch (error) {
      console.error('Error loading course:', error);
      setError('Ошибка загрузки курса');
    } finally {
      setLoading(false);
    }
  }, [courseId, language]);
  
  useEffect(() => {
    let isMounted = true;
    
    const loadCourse = async () => {
      if (!isMounted) return;
      await fetchCourse();
    };
    
    loadCourse();
    
    return () => {
      isMounted = false;
    };
  }, [fetchCourse]);
  
  // Загружаем текущее видео когда курс загружен и есть videoId
  useEffect(() => {
    let isMounted = true;
    
    const loadVideo = async () => {
      if (!course) return;
      
      // Если есть видео в URL и оно существует в курсе
      if (videoId && course.videos.find(v => v.id === videoId)) {
        const videoData = await fetchVideo(courseId, videoId, language);
        
        if (!isMounted) return;
        
        if (videoData) {
          setCurrentVideo(videoData);
        }
      } else if (course.videos.length > 0 && !videoId) {
        // Если нет видео в URL, устанавливаем первое видео из курса
        if (isMounted) {
          setSearchParams({ video: course.videos[0].id });
        }
      }
    };
    
    loadVideo();
    
    return () => {
      isMounted = false;
    };
  }, [courseId, language, videoId, course, fetchVideo, setSearchParams]);
  
  // Загружаем прогресс по курсу
  useEffect(() => {
    let isMounted = true;
    
    const fetchProgress = async () => {
      if (currentUser && courseId && !progressLoadedRef.current) {
        try {
          await loadCourseProgress(courseId);
          if (isMounted) {
            progressLoadedRef.current = true;
          }
        } catch (error) {
          console.error('Error loading progress:', error);
        }
      }
    };
    
    fetchProgress();
    
    return () => {
      isMounted = false;
    };
  }, [currentUser, courseId, loadCourseProgress]);

  // Переключение мобильного сайдбара
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  // Отметка видео как просмотренного
  const handleVideoCompletionToggle = (videoId) => {
    if (!currentUser || !course) return;

    const currentCompletionStatus = isVideoCompleted(course.id, videoId);
    updateVideoProgress(course.id, videoId, !currentCompletionStatus);
  };

  // Удаление видео из курса
  const handleVideoDelete = async (courseId, videoId) => {
    if (!currentUser || !currentUser.isAdmin) {
      alert('У вас нет прав для удаления видео');
      return;
    }

    if (!confirm('Вы уверены, что хотите удалить это видео?')) {
      return;
    }

    try {
      setLoading(true);
      
      // Вызов API для удаления видео
      await deleteVideo(courseId, videoId);
      
      // Обновляем данные о курсе
      await fetchCourse();
      
      // Если удалили текущее видео, переходим к первому видео в курсе
      if (course.videos.length > 0) {
        const nextVideoIndex = course.videos.findIndex(v => v.id === videoId);
        const nextVideo = nextVideoIndex > 0 
          ? course.videos[nextVideoIndex - 1] 
          : (course.videos.length > 1 ? course.videos[1] : null);
        
        if (nextVideo) {
          setSearchParams({ video: nextVideo.id });
        } else {
          // Если видео больше нет, возвращаемся к списку курсов
          navigate('/');
        }
      } else {
        // Если видео больше нет, возвращаемся к списку курсов
        navigate('/');
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      setError('Ошибка при удалении видео');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.loading}>{t('loading')}</div>
      </>
    );
  }

  if (!course) {
    return (
      <>
        <Header />
        <div className={styles.notFound}>Курс не найден</div>
      </>
    );
  }

  return (
    <div>
      <Header />
      
      <button 
        className={styles.mobileMenuButton} 
        onClick={toggleSidebar}
      >
        {showSidebar ? t('hideCourseContents') : t('showCourseContents')}
      </button>
      
      <div className={styles.coursePageContainer}>
        <div className={`${styles.courseSidebar} ${showSidebar ? styles.visible : ''}`}>
          <Link to="/" className={styles.backToCoursesLink}>
            <span>← {t('backToCourses')}</span>
          </Link>
          
          <h2 className={styles.courseTitle}>{course.title}</h2>
          
          {error && <div className={styles.errorBlock}>{error}</div>}
          
          <div className={styles.videosList}>
          {course.videos.map((video, index) => {
            const isActive = currentVideo && currentVideo.id === video.id;
            const completed = isVideoCompleted(course.id, video.id);
            
            // Форматируем длительность для корректного отображения
            const formattedDuration = video.duration ? video.duration.trim() : '00:00';
            
            return (
              <div 
                key={video.id} 
                className={styles.videoItemContainer} 
              >
                <Link 
                  to={`/course/${courseId}?video=${video.id}`}
                  className={`${styles.videoItem} ${isActive ? styles.videoItemActive : ''} ${
                    completed ? styles.videoCardCompleted : ''
                  }`}
                  onClick={() => setShowSidebar(false)}
                >
                  <div className={styles.videoIndex}>{index + 1}</div>
                  
                  <div className={styles.videoDetails}>
                    <div className={styles.videoTitleRow}>
                      <h4 className={styles.videoTitle} title={video.title}>
                        {video.title}
                      </h4>
                      {formattedDuration && (
                        <span className={styles.videoDuration}>
                          {formattedDuration}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                <div className={styles.videoCheckboxContainer}>
                  <input 
                    type="checkbox" 
                    className={styles.videoCheckbox}
                    checked={completed}
                    onChange={() => handleVideoCompletionToggle(video.id)}
                  />
                </div>
              </div>
            );
          })}
          </div>
        </div>
        
        <div className={styles.videoContent}>
          {currentVideo ? (
            <VideoPlayer 
              course={course} 
              video={currentVideo} 
              onVideoComplete={handleVideoCompletionToggle}
              onVideoDelete={handleVideoDelete}
            />
          ) : (
            <div className={styles.selectVideo}>{t('selectVideo')}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursePage;
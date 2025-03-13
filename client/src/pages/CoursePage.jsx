// client/src/pages/CoursePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useProgress } from '../contexts/ProgressContext';
import { getCourseById, getVideoById } from '../services/course.service';
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
  
  const [course, setCourse] = useState(null);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  
  // Используем реф для отслеживания, загрузился ли прогресс
  const progressLoadedRef = useRef(false);
  
  // Загружаем курс и текущее видео
  useEffect(() => {
    let isMounted = true;
    
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const courseData = await getCourseById(courseId, language);
        
        if (!isMounted) return;
        
        if (courseData) {
          setCourse(courseData);
          
          // Если есть видео в URL и оно существует в курсе
          if (videoId && courseData.videos.find(v => v.id === videoId)) {
            const videoData = await getVideoById(courseId, videoId, language);
            if (!isMounted) return;
            if (videoData) {
              setCurrentVideo(videoData);
            }
          } else if (courseData.videos.length > 0) {
            // Если нет видео в URL, устанавливаем первое видео из курса
            if (isMounted) {
              setSearchParams({ video: courseData.videos[0].id });
            }
          }
        }
      } catch (error) {
        console.error('Error loading course:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchCourse();
    
    return () => {
      isMounted = false;
    };
  }, [courseId, language, videoId, setSearchParams]);
  
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
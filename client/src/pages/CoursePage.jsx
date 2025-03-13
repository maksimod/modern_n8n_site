import VideoPlayer from '../components/Courses/VideoPlayer';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useProgress } from '../contexts/ProgressContext';
import { getCourseById, getVideoById } from '../services/course.service';
import Header from '../components/Layout/Header';
import { VIDEO_TYPES, SERVER_URL } from '../config';
import styles from '../styles/courses.module.css';

// Компонент для отображения текстового урока
const TextLessonView = ({ video, courseId, completed, onToggleComplete }) => {
  const { t } = useTranslation();
  
  // Получаем полный URL для видео
  const fullVideoUrl = video.localVideo 
    ? `${SERVER_URL}${video.localVideo}`
    : video.videoUrl;
  
  // Функция для скачивания
  const handleDownload = () => {
    if (!video.localVideo) return;
    
    const link = document.createElement('a');
    link.href = fullVideoUrl;
    
    const fileName = video.title 
      ? `${video.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4` 
      : 'video.mp4';
    
    link.setAttribute('download', fileName);
    link.setAttribute('target', '_blank');
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className={styles.textLessonContainer}>
      <div className={styles.videoHeaderRow}>
        <h2 className={styles.videoTitle}>{video.title}</h2>
        {video.localVideo && (
          <button 
            className={styles.downloadButton}
            onClick={handleDownload}
          >
            {t('course.download')}
          </button>
        )}
      </div>
      <div className={styles.textLessonContent}>
        <p className={styles.videoDescription}>{video.description}</p>
      </div>
    </div>
  );
};

// Компонент для отображения видеоурока
const VideoLessonView = ({ video, courseId, completed, onToggleComplete, onDownload }) => {
  const { t } = useTranslation();
  const fullVideoUrl = video.localVideo 
    ? `${SERVER_URL}${video.localVideo}`
    : video.videoUrl;
  
  return (
    <div>
      <div className={styles.videoWrapper}>
        {video.localVideo ? (
          <video
            src={fullVideoUrl}
            className={styles.videoIframe}
            controls
            autoPlay={false}
            title={video.title}
          ></video>
        ) : video.videoUrl ? (
          <iframe
            src={video.videoUrl.replace('watch?v=', 'embed/')}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className={styles.videoIframe}
          ></iframe>
        ) : (
          <div className={styles.noVideoSource}>Видео недоступно</div>
        )}
      </div>
      
      <div className={styles.videoContentArea}>
        <div className={styles.videoHeaderRow}>
          <h2 className={styles.videoTitle}>{video.title}</h2>
          {video.localVideo && (
            <button 
              className={styles.downloadButton}
              onClick={onDownload}
            >
              {t('course.download')}
            </button>
          )}
        </div>
        <p className={styles.videoDescription}>{video.description}</p>
      </div>
    </div>
  );
};

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
  const [isTextLesson, setIsTextLesson] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  
  // Используем реф для отслеживания, загрузился ли прогресс
  const progressLoadedRef = useRef(false);
  
  // Первый эффект - загружаем курс и текущее видео
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
              
              // Проверяем, является ли это текстовым уроком
              setIsTextLesson(
                videoData.videoType === VIDEO_TYPES.TEXT || 
                (!videoData.videoUrl && !videoData.localVideo)
              );
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
  
  // Принудительно проверяем тип видео после получения данных
  useEffect(() => {
    if (currentVideo) {
      // Определяем, является ли урок текстовым
      const isText = 
        currentVideo.videoType === VIDEO_TYPES.TEXT || 
        currentVideo.videoType === 'text' ||
        (!currentVideo.videoUrl && !currentVideo.localVideo);
      
      setIsTextLesson(isText);
      
      // Если название содержит "Интерфейс", то это тоже текстовый урок
      if (currentVideo.title && currentVideo.title.includes("Интерфейс")) {
        setIsTextLesson(true);
      }
    }
  }, [currentVideo]);
  
  // Отдельный эффект для загрузки прогресса - запускается ОДИН раз при монтировании
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

  // Function to toggle sidebar on mobile
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  // Function to get full video URL
  const getFullVideoUrl = (video) => {
    if (!video) return null;
    
    if (video.localVideo) {
      const videoPath = video.localVideo.startsWith('/videos/') 
        ? video.localVideo 
        : `/videos/${video.localVideo}`;
      
      return `${SERVER_URL}${videoPath}`;
    }
    
    return video.videoUrl;
  };
  
  // Function to handle video download
  const handleDownload = () => {
    if (!currentVideo || !currentVideo.localVideo) return;
    
    const fullVideoUrl = getFullVideoUrl(currentVideo);
    if (!fullVideoUrl) return;
    
    const link = document.createElement('a');
    link.href = fullVideoUrl;
    
    const fileName = currentVideo.title 
      ? `${currentVideo.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4` 
      : 'video.mp4';
    
    link.setAttribute('download', fileName);
    link.setAttribute('target', '_blank');
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to toggle video completion status
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

// Только часть кода с render, заменить в существующем файле
return (
  <div>
    <Header />
    
    <button 
      className={styles.mobileMenuButton} 
      onClick={toggleSidebar}
    >
      {showSidebar ? "Скрыть содержание" : "Показать содержание"}
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
                      <h4 className={styles.videoTitle} title={video.title}>{video.title}</h4>
                      {video.duration && (
                        <span className={styles.videoDuration}>{video.duration}</span>
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
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
  
  return (
    <div className={styles.textLessonContainer}>
      <div className={styles.videoInfo}>
        <h2 className={styles.videoTitle}>{video.title}</h2>
        <div className={styles.videoCompletionControls}>
          <label className={styles.completionCheckbox}>
            <input 
              type="checkbox" 
              checked={completed}
              onChange={onToggleComplete}
            />
            {completed ? t('course.completed') : t('course.markCompleted')}
          </label>
        </div>
        <div className={styles.textLessonContent}>
          <p className={styles.videoDescription}>{video.description}</p>
        </div>
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
      
      <div className={styles.videoInfo}>
        <h2 className={styles.videoTitle}>{video.title}</h2>
        <div className={styles.videoCompletionControls}>
          <label className={styles.completionCheckbox}>
            <input 
              type="checkbox" 
              checked={completed}
              onChange={onToggleComplete}
            />
            {completed ? t('course.completed') : t('course.markCompleted')}
          </label>
        </div>
        <p className={styles.videoDescription}>{video.description}</p>
      </div>
      
      {video.localVideo && (
        <button 
          className={styles.downloadButton}
          onClick={onDownload}
        >
          {t('course.download')}
        </button>
      )}
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
              console.log("[Debug] Loaded video:", videoData);
              console.log("[Debug] Video type:", videoData.videoType);
              console.log("[Debug] TEXT type:", VIDEO_TYPES.TEXT);
              console.log("[Debug] Is text lesson:", videoData.videoType === VIDEO_TYPES.TEXT);
              
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
      console.log("[Update] Current video:", currentVideo);
      console.log("[Update] Video type:", currentVideo.videoType);
      console.log("[Update] Is text type:", currentVideo.videoType === VIDEO_TYPES.TEXT);
      console.log("[Update] Has URL:", !!currentVideo.videoUrl);
      console.log("[Update] Has local video:", !!currentVideo.localVideo);
      
      // Определяем, является ли урок текстовым
      const isText = 
        currentVideo.videoType === VIDEO_TYPES.TEXT || 
        currentVideo.videoType === 'text' ||
        (!currentVideo.videoUrl && !currentVideo.localVideo);
      
      console.log("[Update] Setting isTextLesson to:", isText);
      setIsTextLesson(isText);
      
      // Если название содержит "Интерфейс", то это тоже текстовый урок
      if (currentVideo.title && currentVideo.title.includes("Интерфейс")) {
        console.log("[Update] This is an interface lesson, forcing text mode");
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
    return <div className={styles.loading}>{t('loading')}</div>;
  }

  if (!course) {
    return <div className={styles.notFound}>Курс не найден</div>;
  }

  return (
    <div>
      <Header />
      
      <div className={styles.coursePageContainer}>
        <div className={styles.courseSidebar}>
          <Link to="/" className={styles.backToCoursesLink}>
            <span>← {t('backToCourses')}</span>
          </Link>
          
          <h2 className={styles.courseTitle}>{course.title}</h2>
          
          <div>
            {course.videos.map((video, index) => {
              const isActive = currentVideo && currentVideo.id === video.id;
              const completed = isVideoCompleted(course.id, video.id);
              
              return (
                <div 
                  key={video.id} 
                  className={styles.videoItemContainer} 
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  <Link 
                    to={`/course/${courseId}?video=${video.id}`}
                    className={`${styles.videoItem} ${isActive ? styles.videoItemActive : ''} ${
                      completed ? styles.videoCardCompleted : ''
                    }`}
                    style={{ flex: 1 }}
                  >
                    <div className={styles.videoIndex}>{index + 1}</div>
                    
                    <div className={styles.videoDetails}>
                      <div className={styles.videoTitleRow}>
                        <h4 className={styles.videoTitle}>{video.title}</h4>
                        <span className={styles.videoDuration}>{video.duration}</span>
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
            <>
              {/* Debug info */}
              {console.log("[Render] Video:", currentVideo.title)}
              {console.log("[Render] Type:", currentVideo.videoType)}
              {console.log("[Render] isTextLesson:", isTextLesson)}
              
              {/* Conditional rendering based on lesson type */}
              {isTextLesson ? (
                <TextLessonView 
                  video={currentVideo}
                  courseId={course.id}
                  completed={isVideoCompleted(course.id, currentVideo.id)}
                  onToggleComplete={() => handleVideoCompletionToggle(currentVideo.id)}
                />
              ) : (
                <VideoLessonView 
                  video={currentVideo}
                  courseId={course.id}
                  completed={isVideoCompleted(course.id, currentVideo.id)}
                  onToggleComplete={() => handleVideoCompletionToggle(currentVideo.id)}
                  onDownload={handleDownload}
                />
              )}
            </>
          ) : (
            <div className={styles.selectVideo}>{t('selectVideo')}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursePage;
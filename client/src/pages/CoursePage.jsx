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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, language]); // Удалили videoId из зависимостей
  
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, courseId]); // Удалили loadCourseProgress из зависимостей
  
  // Эффект для загрузки конкретного видео при изменении videoId
  useEffect(() => {
    let isMounted = true;
    
    const fetchVideo = async () => {
      if (courseId && videoId && course) {
        if (course.videos.find(v => v.id === videoId)) {
          const videoData = await getVideoById(courseId, videoId, language);
          if (isMounted && videoData) {
            setCurrentVideo(videoData);
          }
        }
      }
    };
    
    fetchVideo();
    
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, course]);

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
  const handleDownload = (video) => {
    if (!video || !video.localVideo) return;
    
    const fullVideoUrl = getFullVideoUrl(video);
    if (!fullVideoUrl) return;
    
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
            currentVideo.videoType === VIDEO_TYPES.TEXT ? (
              <div className={styles.textLessonContainer}>
                <div className={styles.videoInfo}>
                  <h2 className={styles.videoTitle}>{currentVideo.title}</h2>
                  
                  <div className={styles.videoCompletionControls}>
                    <label className={styles.completionCheckbox}>
                      <input 
                        type="checkbox" 
                        checked={isVideoCompleted(course.id, currentVideo.id)}
                        onChange={() => handleVideoCompletionToggle(currentVideo.id)}
                      />
                      {isVideoCompleted(course.id, currentVideo.id) ? t('course.completed') : t('course.markCompleted')}
                    </label>
                  </div>
                  
                  <div className={styles.textLessonContent}>
                    <p className={styles.videoDescription}>{currentVideo.description}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className={styles.videoWrapper}>
                  {currentVideo.localVideo ? (
                    <video
                      src={getFullVideoUrl(currentVideo)}
                      className={styles.videoIframe}
                      controls
                      autoPlay={false}
                      title={currentVideo.title}
                      onEnded={() => handleVideoCompletionToggle(currentVideo.id)}
                    ></video>
                  ) : currentVideo.videoUrl ? (
                    <iframe
                      src={currentVideo.videoUrl.replace('watch?v=', 'embed/')}
                      title={currentVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className={styles.videoIframe}
                    ></iframe>
                  ) : (
                    <div className={styles.noVideoSource}>Видео недоступно</div>
                  )}
                </div>
                
                <div className={styles.videoInfo}>
                  <h2 className={styles.videoTitle}>{currentVideo.title}</h2>
                  
                  <div className={styles.videoCompletionControls}>
                    <label className={styles.completionCheckbox}>
                      <input 
                        type="checkbox" 
                        checked={isVideoCompleted(course.id, currentVideo.id)}
                        onChange={() => handleVideoCompletionToggle(currentVideo.id)}
                      />
                      {isVideoCompleted(course.id, currentVideo.id) ? t('course.completed') : t('course.markCompleted')}
                    </label>
                  </div>
                  
                  <p className={styles.videoDescription}>{currentVideo.description}</p>
                </div>
                
                {currentVideo.localVideo && (
                  <button 
                    className={styles.downloadButton}
                    onClick={() => handleDownload(currentVideo)}
                  >
                    {t('course.download')}
                  </button>
                )}
              </div>
            )
          ) : (
            <div className={styles.selectVideo}>{t('selectVideo')}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursePage;
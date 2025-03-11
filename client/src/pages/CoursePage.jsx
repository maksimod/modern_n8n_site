import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getCourseById, getVideoById } from '../services/course.service';
import Header from '../components/Layout/Header';
import styles from '../styles/courses.module.css';

// Константа для базового URL сервера
const SERVER_URL = 'http://localhost:5000';

const CoursePage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const videoId = searchParams.get('video');
  const { language } = useLanguage();
  const { currentUser, isAuthenticated } = useAuth();
  
  const [course, setCourse] = useState(null);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const courseData = await getCourseById(courseId, language);
        
        if (courseData) {
          setCourse(courseData);

          if (!videoId || !courseData.videos.find(v => v.id === videoId)) {
            if (courseData.videos.length > 0) {
              setSearchParams({ video: courseData.videos[0].id });
            }
          } else if (videoId && courseData) {
            const videoData = await getVideoById(courseId, videoId, language);
            if (videoData) {
              setCurrentVideo(videoData);
            }
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки курса:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchCourse();
  }, [courseId, videoId, language, setSearchParams, currentUser]);

  if (loading) {
    return <div className={styles.loading}>{t('loading')}</div>;
  }

  if (!course) {
    return <div className={styles.notFound}>Курс не найден</div>;
  }

  // Формируем полный URL для видео
  const getFullVideoUrl = (video) => {
    if (!video) return null;
    
    // Если есть локальное видео, формируем полный URL к серверу
    if (video.localVideo) {
      // Убеждаемся, что путь начинается с /videos/
      const videoPath = video.localVideo.startsWith('/videos/') 
        ? video.localVideo 
        : `/videos/${video.localVideo}`;
      
      // Возвращаем полный URL сервера
      return `${SERVER_URL}${videoPath}`;
    }
    
    // Для внешних видео возвращаем URL как есть
    return video.videoUrl;
  };
  
  // Функция для скачивания видео
  const handleDownload = (video) => {
    if (!video || !video.localVideo) return;
    
    const fullVideoUrl = getFullVideoUrl(video);
    if (!fullVideoUrl) return;
    
    // Создаем временную ссылку для скачивания
    const link = document.createElement('a');
    link.href = fullVideoUrl;
    
    // Устанавливаем имя файла
    const fileName = video.title 
      ? `${video.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4` 
      : 'video.mp4';
    
    link.setAttribute('download', fileName);
    link.setAttribute('target', '_blank');
    
    // Добавляем в DOM, кликаем и удаляем
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <Header />
      
      <div className={styles.coursePageContainer}>
        <div className={styles.courseSidebar}>
          <Link to="/" className={styles.backToCoursesLink}>
            <span>← Назад к курсам</span>
          </Link>
          
          <h2 className={styles.courseTitle}>{course.title}</h2>
          
          <div>
            {course.videos.map((video, index) => {
              const isActive = currentVideo && currentVideo.id === video.id;
              
              return (
                <div key={video.id} className={styles.videoItemContainer}>
                  <Link 
                    to={`/course/${courseId}?video=${video.id}`}
                    className={`${styles.videoItem} ${isActive ? styles.videoItemActive : ''}`}
                  >
                    <div className={styles.videoIndex}>{index + 1}</div>
                    
                    <div className={styles.videoDetails}>
                      <div className={styles.videoTitleRow}>
                        <h4 className={styles.videoTitle}>{video.title}</h4>
                        <span className={styles.videoDuration}>{video.duration}</span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className={styles.videoContent}>
          {currentVideo ? (
            <div>
              <div className={styles.videoWrapper}>
                {currentVideo.localVideo ? (
                  // Для локальных видео используем HTML5 video тег с полным URL сервера
                  <video
                    src={getFullVideoUrl(currentVideo)}
                    className={styles.videoIframe}
                    controls
                    autoPlay={false}
                    title={currentVideo.title}
                  ></video>
                ) : currentVideo.videoUrl ? (
                  // Для YouTube используем iframe
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
              </div>
              <p className={styles.videoDescription}>{currentVideo.description}</p>
              
              {/* Добавляем кнопку скачивания только для локальных видео */}
              {currentVideo.localVideo && (
                <button 
                  className={styles.downloadButton}
                  onClick={() => handleDownload(currentVideo)}
                >
                  {t('course.download')}
                </button>
              )}
            </div>
          ) : (
            <div className={styles.selectVideo}>{t('selectVideo')}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursePage;
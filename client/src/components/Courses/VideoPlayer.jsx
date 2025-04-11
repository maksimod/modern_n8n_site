// client/src/components/Courses/VideoPlayer.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useProgress } from '../../contexts/ProgressContext';
import { SERVER_URL, VIDEO_TYPES, STORAGE_CONFIG } from '../../config';
import styles from '../../styles/courses.module.css';

const VideoPlayer = ({ course, video, onVideoComplete }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { updateVideoProgress, isVideoCompleted } = useProgress();
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState(null);

  // Определение типа видео
  const detectVideoType = (video) => {
    if (!video) return VIDEO_TYPES.TEXT;
    if (video.videoType) return video.videoType;
    if (video.storagePath && STORAGE_CONFIG.USE_REMOTE_STORAGE) return VIDEO_TYPES.STORAGE;
    if (video.localVideo) return VIDEO_TYPES.LOCAL;
    if (video.storagePath && !STORAGE_CONFIG.USE_REMOTE_STORAGE) return VIDEO_TYPES.LOCAL;
    if (video.videoUrl) return VIDEO_TYPES.EXTERNAL;
    return VIDEO_TYPES.TEXT;
  };

  const videoType = detectVideoType(video);

  useEffect(() => {
    if (currentUser && course?.id && video?.id) {
      setCompleted(isVideoCompleted(course.id, video.id));
    }
  }, [currentUser, course, video, isVideoCompleted]);

  // Обработчик для отметки видео как просмотренного
  const handleComplete = async () => {
    if (loading || !currentUser) return;
    
    setLoading(true);
    try {
      const newStatus = !completed;
      await updateVideoProgress(course.id, video.id, newStatus);
      setCompleted(newStatus);
      
      if (onVideoComplete) {
        onVideoComplete(video.id, newStatus);
      }
    } catch (err) {
      console.error('Error updating progress:', err);
      setError('Ошибка при обновлении прогресса');
    } finally {
      setLoading(false);
    }
  };

  // Обработчик ошибки при загрузке видео
  const handleVideoError = (e) => {
    console.error('Video loading error:', e);
    setError(`Ошибка при загрузке видео`);
    
    if (videoType === VIDEO_TYPES.STORAGE && video.storagePath) {
      loadVideoWithAlternativeMethods(video.storagePath);
    }
  };
  
  // Объединенная функция для загрузки видео альтернативными методами
  const loadVideoWithAlternativeMethods = (storagePath) => {
    if (!storagePath) return;
    
    const cleanPath = storagePath.replace(/^\/videos\//, '');
    const timestamp = new Date().getTime();
    const url = `/api/proxy/storage/${encodeURIComponent(cleanPath)}?t=${timestamp}`;
    
    setError('Загрузка видео альтернативным методом...');
    
    // Обновляем source у видео напрямую
    const videoElement = document.querySelector(`.${styles.videoElement}`);
    if (videoElement) {
      const source = videoElement.querySelector('source');
      if (source) {
        source.src = url;
        videoElement.load();
        setError(null);
      }
    }
  };
  
  // Получение URL для хранилища
  const getStorageVideoUrl = (storagePath) => {
    if (!storagePath) return '';
    const cleanPath = storagePath.replace(/^\/videos\//, '');
    const timestamp = new Date().getTime();
    return `/api/proxy/storage/${encodeURIComponent(cleanPath)}?t=${timestamp}`;
  };

  // Обработчик для скачивания видео
  const handleDownload = () => {
    try {
      let downloadUrl;
      let fileName = video.title ? `${video.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4` : 'video.mp4';
      
      if (videoType === VIDEO_TYPES.STORAGE && video.storagePath && STORAGE_CONFIG.USE_REMOTE_STORAGE) {
        downloadUrl = getStorageVideoUrl(video.storagePath);
      } else if ((videoType === VIDEO_TYPES.LOCAL && video.localVideo) || 
                (videoType === VIDEO_TYPES.STORAGE && video.storagePath && !STORAGE_CONFIG.USE_REMOTE_STORAGE)) {
        const localPath = video.localVideo || video.storagePath;
        const cleanVideoPath = localPath.replace(/^\/videos\//, '');
        downloadUrl = `/api/videos/${cleanVideoPath}`;
      } else {
        setError('Невозможно скачать внешнее видео');
        return;
      }
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading video:', err);
      setError('Ошибка при скачивании видео');
    }
  };

  // Преобразование видео URL для YouTube
  const getEmbedUrl = (url) => {
    if (!url) return '';
    
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('watch?v=')[1].split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1].split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    return url;
  };

  if (!video) {
    return <div className={styles.selectVideo}>{t('selectVideo')}</div>;
  }

  // Общий компонент для информации о видео
  const VideoInfo = () => (
    <div className={styles.videoInfo}>
      <div className={styles.videoHeader}>
        <h2 className={styles.videoTitle}>{video.title}</h2>
        {(videoType === VIDEO_TYPES.STORAGE || videoType === VIDEO_TYPES.LOCAL) && (
          <button className={styles.downloadButton} onClick={handleDownload}>
            {t('course.download')}
          </button>
        )}
      </div>
      <div className={styles.videoDescription}>{video.description}</div>
      <button 
        className={`${styles.markButton} ${completed ? styles.completed : ''}`}
        onClick={handleComplete}
      >
        {completed ? t('course.completed') : t('course.markCompleted')}
      </button>
    </div>
  );

  return (
    <div className={styles.videoPlayer}>
      {/* Текстовый урок */}
      {videoType === VIDEO_TYPES.TEXT && (
        <div className={styles.textLesson}>
          <h2 className={styles.videoTitle}>{video.title}</h2>
          <div className={styles.videoDescription}>{video.description}</div>
          <button 
            className={`${styles.markButton} ${completed ? styles.completed : ''}`}
            onClick={handleComplete}
          >
            {completed ? t('course.completed') : t('course.markCompleted')}
          </button>
        </div>
      )}

      {/* Видео из веб-хранилища */}
      {videoType === VIDEO_TYPES.STORAGE && video.storagePath && STORAGE_CONFIG.USE_REMOTE_STORAGE && (
        <>
          <div className={styles.videoContainer}>
            <video 
              controls
              className={styles.videoElement}
              playsInline
              onError={handleVideoError}
              onCanPlay={() => setError(null)}
            >
              <source src={getStorageVideoUrl(video.storagePath)} type="video/mp4" />
              {t('course.browserNotSupportVideo')}
            </video>
          </div>
          
          {error && (
            <div className={styles.errorMessage}>
              {error}
              <button 
                className={styles.retryButton}
                onClick={() => loadVideoWithAlternativeMethods(video.storagePath)}
              >
                {t('course.retryLoading')}
              </button>
            </div>
          )}
          
          <VideoInfo />
        </>
      )}

      {/* Локальное видео */}
      {(videoType === VIDEO_TYPES.LOCAL && video.localVideo) || 
       (videoType === VIDEO_TYPES.STORAGE && video.storagePath && !STORAGE_CONFIG.USE_REMOTE_STORAGE) ? (
        <>
          <div className={styles.videoContainer}>
            <video 
              src={`${SERVER_URL}/videos/${(video.localVideo || video.storagePath).replace(/^\/videos\//, '')}`}
              controls
              className={styles.videoElement}
              playsInline
            ></video>
          </div>
          <VideoInfo />
        </>
      ) : null}

      {/* Внешнее видео (YouTube) */}
      {videoType === VIDEO_TYPES.EXTERNAL && video.videoUrl && (
        <>
          <div className={styles.videoContainer}>
            <iframe 
              src={getEmbedUrl(video.videoUrl)}
              title={video.title}
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              className={styles.videoElement}
            ></iframe>
          </div>
          <VideoInfo />
        </>
      )}
    </div>
  );
};

export default VideoPlayer;
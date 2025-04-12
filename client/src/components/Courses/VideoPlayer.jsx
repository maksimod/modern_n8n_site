// client/src/components/Courses/VideoPlayer.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useProgress } from '../../contexts/ProgressContext';
import { SERVER_URL, VIDEO_TYPES, STORAGE_CONFIG } from '../../config';
import styles from '../../styles/courses.module.css';

const VideoPlayer = ({ course, video, onVideoComplete, onVideoDelete }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { updateVideoProgress, isVideoCompleted } = useProgress();
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [fallbackToText, setFallbackToText] = useState(false);

  // Определение типа видео
  const detectVideoType = useCallback((videoData) => {
    if (!videoData) return VIDEO_TYPES.TEXT;
    if (fallbackToText) return VIDEO_TYPES.TEXT;
    if (videoData.videoType) return videoData.videoType;
    if (videoData.storagePath && STORAGE_CONFIG.USE_REMOTE_STORAGE) return VIDEO_TYPES.STORAGE;
    if (videoData.localVideo) return VIDEO_TYPES.LOCAL;
    if (videoData.storagePath && !STORAGE_CONFIG.USE_REMOTE_STORAGE) return VIDEO_TYPES.LOCAL;
    if (videoData.videoUrl) return VIDEO_TYPES.EXTERNAL;
    return VIDEO_TYPES.TEXT;
  }, [fallbackToText]);

  const videoType = detectVideoType(video);

  useEffect(() => {
    if (currentUser && course?.id && video?.id) {
      setCompleted(isVideoCompleted(course.id, video.id));
    }
    // Сбрасываем состояние при смене видео
    setError(null);
    setRetryCount(0);
    setFallbackToText(false);
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
  const handleVideoError = useCallback((e) => {
    console.error('Video loading error:', e);
    
    // Если уже пробовали несколько раз и не получилось, показываем текстовый режим
    if (retryCount >= 2) {
      setError('Не удалось загрузить видео после нескольких попыток.');
      setFallbackToText(true);
      return;
    }
    
    setError(`Ошибка при загрузке видео. Попытка ${retryCount + 1} из 3.`);
    setRetryCount(prev => prev + 1);
    
    if (videoType === VIDEO_TYPES.STORAGE && video.storagePath) {
      loadVideoWithAlternativeMethods(video.storagePath);
    }
  }, [retryCount, videoType, video]);
  
  // Объединенная функция для загрузки видео альтернативными методами
  const loadVideoWithAlternativeMethods = useCallback((storagePath) => {
    if (!storagePath) return;
    
    const cleanPath = storagePath.replace(/^\/videos\//, '');
    const timestamp = new Date().getTime();
    
    // Используем разные URL для разных попыток, чтобы избежать кэширования ошибок
    let url;
    if (retryCount === 0) {
      url = `/api/proxy/storage/${encodeURIComponent(cleanPath)}?t=${timestamp}`;
    } else if (retryCount === 1) {
      url = `/api/videos/${encodeURIComponent(cleanPath)}?t=${timestamp}`;
    } else {
      url = `/download/${encodeURIComponent(cleanPath)}?t=${timestamp}`;
    }
    
    setError(`Загрузка видео альтернативным методом... (${retryCount + 1}/3)`);
    
    // Обновляем source у видео напрямую
    const videoElement = document.querySelector(`.${styles.videoElement}`);
    if (videoElement) {
      const source = videoElement.querySelector('source');
      if (source) {
        source.src = url;
        videoElement.load();
      }
    }
  }, [retryCount]);
  
  // Получение URL для хранилища
  const getStorageVideoUrl = useCallback((storagePath) => {
    if (!storagePath) return '';
    const cleanPath = storagePath.replace(/^\/videos\//, '');
    const timestamp = new Date().getTime();
    return `/api/proxy/storage/${encodeURIComponent(cleanPath)}?t=${timestamp}`;
  }, []);

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

  // Функция для удаления видео
  const handleDelete = () => {
    if (onVideoDelete && video && course) {
      onVideoDelete(course.id, video.id);
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
        <div className={styles.videoActions}>
          {(videoType === VIDEO_TYPES.STORAGE || videoType === VIDEO_TYPES.LOCAL) && (
            <button className={styles.downloadButton} onClick={handleDownload}>
              {t('course.download')}
            </button>
          )}
        </div>
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

  // Если мы в режиме текстового урока (по умолчанию или после ошибок)
  if (videoType === VIDEO_TYPES.TEXT || fallbackToText) {
    return (
      <div className={styles.videoPlayer}>
        <div className={styles.textLesson}>
          <h2 className={styles.videoTitle}>{video.title}</h2>
          <div className={styles.videoDescription}>
            {error && <div className={styles.errorBlock}>{error}</div>}
            {video.description}
          </div>
          <div className={styles.videoActions}>
            <button 
              className={`${styles.markButton} ${completed ? styles.completed : ''}`}
              onClick={handleComplete}
            >
              {completed ? t('course.completed') : t('course.markCompleted')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.videoPlayer}>
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
                onClick={() => {
                  setRetryCount(prev => prev + 1);
                  loadVideoWithAlternativeMethods(video.storagePath);
                }}
              >
                {t('course.retryLoading')}
              </button>
              <button 
                className={styles.fallbackButton}
                onClick={() => setFallbackToText(true)}
              >
                Открыть как текст
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
              onError={handleVideoError}
            ></video>
          </div>
          {error && (
            <div className={styles.errorMessage}>
              {error}
              <button 
                className={styles.fallbackButton}
                onClick={() => setFallbackToText(true)}
              >
                Открыть как текст
              </button>
            </div>
          )}
          <VideoInfo />
        </>
      ) : null}

      {/* Внешнее видео (YouTube) */}
      {videoType === VIDEO_TYPES.EXTERNAL && video.videoUrl && (
        <>
          <div className={styles.videoContainer}>
            {/* Проверка для YouTube видео */}
            {video.videoUrl.includes('youtube.com') || video.videoUrl.includes('youtu.be') ? (
              <div className={styles.youtubeWarning}>
                <p>⚠️ Внимание! Для просмотра видео с YouTube может потребоваться VPN.</p>
              </div>
            ) : null}
            
            {/* Проверка, что мы не находимся во вложенном iframe */}
            {window.self === window.top ? (
              <iframe 
                src={getEmbedUrl(video.videoUrl)}
                title={video.title}
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
                className={styles.videoElement}
              ></iframe>
            ) : (
              <div className={styles.youtubeError}>
                <p>Для просмотра YouTube видео, пожалуйста, перейдите на главную страницу и запустите видео заново.</p>
              </div>
            )}
          </div>
          <VideoInfo />
        </>
      )}
    </div>
  );
};

export default VideoPlayer;
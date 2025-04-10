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
    console.log('Detecting video type for:', video);
    
    // Если явно указан тип видео, используем его
    if (video?.videoType) {
      console.log('Using explicit video type:', video.videoType);
      return video.videoType;
    }
    
    // Проверяем по приоритету различные поля
    if (video?.storagePath && STORAGE_CONFIG.USE_REMOTE_STORAGE) {
      console.log('Detected as STORAGE video based on storagePath:', video.storagePath);
      return VIDEO_TYPES.STORAGE;
    }
    
    if (video?.localVideo) {
      console.log('Detected as LOCAL video based on localVideo:', video.localVideo);
      return VIDEO_TYPES.LOCAL;
    }
    
    if (video?.storagePath && !STORAGE_CONFIG.USE_REMOTE_STORAGE) {
      console.log('Detected as LOCAL video based on storagePath (fallback):', video.storagePath);
      return VIDEO_TYPES.LOCAL;
    }
    
    if (video?.videoUrl) {
      console.log('Detected as EXTERNAL video based on videoUrl:', video.videoUrl);
      return VIDEO_TYPES.EXTERNAL;
    }
    
    console.log('No video source found, defaulting to TEXT type');
    return VIDEO_TYPES.TEXT;
  };

  // Используем нашу функцию для определения типа видео
  const videoType = detectVideoType(video);

  // Добавляем отладку для проверки типа видео и конфигурации
  console.log('--- VideoPlayer Debug ---');
  console.log('Video object:', video);
  console.log('Determined videoType:', videoType);
  console.log('STORAGE_CONFIG:', STORAGE_CONFIG);
  console.log('------------------------');

  useEffect(() => {
    if (currentUser && course?.id && video?.id) {
      const completed = isVideoCompleted(course.id, video.id);
      setCompleted(completed);
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

  // Формирование URL для загрузки видео из веб-хранилища
  const getStorageVideoUrl = (storagePath) => {
    try {
      if (!storagePath) {
        console.error('Storage path is empty!');
        return '';
      }
      
      // Очищаем путь от возможных префиксов
      const cleanPath = storagePath.replace(/^\/videos\//, '');
      
      const url = `${STORAGE_CONFIG.API_URL}/download?filePath=${encodeURIComponent(cleanPath)}`;
      console.log('Storage URL generated:', url);
      return url;
    } catch (error) {
      console.error('Error generating storage URL:', error);
      setError('Ошибка при формировании URL для видео');
      return '';
    }
  };

  // Обработчик для скачивания видео
  const handleDownload = () => {
    try {
      let downloadUrl;
      let fileName;
      
      if (videoType === VIDEO_TYPES.STORAGE && video.storagePath && STORAGE_CONFIG.USE_REMOTE_STORAGE) {
        // Скачивание из веб-хранилища
        downloadUrl = getStorageVideoUrl(video.storagePath);
        fileName = video.title 
          ? `${video.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4` 
          : 'video.mp4';
      } else if ((videoType === VIDEO_TYPES.LOCAL && video.localVideo) || 
                (videoType === VIDEO_TYPES.STORAGE && video.storagePath && !STORAGE_CONFIG.USE_REMOTE_STORAGE)) {
        // Скачивание с локального сервера
        const localPath = video.localVideo || video.storagePath;
        const cleanVideoPath = localPath.replace(/^\/videos\//, '');
        downloadUrl = `${SERVER_URL}/videos/${cleanVideoPath}`;
        fileName = video.title 
          ? `${video.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4` 
          : 'video.mp4';
      } else {
        setError('Невозможно скачать внешнее видео');
        return;
      }
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Добавляем заголовок авторизации для веб-хранилища
      if (videoType === VIDEO_TYPES.STORAGE) {
        // Для загрузки через XHR с заголовками авторизации
        const xhr = new XMLHttpRequest();
        xhr.open('GET', downloadUrl, true);
        xhr.setRequestHeader('X-API-Key', STORAGE_CONFIG.API_KEY);
        xhr.responseType = 'blob';
        
        xhr.onload = function() {
          if (this.status === 200) {
            const blob = new Blob([this.response], { type: 'video/mp4' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
          } else {
            setError('Ошибка при скачивании файла');
          }
        };
        
        xhr.send();
        return;
      }
      
      // Для обычных файлов
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading video:', err);
      setError('Ошибка при скачивании видео');
    }
  };

  // Преобразование видео URL в простейшем виде
  const getEmbedUrl = (url) => {
    if (!url) return '';
    
    // Убираем часть watch?v= и заменяем на embed/
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('watch?v=')[1].split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // Для youtu.be URL
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1].split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    return url;
  };

  if (!video) {
    return <div className={styles.selectVideo}>{t('selectVideo')}</div>;
  }

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
            <div className={styles.debugInfo} style={{position: 'absolute', top: 0, right: 0, fontSize: '10px', background: 'rgba(0,0,0,0.5)', color: 'white', padding: '5px', zIndex: 100}}>
              Type: {videoType}, StoragePath: {video.storagePath}
            </div>
            <video 
              controls
              className={styles.videoElement}
              playsInline
              onError={(e) => {
                console.error('Video loading error:', e);
                console.error('Video source URL:', getStorageVideoUrl(video.storagePath));
                console.error('Video object:', video);
                setError(`Ошибка при загрузке видео. URL: ${getStorageVideoUrl(video.storagePath)}`);
              }}
              onCanPlay={() => console.log('Video can be played now')}
              onLoadedData={() => console.log('Video data loaded successfully')}
            >
              <source src={getStorageVideoUrl(video.storagePath)} type="video/mp4" />
              {t('course.browserNotSupportVideo')}
            </video>
          </div>
          <div className={styles.videoInfo}>
            <div className={styles.videoHeader}>
              <h2 className={styles.videoTitle}>{video.title}</h2>
              <button 
                className={styles.downloadButton}
                onClick={handleDownload}
              >
                {t('course.download')}
              </button>
            </div>
            <div className={styles.videoDescription}>{video.description}</div>
            <button 
              className={`${styles.markButton} ${completed ? styles.completed : ''}`}
              onClick={handleComplete}
            >
              {completed ? t('course.completed') : t('course.markCompleted')}
            </button>
          </div>
        </>
      )}

      {/* Локальное видео (или видео со Storage API, которое теперь обрабатывается локально) */}
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
          <div className={styles.videoInfo}>
            <div className={styles.videoHeader}>
              <h2 className={styles.videoTitle}>{video.title}</h2>
              <button 
                className={styles.downloadButton}
                onClick={handleDownload}
              >
                {t('course.download')}
              </button>
            </div>
            <div className={styles.videoDescription}>{video.description}</div>
            <button 
              className={`${styles.markButton} ${completed ? styles.completed : ''}`}
              onClick={handleComplete}
            >
              {completed ? t('course.completed') : t('course.markCompleted')}
            </button>
          </div>
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
          <div className={styles.videoInfo}>
            <h2 className={styles.videoTitle}>{video.title}</h2>
            <div className={styles.videoDescription}>{video.description}</div>
            <button 
              className={`${styles.markButton} ${completed ? styles.completed : ''}`}
              onClick={handleComplete}
            >
              {completed ? t('course.completed') : t('course.markCompleted')}
            </button>
          </div>
        </>
      )}

      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
};

export default VideoPlayer;
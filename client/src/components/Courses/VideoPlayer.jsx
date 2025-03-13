// client/src/components/Courses/VideoPlayer.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useProgress } from '../../contexts/ProgressContext';
import { SERVER_URL, VIDEO_TYPES } from '../../config';
import styles from '../../styles/courses.module.css';

const VideoPlayer = ({ course, video, onVideoComplete }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { updateVideoProgress, isVideoCompleted } = useProgress();
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState(null);

  // Определение типа видео
  const videoType = video?.videoType || 
    (video?.localVideo ? VIDEO_TYPES.LOCAL : 
     (video?.videoUrl ? VIDEO_TYPES.EXTERNAL : VIDEO_TYPES.TEXT));

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

  // Обработчик для скачивания видео
  const handleDownload = () => {
    if (!video || !video.localVideo) return;
    
    try {
      // Очищаем URL от префикса /videos/ если он есть
      const cleanVideoPath = video.localVideo.replace(/^\/videos\//, '');
      const fullVideoUrl = `${SERVER_URL}/videos/${cleanVideoPath}`;
      
      const link = document.createElement('a');
      link.href = fullVideoUrl;
      
      // Формируем имя файла из заголовка видео
      const fileName = video.title 
        ? `${video.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4` 
        : 'video.mp4';
      
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading video:', err);
      setError('Ошибка при скачивании видео');
    }
  };

  // Функция для преобразования любого формата URL YouTube в embed-формат
  const formatYoutubeUrl = (url) => {
    if (!url) return '';
    
    // Проверяем если URL уже в формате embed
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
    
    // Получаем идентификатор видео
    let videoId = '';
    
    // Обработка youtube.com/watch?v=ID
    const watchRegex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(watchRegex);
    
    if (match && match[1]) {
      videoId = match[1];
    }
    
    // Если нашли ID, формируем embed-ссылку
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    return url; // Возвращаем исходный URL если не удалось получить ID
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

      {/* Локальное видео */}
      {videoType === VIDEO_TYPES.LOCAL && (
        <>
          <div className={styles.videoContainer}>
            <video 
              src={`${SERVER_URL}/videos/${video.localVideo.replace(/^\/videos\//, '')}`}
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
      )}

      {/* Внешнее видео (YouTube) */}
      {videoType === VIDEO_TYPES.EXTERNAL && (
        <>
          <div className={styles.videoContainer}>
            <iframe 
              src={formatYoutubeUrl(video.videoUrl)}
              title={video.title}
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
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
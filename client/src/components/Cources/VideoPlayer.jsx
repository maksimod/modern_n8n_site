import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { markVideoAsCompleted, isVideoCompleted } from '../../services/course.service';
import { useNavigate } from 'react-router-dom';
import { SERVER_URL } from '../../config';
import styles from '../../styles/courses.module.css';

const VideoPlayer = ({ course, video, onVideoComplete }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Определяем тип видео и URL
  const isLocalVideo = !!video?.localVideo;
  
  // Важно: используем явный URL с сервера для локальных видео
  const fullVideoUrl = isLocalVideo 
    ? `${SERVER_URL}${video.localVideo}`
    : (video?.videoUrl || '');
  
  // Вывод адреса для отладки
  useEffect(() => {
    console.log('Вид видео:', isLocalVideo ? 'Локальное' : 'Внешнее');
    console.log('URL видео:', fullVideoUrl);
    console.log('Оригинальный путь:', video?.localVideo);
    console.log('Все свойства видео:', video);
    // Пробуем открыть видео напрямую
    if (isLocalVideo) {
      const img = new Image();
      img.onload = () => console.log('URL доступен!');
      img.onerror = () => console.error('URL недоступен!');
      img.src = fullVideoUrl;
    }
  }, [video, isLocalVideo, fullVideoUrl]);

  // Проверяем состояние просмотра при изменении видео
  useEffect(() => {
    if (currentUser && course?.id && video?.id) {
      const isCompleted = isVideoCompleted(currentUser, course.id, video.id);
      setCompleted(isCompleted);
    }
  }, [currentUser, course, video]);

  const handleComplete = async (value) => {
    if (loading || completed === value) return;
    
    if (!currentUser) {
      alert('Необходимо авторизоваться для отметки просмотра');
      navigate('/auth');
      return;
    }
    
    setLoading(true);
    try {
      if (currentUser && course?.id && video?.id) {
        await markVideoAsCompleted(currentUser.id, course.id, video.id, value);
        setCompleted(value);
        if (onVideoComplete) {
          onVideoComplete(video.id, value);
        }
      }
    } catch (error) {
      console.error('Error marking video as completed:', error);
      
      if (error.response && error.response.status === 401) {
        alert('Сессия истекла. Пожалуйста, войдите снова.');
        navigate('/auth');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    handleComplete(true);
  };
  
  // Функция для скачивания видео
  const handleDownload = () => {
    if (!isLocalVideo || !fullVideoUrl) return;
    
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

  if (!video) {
    return <div className={styles.videoContainer}>Video not found</div>;
  }

  return (
    <div className={styles.videoSection}>
      <div className={styles.videoContainer}>
        {isLocalVideo ? (
          // Используем HTML5 video для локальных файлов
          <>
            <video
              ref={videoRef}
              className={styles.videoPlayer}
              controls
              src={fullVideoUrl}
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={handleEnded}
              onTimeUpdate={(e) => {
                const played = e.target.currentTime / e.target.duration;
              }}
              onError={(e) => console.error("Ошибка видео:", e)}
              crossOrigin="anonymous"
            />
          </>
        ) : (
          // Используем ReactPlayer для YouTube и других внешних ресурсов
          <ReactPlayer
            url={fullVideoUrl}
            className={styles.videoPlayer}
            width="100%"
            height="100%"
            controls
            playing={isPlaying}
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={handleEnded}
            config={{
              youtube: {
                playerVars: {
                  autoplay: 0,
                  modestbranding: 1,
                  rel: 0
                }
              }
            }}
          />
        )}
      </div>
      
      <div className={styles.videoDetails}>
        <div className={styles.videoInfo}>
          <h2 className={styles.videoTitle}>{video.title}</h2>
          <p className={styles.videoDescription}>{video.description}</p>
          <div className={styles.videoDuration}>
            <span>Длительность: {video.duration}</span>
            {video.isPrivate && (
              <span className={`${styles.videoCardBadge} ${styles.privateVideo}`}>
                {t('Private')}
              </span>
            )}
            
            {/* Добавляем кнопку скачивания только для локальных видео */}
            {isLocalVideo && (
              <button 
                className={styles.downloadButton}
                onClick={handleDownload}
                title={t('course.download')}
              >
                {t('course.download')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
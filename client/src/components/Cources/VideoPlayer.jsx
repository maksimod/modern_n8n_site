import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useProgress } from '../../contexts/ProgressContext';
import { markVideoAsCompleted, isVideoCompleted } from '../../services/course.service';
import { useNavigate } from 'react-router-dom';
import { SERVER_URL } from '../../config';
import styles from '../../styles/courses.module.css';

const VideoPlayer = ({ course, video, onVideoComplete }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { updateVideoProgress, isVideoCompleted } = useProgress();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Определяем тип видео и URL
  const isLocalVideo = !!video?.localVideo;
  const isTextLesson = video?.videoType === 'text';
  
  // Важно: используем явный URL с сервера для локальных видео
  const fullVideoUrl = isLocalVideo 
    ? `${SERVER_URL}${video.localVideo}`
    : (video?.videoUrl || '');
  
  // Проверяем состояние просмотра при изменении видео
  useEffect(() => {
    if (currentUser && course?.id && video?.id) {
      const completed = isVideoCompleted(course.id, video.id);
      setCompleted(completed);
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
        await updateVideoProgress(course.id, video.id, value);
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

  // Функция для скачивания видео
  const handleDownload = () => {
    if (!isLocalVideo || !fullVideoUrl) return;
    
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

  if (!video) {
    return <div className={styles.videoContainer}>Video not found</div>;
  }

  // Для текстовых уроков
  if (isTextLesson) {
    return (
      <div className={styles.textLessonContainer}>
        <div className={styles.videoInfo}>
          <h2 className={styles.videoTitle}>{video.title}</h2>
          <p className={styles.videoDescription}>{video.description}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.videoSection}>
      <div className={styles.videoContainer}>
        {isLocalVideo ? (
          <video
            ref={videoRef}
            className={styles.videoPlayer}
            controls
            src={fullVideoUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              handleComplete(true);
            }}
            crossOrigin="anonymous"
          />
        ) : (
          <ReactPlayer
            url={fullVideoUrl}
            className={styles.videoPlayer}
            width="100%"
            height="100%"
            controls
            playing={isPlaying}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              handleComplete(true);
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
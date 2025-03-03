import React, { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { markVideoAsCompleted, isVideoCompleted } from '../../services/course.service';
import styles from '../../styles/courses.module.css';

const VideoPlayer = ({ course, video, onVideoComplete }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Проверяем состояние просмотра при изменении видео
  useEffect(() => {
    if (currentUser && course?.id && video?.id) {
      const isCompleted = isVideoCompleted(currentUser, course.id, video.id);
      setCompleted(isCompleted);
    }
  }, [currentUser, course, video]);

  const handleProgress = (state) => {
    setProgress(state.played);
    
    // Auto-mark as completed when user watches 90% of the video
    if (state.played >= 0.9 && !completed) {
      handleComplete(true);
    }
  };

  const handleComplete = async (value) => {
    if (loading || completed === value) return;
    
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

  if (!video) {
    return <div className={styles.videoContainer}>Video not found</div>;
  }

  return (
    <div className={styles.videoSection}>
      <div className={styles.videoContainer}>
        <ReactPlayer
          url={video.videoUrl}
          className={styles.videoPlayer}
          width="100%"
          height="100%"
          controls
          playing={isPlaying}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onProgress={handleProgress}
          progressInterval={1000}
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
          </div>
        </div>
      </div>
      
      <div className={styles.videoActions}>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={completed}
            onChange={(e) => handleComplete(e.target.checked)}
            disabled={loading}
          />
          <span>{t('course.markCompleted')}</span>
        </label>
      </div>
    </div>
  );
};

export default VideoPlayer;
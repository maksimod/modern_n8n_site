import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { getCourseProgress, calculateCourseCompletion, markVideoAsCompleted, isVideoCompleted } from '../../services/course.service';
import styles from '../../styles/courses.module.css';

const CourseItem = ({ course, currentVideo }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [progress, setProgress] = useState({});

  useEffect(() => {
    if (currentUser && course) {
      const userProgress = getCourseProgress(currentUser, course.id);
      setProgress(userProgress || {});
    }
  }, [currentUser, course]);

  if (!course) return null;

  const completionPercentage = calculateCourseCompletion(currentUser, course);

  const handleCheckboxChange = async (videoId, isChecked, e) => {
    e.stopPropagation(); // Предотвращаем срабатывание клика на ссылке
    e.preventDefault(); // Предотвращаем переход по ссылке
    
    if (currentUser && course?.id) {
      try {
        await markVideoAsCompleted(currentUser.id, course.id, videoId, isChecked);
        // Обновляем состояние прогресса
        setProgress(prev => ({
          ...prev,
          [videoId]: isChecked
        }));
      } catch (error) {
        console.error('Error updating video status:', error);
      }
    }
  };

  return (
    <div className={styles.videosList}>
      <h3 className={styles.sidebarTitle}>{course.title}</h3>
      
      {completionPercentage > 0 && (
        <div className={styles.progressContainer}>
          <div 
            className={styles.progressBar}
            style={{ width: `${completionPercentage}%` }}
          ></div>
          <span className={styles.progressText}>
            {completionPercentage}% {t('course.completed')}
          </span>
        </div>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        {course.videos.map((video, index) => {
          const isCompleted = progress[video.id];
          const isActive = currentVideo && currentVideo.id === video.id;

          return (
            <div key={video.id} className={styles.videoCardContainer} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <Link
                to={`/course/${course.id}?video=${video.id}`}
                className={`${styles.videoCard} ${isActive ? styles.videoCardActive : ''} ${
                  isCompleted ? styles.videoCardCompleted : ''
                }`}
                style={{ flex: 1 }}
              >
                <div className={styles.videoNumber}>
                  {index + 1}
                </div>
                <div className={styles.videoCardInfo}>
                  <div className={styles.videoCardHeader}>
                    <h4 className={styles.videoCardTitle}>{video.title}</h4>
                    <span className={styles.videoDuration}>{video.duration}</span>
                  </div>
                </div>
              </Link>
              <input
                type="checkbox"
                checked={!!isCompleted}
                onChange={(e) => handleCheckboxChange(video.id, e.target.checked, e)}
                className={styles.videoCheckbox}
                style={{ marginLeft: '10px', transform: 'scale(1.2)' }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CourseItem;
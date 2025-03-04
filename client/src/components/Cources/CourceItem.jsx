import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../../styles/courses.module.css';

const CourseItem = ({ course, currentVideo }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  
  if (!course) return null;
  
  return (
    <div className={styles.videosList}>
      <h3 className={styles.sidebarTitle}>{course.title}</h3>
      
      <div style={{ marginTop: '1.5rem' }}>
        {course.videos.map((video) => {
          const isActive = currentVideo && currentVideo.id === video.id;
          
          return (
            <Link
              key={video.id}
              to={`/course/${course.id}?video=${video.id}`}
              className={`${styles.videoCard} ${isActive ? styles.videoCardActive : ''} ${
                isCompleted ? styles.videoCardCompleted : ''
              }`}
            >
              <div className={styles.videoCardInfo}>
                <h4 className={styles.videoCardTitle}>{video.title}</h4>
                <p className={styles.videoCardDescription}>{video.description}</p>
                <div className={styles.videoCardMeta}>
                  <span>{video.duration}</span>
                  {video.isPrivate && (
                    <span className={`${styles.videoCardBadge} ${styles.privateVideo}`}>
                      {t('Private')}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default CourseItem;
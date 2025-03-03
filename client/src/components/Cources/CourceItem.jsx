import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { getCourseProgress, calculateCourseCompletion } from '../../services/course.service';
import styles from '../../styles/courses.module.css';

const CourseItem = ({ course, currentVideo }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  
  if (!course) return null;
  
  const progress = getCourseProgress(currentUser, course.id);
  const completionPercentage = calculateCourseCompletion(currentUser, course);
  
  // Find the first uncompleted video
  const findNextVideo = () => {
    if (!progress) return course.videos[0];
    
    for (const video of course.videos) {
      if (!progress[video.id]) {
        return video;
      }
    }
    
    return course.videos[0]; // If all completed, return the first video
  };
  
  const nextVideo = findNextVideo();
  
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
        {course.videos.map((video) => {
          const isCompleted = progress && progress[video.id];
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
                  {isCompleted && (
                    <span className={styles.videoCardStatus}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5"></path>
                      </svg>
                      {t('course.completed')}
                    </span>
                  )}
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
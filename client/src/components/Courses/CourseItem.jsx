import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useProgress } from '../../contexts/ProgressContext';
import styles from '../../styles/courses.module.css';

const CourseItem = ({ course, currentVideo }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { updateVideoProgress, isVideoCompleted } = useProgress();

  if (!course) return null;

  return (
    <div className={styles.videosList}>
      <h3 className={styles.sidebarTitle}>{course.title}</h3>
      
      <div className={styles.videoItemsContainer}>
        {course.videos.map((video, index) => {
          const isActive = currentVideo && currentVideo.id === video.id;
          const completed = isVideoCompleted(course.id, video.id);
          
          return (
            <div key={video.id} className={styles.videoItemContainer}>
              <Link 
                to={`/course/${course.id}?video=${video.id}`}
                className={`${styles.videoItem} ${isActive ? styles.videoItemActive : ''} ${
                  completed ? styles.videoCardCompleted : ''
                }`}
              >
                <div className={styles.videoIndex}>{index + 1}</div>
                
                <div className={styles.videoDetails}>
                  <div className={styles.videoTitleRow}>
                    <h4 className={styles.videoTitle} title={video.title}>
                      {video.title}
                    </h4>
                    {video.duration && (
                      <span className={styles.videoDuration}>{video.duration}</span>
                    )}
                  </div>
                </div>
              </Link>

              <div className={styles.videoCheckboxContainer}>
                <input 
                  type="checkbox" 
                  className={styles.videoCheckbox}
                  checked={completed}
                  onChange={() => {
                    if (currentUser) {
                      updateVideoProgress(course.id, video.id, !completed);
                    }
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CourseItem; 
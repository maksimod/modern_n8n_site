import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useProgress } from '../../contexts/ProgressContext';
import styles from '../../styles/courses.module.css';

const CourseItem = ({ course, currentVideo }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { updateVideoProgress, isVideoCompleted, loadCourseProgress } = useProgress();
  const [courseProgress, setCourseProgress] = useState({});

  // Load course progress when component mounts
  useEffect(() => {
    const fetchCourseProgress = async () => {
      if (course && currentUser) {
        const progress = await loadCourseProgress(course.id);
        if (progress) {
          setCourseProgress(progress);
        }
      }
    };

    fetchCourseProgress();
  }, [course, currentUser]);

  // Handler for checkbox toggle
  const handleVideoCompletionToggle = async (videoId) => {
    if (!currentUser || !course) return;

    const currentCompletionStatus = isVideoCompleted(course.id, videoId);
    const newCompletionStatus = !currentCompletionStatus;

    await updateVideoProgress(course.id, videoId, newCompletionStatus);
  };

  if (!course) return null;

  return (
    <div className={styles.videosList}>
      <h3 className={styles.sidebarTitle}>{course.title}</h3>
      
      <div style={{ marginTop: '1.5rem' }}>
        {course.videos.map((video, index) => {
          const isActive = currentVideo && currentVideo.id === video.id;
          const isCompleted = isVideoCompleted(course.id, video.id);

          // Skip video if it's a text lesson
          if (video.videoType === 'text') return null;

          return (
            <div 
              key={video.id} 
              className={styles.videoItemContainer}
            >
              <Link
                to={`/course/${course.id}?video=${video.id}`}
                className={`${styles.videoItem} ${isActive ? styles.videoItemActive : ''} ${
                  isCompleted ? styles.videoCardCompleted : ''
                }`}
              >
                <div className={styles.videoIndex}>{index + 1}</div>
                
                <div className={styles.videoDetails}>
                  <div className={styles.videoTitleRow}>
                    <h4 className={styles.videoTitle}>{video.title}</h4>
                    <span className={styles.videoDuration}>{video.duration}</span>
                  </div>
                  <p className={styles.videoDescription}>{video.description}</p>
                </div>
              </Link>

              {/* Checkbox for video completion */}
              <div className={styles.videoCheckboxContainer}>
                <input 
                  type="checkbox" 
                  className={styles.videoCheckbox}
                  checked={isCompleted}
                  onChange={() => handleVideoCompletionToggle(video.id)}
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
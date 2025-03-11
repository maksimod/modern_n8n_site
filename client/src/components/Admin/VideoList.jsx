// client/src/components/Admin/VideoList.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../../styles/courses.module.css';
import { VIDEO_TYPES } from '../../config';

const VideoList = ({ videos, onEdit, onDelete, onReorder }) => {
  const { t } = useTranslation();
  
  if (!videos || videos.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
        {t('No videos yet. Add some videos to this course.')}
      </div>
    );
  }
  
  // Helper function to determine video type
  const getVideoType = (video) => {
    if (video.localVideo) return VIDEO_TYPES.LOCAL;
    if (video.videoUrl) return VIDEO_TYPES.EXTERNAL;
    return VIDEO_TYPES.TEXT;
  };
  
  // Helper function to get video type label
  const getVideoTypeLabel = (video) => {
    const type = getVideoType(video);
    
    switch (type) {
      case VIDEO_TYPES.LOCAL:
        return (
          <span className={styles.videoCardBadge} style={{ backgroundColor: '#0ea5e9' }}>
            {t('admin.localFile')}
          </span>
        );
      case VIDEO_TYPES.EXTERNAL:
        return (
          <span className={styles.videoCardBadge} style={{ backgroundColor: '#8b5cf6' }}>
            {t('admin.externalUrl')}
          </span>
        );
      case VIDEO_TYPES.TEXT:
        return (
          <span className={styles.textLessonIndicator}>
            {t('admin.textLesson')}
          </span>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className={styles.adminVideoList}>
      {videos.map((video, index) => (
        <div key={video.id} className={styles.adminVideoItem}>
          <div className={styles.adminVideoInfo}>
            <h4>{video.title}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              {getVideoTypeLabel(video)}
              {video.duration && <span>{video.duration}</span>}
              {video.isPrivate && (
                <span className={`${styles.videoCardBadge} ${styles.privateVideo}`}>
                  {t('Private')}
                </span>
              )}
            </div>
          </div>
          
          <div className={styles.adminVideoActions}>
            <button
              className={styles.adminButtonSecondary}
              onClick={() => onReorder(video.id, 'up')}
              disabled={index === 0}
              title={t('admin.moveUp')}
              style={{ opacity: index === 0 ? 0.5 : 1 }}
            >
              ↑
            </button>
            
            <button
              className={styles.adminButtonSecondary}
              onClick={() => onReorder(video.id, 'down')}
              disabled={index === videos.length - 1}
              title={t('admin.moveDown')}
              style={{ opacity: index === videos.length - 1 ? 0.5 : 1 }}
            >
              ↓
            </button>
            
            <button
              className={styles.adminButton}
              onClick={() => onEdit(video)}
              title={t('admin.editVideo')}
            >
              {t('admin.editVideo')}
            </button>
            
            <button
              className={styles.adminButtonDanger}
              onClick={() => onDelete(video.id)}
              title={t('admin.deleteVideo')}
            >
              {t('admin.deleteVideo')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VideoList;
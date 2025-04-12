// client/src/components/Admin/VideoList.jsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';
import { deleteVideo, deleteVideoFile } from '../../services/course.service';
import styles from '../../styles/admin.module.css';
import { VIDEO_TYPES, STORAGE_CONFIG } from '../../config';

const VideoList = ({ videos, onEdit, onDelete, onReorder, courseId }) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  
  if (!videos || videos.length === 0) {
    return (
      <div className={styles.noCourses}>
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
          <span className={`${styles.videoBadge} ${styles.videoBadgeLocal}`}>
            {t('admin.localFile')}
          </span>
        );
      case VIDEO_TYPES.EXTERNAL:
        return (
          <span className={`${styles.videoBadge} ${styles.videoBadgeExternal}`}>
            {t('admin.externalUrl')}
          </span>
        );
      case VIDEO_TYPES.TEXT:
        return (
          <span className={`${styles.videoBadge} ${styles.videoBadgeText}`}>
            {t('admin.textLesson')}
          </span>
        );
      default:
        return null;
    }
  };

  // Обработчик удаления видео
  const handleDeleteVideo = async (videoId) => {
    // Удаляем диалог подтверждения отсюда, чтобы не было двойного запроса
    try {
      // Find the video data
      const video = videos.find(v => v.id === videoId);
      if (!video) {
        console.error(`Video ${videoId} not found`);
        throw new Error('Video not found');
      }
      
      console.log('Preparing to delete video:', video);
      
      // Просто вызываем переданный обработчик, который уже содержит запрос на подтверждение
      if (onDelete) {
        onDelete(videoId);
        console.log('Delete video request sent to parent component');
      } else {
        console.error('No onDelete handler provided');
      }
    } catch (error) {
      console.error(`Error preparing to delete video ${videoId}:`, error);
      alert('Failed to prepare video for deletion: ' + (error.message || 'Unknown error'));
    }
  };
  
  return (
    <div className={styles.videoList}>
      {videos.map((video, index) => (
        <div key={video.id} className={styles.videoItem}>
          <div className={styles.videoInfo}>
            <h4 className={styles.videoTitle}>
              {index + 1}. {video.title}
            </h4>
            <div>
              {getVideoTypeLabel(video)}
              {video.duration && (
                <span style={{ fontSize: '0.875rem', color: '#4b5563', marginLeft: '0.5rem' }}>
                  {video.duration}
                </span>
              )}
              {video.isPrivate && (
                <span className={`${styles.videoBadge}`} style={{ backgroundColor: '#ef4444', color: 'white' }}>
                  {t('Private')}
                </span>
              )}
              <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                ID: {video.id}
              </span>
            </div>
          </div>
          
          <div className={styles.videoActions}>
            <button
              className={styles.adminButtonSecondary}
              onClick={(e) => {
                e.preventDefault();
                onReorder(video.id, 'up');
              }}
              disabled={index === 0}
              title={t('admin.moveUp')}
              style={{ opacity: index === 0 ? 0.5 : 1, padding: '0.375rem 0.75rem' }}
            >
              ↑
            </button>

            <button
              className={styles.adminButtonSecondary}
              onClick={(e) => {
                e.preventDefault();
                onReorder(video.id, 'down');
              }}
              disabled={index === videos.length - 1}
              title={t('admin.moveDown')}
              style={{ opacity: index === videos.length - 1 ? 0.5 : 1, padding: '0.375rem 0.75rem' }}
            >
              ↓
            </button>
            
            <button
              className={styles.adminButton}
              onClick={() => onEdit(video)}
              title={t('admin.editVideo')}
              style={{ padding: '0.375rem 0.75rem' }}
            >
              {t('admin.editVideo')}
            </button>
            
            <button
              className={styles.adminButtonDanger}
              onClick={() => handleDeleteVideo(video.id)}
              title={t('admin.deleteVideo')}
              style={{ padding: '0.375rem 0.75rem' }}
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
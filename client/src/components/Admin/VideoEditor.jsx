import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../Layout/Header';
import { VIDEO_TYPES } from '../../config';
import styles from '../../styles/admin.module.css';
import { v4 as uuidv4 } from 'uuid';
import { uploadVideoFile, deleteVideoFile } from '../../services/course.service';
import { STORAGE_CONFIG } from '../../config';

const VideoEditor = ({ video, courseId, onClose, language }) => {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    duration: '',
    isPrivate: false,
    videoType: VIDEO_TYPES.EXTERNAL,
    videoUrl: '',
    localVideo: '',
    storagePath: '',
    uploadedFile: null
  });
  
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(!video);
  const [uploadResponse, setUploadResponse] = useState(null);
  
  // Инициализируем форму при монтировании или изменении видео
  useEffect(() => {
    if (video) {
      // Определяем тип видео для UI
      let uiVideoType = VIDEO_TYPES.EXTERNAL;
      
      console.log('Initializing form with video data:', video);
      console.log('Video has storagePath:', video.storagePath);
      console.log('Video has localVideo:', video.localVideo);
      console.log('Storage config:', STORAGE_CONFIG);
      
      if (video.videoType === VIDEO_TYPES.TEXT) {
        // Текстовый урок
        uiVideoType = VIDEO_TYPES.TEXT;
      } else if (video.videoType === VIDEO_TYPES.STORAGE && video.storagePath) {
        // Storage video
        uiVideoType = VIDEO_TYPES.STORAGE;
        console.log('⭐ Detected STORAGE video, displaying as STORAGE in UI');
      } else if (video.localVideo) {
        // Преобразуем локальное видео в storage для единообразия
        uiVideoType = VIDEO_TYPES.STORAGE;
        console.log('⭐ Detected LOCAL video, converting to STORAGE in UI');
      } else if (video.videoUrl) {
        // Внешнее видео (YouTube)
        uiVideoType = VIDEO_TYPES.EXTERNAL;
        console.log('⭐ Detected EXTERNAL video');
      } else if (!video.videoUrl && !video.localVideo && !video.storagePath) {
        // Нет источника - используем TEXT
        uiVideoType = VIDEO_TYPES.TEXT;
        console.log('⭐ No video source found, using TEXT type');
      }
      
      // Если это локальное видео, используем его как storagePath
      const storagePath = video.storagePath || (video.localVideo ? video.localVideo : '');
      
      setFormData({
        id: video.id,
        title: video.title || '',
        description: video.description || '',
        duration: video.duration || '',
        isPrivate: video.isPrivate || false,
        videoType: uiVideoType,
        videoUrl: video.videoUrl || '',
        localVideo: '',  // Больше не используем
        storagePath: storagePath,
        uploadedFile: null
      });
    } else {
      // Создаем новое видео
      setFormData({
        id: uuidv4(),
        title: '',
        description: '',
        duration: '',
        isPrivate: false,
        videoType: VIDEO_TYPES.EXTERNAL,
        videoUrl: '',
        localVideo: '',
        storagePath: '',
        uploadedFile: null
      });
    }
  }, [video]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log('File selected:', file);
      
      // Устанавливаем файл для загрузки
      setFormData(prev => ({
        ...prev,
        uploadedFile: file
      }));
      
      // Загружаем файл на сервер напрямую
      try {
        setLoading(true);
        setUploadProgress(0);
        setError(null);
        
        // Если есть существующий файл в хранилище, удаляем его перед загрузкой нового
        if (formData.storagePath) {
          console.log(`Deleting previous remote file before upload: ${formData.storagePath}`);
          try {
            // Очищаем имя файла от пути
            const storageFilename = formData.storagePath.split('/').pop();
            
            // Пытаемся удалить файл
            const deleteResult = await deleteVideoFile(storageFilename);
            console.log('Previous file deletion result:', deleteResult);
            
            if (!deleteResult.success) {
              console.warn('Failed to delete previous file, but will continue with upload:', deleteResult.message);
            }
          } catch (deleteError) {
            console.error('Error deleting previous file:', deleteError);
            // Продолжаем загрузку даже при ошибке удаления
          }
        }
        
        console.log('Starting upload with config:', STORAGE_CONFIG);
        
        // Вызываем функцию из сервиса для загрузки файла
        const result = await uploadVideoFile(file, (progress) => {
          setUploadProgress(progress);
        });
        
        if (!result.success) {
          throw new Error(result.message);
        }
        
        console.log("Upload result:", result);
        setUploadResponse(result);
        
        // Обновляем форму с полученным путем к файлу
        setFormData(prev => {
          const newData = { ...prev };
          
          // Всегда устанавливаем тип STORAGE и сохраняем путь
          console.log('Setting video type to STORAGE with path:', result.filePath);
          newData.videoType = VIDEO_TYPES.STORAGE;
          newData.storagePath = result.filePath;
          newData.localVideo = '';
          
          console.log('New form data after upload:', newData);
          return newData;
        });
      } catch (err) {
        console.error('Error uploading file:', err);
        setError(`Ошибка загрузки файла: ${err.message || 'Неизвестная ошибка'}`);
        setUploadProgress(0);
        
        // Сбрасываем выбранный файл
        setFormData(prev => ({
          ...prev,
          uploadedFile: null
        }));
        
        // Сбрасываем элемент выбора файла
        const fileInput = document.getElementById('uploadVideo');
        if (fileInput) {
          fileInput.value = '';
        }
      } finally {
        setLoading(false);
      }
    }
  };
  
  const handleVideoTypeChange = (e) => {
    const newType = e.target.value;
    const oldType = formData.videoType;
    
    console.log(`Changing video type from ${oldType} to ${newType}`);
    console.log('Current form data:', formData);
    
    // Если меняем тип с STORAGE на другой, удаляем существующий файл
    if (oldType === VIDEO_TYPES.STORAGE && newType !== VIDEO_TYPES.STORAGE) {
      // Удаляем файл из хранилища, если он есть
      if (formData.storagePath) {
        try {
          console.log(`Requesting deletion of storage file: ${formData.storagePath}`);
          // Очищаем имя файла от пути
          const storageFilename = formData.storagePath.split('/').pop();
          console.log(`Using cleaned storage path for deletion: ${storageFilename}`);
          
          // Удаляем файл
          deleteVideoFile(storageFilename)
            .then(result => {
              console.log('Storage file deletion result:', result);
              if (result.success) {
                console.log('Successfully deleted storage file:', formData.storagePath);
              } else {
                console.warn('Failed to delete storage file:', result.message);
              }
            })
            .catch(error => {
              console.error('Error in storage file deletion promise:', error);
            });
        } catch (error) {
          console.error('Error requesting storage file deletion:', error);
        }
      }
    }
    
    setFormData(prev => ({
      ...prev,
      videoType: newType,
      // Очищаем соответствующие поля при смене типа
      ...(newType !== VIDEO_TYPES.STORAGE ? { storagePath: '', uploadedFile: null } : {}),
      ...(newType !== VIDEO_TYPES.EXTERNAL ? { videoUrl: '' } : {})
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError(t('Please enter a video title'));
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Если выбран тип TEXT, специальная обработка
      if (formData.videoType === VIDEO_TYPES.TEXT) {
        const finalVideoData = {
          id: formData.id,
          title: formData.title,
          description: formData.description || '',
          videoType: VIDEO_TYPES.TEXT,
          duration: formData.duration || '00:00',
          localVideo: '',
          storagePath: '',
          videoUrl: '',
          isPrivate: formData.isPrivate || false
        };
  
        console.log("Final text lesson data:", finalVideoData);
        onClose(finalVideoData, !isCreating);
        return;
      }
      
      let finalVideoData = {
        id: formData.id,
        title: formData.title,
        description: formData.description,
        duration: formData.duration,
        isPrivate: formData.isPrivate
      };
      
      // Обработка внешних видео
      if (formData.videoType === VIDEO_TYPES.EXTERNAL) {
        if (!formData.videoUrl.trim()) {
          setError(t('Please enter a video URL'));
          setLoading(false);
          return;
        }
        
        finalVideoData.videoUrl = formData.videoUrl;
        finalVideoData.localVideo = '';
        finalVideoData.storagePath = '';
        finalVideoData.videoType = VIDEO_TYPES.EXTERNAL;
      }
      // Обработка видео из удаленного хранилища
      else if (formData.videoType === VIDEO_TYPES.STORAGE) {
        if (!formData.storagePath && !formData.uploadedFile) {
          setError(t('Please upload a video file or enter a storage path'));
          setLoading(false);
          return;
        }
        
        finalVideoData.storagePath = formData.storagePath;
        finalVideoData.localVideo = '';
        finalVideoData.videoUrl = '';
        finalVideoData.videoType = VIDEO_TYPES.STORAGE;
        
        console.log("⭐ Using STORAGE type for video with storagePath:", formData.storagePath);
      }
      
      console.log("Final video data to save:", finalVideoData);
      
      // Закрываем редактор и возвращаем данные
      onClose(finalVideoData, !isCreating);
    } catch (err) {
      console.error('Error saving video:', err);
      setError(err.message || 'Failed to save video');
      setLoading(false);
    }
  };
  
  return (
    <div>
      <Header />
      
      <div className={styles.adminForm}>
        <div className={styles.adminHeader}>
          <h1 className={styles.adminTitle}>
            {isCreating ? t('admin.addVideo') : t('admin.editVideo')}
          </h1>
          
          <button 
            className={styles.adminButtonSecondary}
            onClick={() => onClose()}
          >
            {t('admin.cancel')}
          </button>
        </div>
        
        {error && (
          <div className={styles.errorAlert}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className={styles.videoIdField}>
            <label className={styles.videoIdLabel} htmlFor="id">ID</label>
            <input
              type="text"
              id="id"
              name="id"
              value={formData.id}
              onChange={handleChange}
              className={styles.videoIdInput}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="title">{t('admin.title')}</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={styles.formInput}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="description">{t('admin.description')}</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={styles.formTextarea}
              rows={5}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="duration">{t('admin.duration')}</label>
            <input
              type="text"
              id="duration"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              className={styles.formInput}
              placeholder="e.g. 10:30"
            />
          </div>
          
          <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              id="isPrivate"
              name="isPrivate"
              checked={formData.isPrivate}
              onChange={handleChange}
            />
            <label htmlFor="isPrivate">{t('admin.isPrivate')}</label>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="videoType">{t('admin.videoType')}</label>
            <select
              id="videoType"
              name="videoType"
              value={formData.videoType}
              onChange={handleVideoTypeChange}
              className={styles.formSelect}
            >
              <option value={VIDEO_TYPES.EXTERNAL}>{t('admin.externalUrl')}</option>
              <option value={VIDEO_TYPES.STORAGE}>{t('admin.remoteStorage')}</option>
              <option value={VIDEO_TYPES.TEXT}>{t('admin.textLesson')}</option>
            </select>
          </div>
          
          {formData.videoType === VIDEO_TYPES.EXTERNAL && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="videoUrl">YouTube URL</label>
              <input
                type="text"
                id="videoUrl"
                name="videoUrl"
                value={formData.videoUrl}
                onChange={handleChange}
                className={styles.formInput}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
          )}
          
          {formData.videoType === VIDEO_TYPES.STORAGE && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="uploadVideo">{t('admin.uploadVideo')}</label>
              
              {formData.storagePath && !formData.uploadedFile && !uploadResponse && (
                <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#e8f4f8', borderRadius: '4px' }}>
                  <p>Current file: {formData.storagePath}</p>
                </div>
              )}
              
              {uploadResponse && (
                <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#e8f4f8', borderRadius: '4px' }}>
                  <p>Uploaded file: {uploadResponse.originalName}</p>
                  <p>File path: {uploadResponse.filePath}</p>
                </div>
              )}
              
              <div className={styles.fileUploadContainer}>
                <input
                  type="file"
                  id="uploadVideo"
                  accept="video/mp4,video/webm,video/ogg"
                  onChange={handleFileChange}
                  className={styles.formInput}
                  style={{ padding: '0.5rem 0' }}
                />
                <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
                  Maximum file size: {window.APP_CONFIG?.MAX_UPLOAD_SIZE_MB || 100}MB
                </div>
              </div>
              
              {formData.uploadedFile && !uploadResponse && (
                <div style={{ marginTop: '10px' }}>
                  <p>Selected file: {formData.uploadedFile.name}</p>
                </div>
              )}
              
              {loading && uploadProgress > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ 
                    width: '100%', 
                    height: '10px', 
                    backgroundColor: '#e5e7eb',
                    borderRadius: '5px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: `${uploadProgress}%`, 
                      height: '100%', 
                      backgroundColor: '#4f46e5',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                  <p style={{ marginTop: '5px', fontSize: '0.875rem', color: '#4b5563' }}>
                    {uploadProgress}% uploaded
                  </p>
                </div>
              )}
            </div>
          )}
          
          <div className={styles.formActions}>
            <button
              type="submit"
              className={styles.adminButton}
              disabled={loading}
            >
              {loading ? t('loading') : t('admin.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VideoEditor;
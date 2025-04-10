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
      // Определяем тип видео
      let videoType = VIDEO_TYPES.EXTERNAL;
      if (video.localVideo) {
        videoType = VIDEO_TYPES.LOCAL;
      } else if (video.storagePath && STORAGE_CONFIG.USE_REMOTE_STORAGE) {
        videoType = VIDEO_TYPES.STORAGE;
      } else if (!video.videoUrl && !video.localVideo && !video.storagePath) {
        videoType = VIDEO_TYPES.TEXT;
      }
      
      setFormData({
        id: video.id,
        title: video.title || '',
        description: video.description || '',
        duration: video.duration || '',
        isPrivate: video.isPrivate || false,
        videoType,
        videoUrl: video.videoUrl || '',
        localVideo: video.localVideo || '',
        storagePath: video.storagePath || '',
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
      
      setFormData(prev => ({
        ...prev,
        uploadedFile: file,
        videoType: STORAGE_CONFIG.USE_REMOTE_STORAGE ? VIDEO_TYPES.STORAGE : VIDEO_TYPES.LOCAL
      }));
      
      // Сразу загружаем файл на сервер
      try {
        setLoading(true);
        setUploadProgress(0);
        
        console.log('Starting upload with config:', STORAGE_CONFIG);
        
        const uploadResult = await uploadVideoFile(file, (progress) => {
          setUploadProgress(progress);
        });
        
        console.log("Upload result:", uploadResult);
        setUploadResponse(uploadResult);
        
        console.log('Setting form data based on upload result. Video type:', uploadResult.videoType);
        
        // Обновляем форму с полученным путем к файлу
        setFormData(prev => {
          // Важно: проверяем тип возвращенный с сервера, а не текущую настройку
          const newData = {
            ...prev,
            videoType: uploadResult.videoType || VIDEO_TYPES.LOCAL
          };
          
          // В зависимости от типа видео, устанавливаем путь в соответствующее поле
          if (uploadResult.videoType === VIDEO_TYPES.STORAGE) {
            console.log('Setting storagePath:', uploadResult.filePath);
            newData.storagePath = uploadResult.filePath;
            newData.localVideo = '';
          } else {
            console.log('Setting localVideo:', uploadResult.filePath);
            newData.localVideo = uploadResult.filePath;
            newData.storagePath = '';
          }
          
          console.log('New form data:', newData);
          return newData;
        });
      } catch (err) {
        console.error('Error uploading file:', err);
        setError(`Error uploading file: ${err.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    }
  };
  
  const handleVideoTypeChange = (e) => {
    const newType = e.target.value;
    const oldType = formData.videoType;
    
    // Если меняем тип с локального или хранилища на другой и у нас есть файл
    if ((oldType === VIDEO_TYPES.LOCAL || oldType === VIDEO_TYPES.STORAGE) && 
        newType !== VIDEO_TYPES.LOCAL && newType !== VIDEO_TYPES.STORAGE && 
        (formData.localVideo || formData.storagePath)) {
      // Удаляем файл
      try {
        if (formData.localVideo) {
          deleteVideoFile(formData.localVideo);
          console.log('Requested file deletion for type change:', formData.localVideo);
        }
      } catch (error) {
        console.error('Error requesting file deletion:', error);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      videoType: newType,
      // Очищаем соответствующие поля при смене типа
      ...((newType !== VIDEO_TYPES.LOCAL && newType !== VIDEO_TYPES.STORAGE) 
          ? { localVideo: '', storagePath: '', uploadedFile: null } 
          : {}),
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
      // Обработка видео из хранилища
      else if (formData.videoType === VIDEO_TYPES.STORAGE) {
        if (formData.uploadedFile && formData.storagePath) {
          finalVideoData.storagePath = formData.storagePath;
          finalVideoData.localVideo = '';
          finalVideoData.videoUrl = '';
          finalVideoData.videoType = VIDEO_TYPES.STORAGE;
        }
        else if (formData.storagePath) {
          finalVideoData.storagePath = formData.storagePath;
          finalVideoData.localVideo = '';
          finalVideoData.videoUrl = '';
          finalVideoData.videoType = VIDEO_TYPES.STORAGE;
        }
        else {
          setError(t('Please select a video file to upload'));
          setLoading(false);
          return;
        }
      }
      // Обработка локальных видео
      else if (formData.videoType === VIDEO_TYPES.LOCAL) {
        // Используем результат загрузки, если он есть
        if (formData.uploadedFile && formData.localVideo) {
          finalVideoData.localVideo = formData.localVideo;
          finalVideoData.videoUrl = '';
          finalVideoData.storagePath = '';
          finalVideoData.videoType = VIDEO_TYPES.LOCAL;
        } 
        // Или используем существующий локальный путь
        else if (formData.localVideo) {
          finalVideoData.localVideo = formData.localVideo;
          finalVideoData.videoUrl = '';
          finalVideoData.storagePath = '';
          finalVideoData.videoType = VIDEO_TYPES.LOCAL;
        } 
        else {
          setError(t('Please select a video file to upload'));
          setLoading(false);
          return;
        }
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
              <option value={VIDEO_TYPES.LOCAL}>{t('admin.localFile')}</option>
              <option value={VIDEO_TYPES.STORAGE}>{t('admin.storage')}</option>
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
          
          {formData.videoType === VIDEO_TYPES.LOCAL && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="uploadVideo">{t('admin.uploadVideo')}</label>
              
              {formData.localVideo && !formData.uploadedFile && !uploadResponse && (
                <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#e8f4f8', borderRadius: '4px' }}>
                  <p>Current file: {formData.localVideo}</p>
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
          
          {formData.videoType === VIDEO_TYPES.STORAGE && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="uploadVideo">{t('admin.uploadVideo')}</label>
              
              {formData.storagePath && !formData.uploadedFile && !uploadResponse && (
                <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#e8f4f8', borderRadius: '4px' }}>
                  <p>Current storage path: {formData.storagePath}</p>
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
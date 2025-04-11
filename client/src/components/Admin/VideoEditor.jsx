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
      // Определяем тип видео для UI (объединяем STORAGE и LOCAL в UI)
      let uiVideoType = VIDEO_TYPES.EXTERNAL;
      
      if (video.localVideo || (video.storagePath && STORAGE_CONFIG.USE_REMOTE_STORAGE)) {
        // Оба типа отображаются как LOCAL в UI
        uiVideoType = VIDEO_TYPES.LOCAL;
      } else if (!video.videoUrl && !video.localVideo && !video.storagePath) {
        uiVideoType = VIDEO_TYPES.TEXT;
      }
      
      setFormData({
        id: video.id,
        title: video.title || '',
        description: video.description || '',
        duration: video.duration || '',
        isPrivate: video.isPrivate || false,
        videoType: uiVideoType,
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
      
      // Устанавливаем тип видео LOCAL в UI
      setFormData(prev => ({
        ...prev,
        uploadedFile: file,
        videoType: VIDEO_TYPES.LOCAL
      }));
      
      // Загружаем файл на сервер напрямую
      try {
        setLoading(true);
        setUploadProgress(0);
        setError(null);
        
        console.log('Starting upload with config:', STORAGE_CONFIG);
        
        // ПРЯМАЯ ЗАГРУЗКА ФАЙЛА ЧЕРЕЗ XMLHTTPREQUEST
        // Обходим Nginx, обращаясь напрямую к порту 5000
        const xhr = new XMLHttpRequest();
        const serverUrl = `http://${window.location.hostname}:5000/api/simple-upload`;
        
        // Настройка обработчиков событий XHR
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percentComplete);
          }
        };
        
        // Создаем промис для работы с XHR
        const uploadPromise = new Promise((resolve, reject) => {
          xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                resolve(data);
              } catch (e) {
                reject(new Error('Ошибка разбора ответа'));
              }
            } else {
              reject(new Error(`Ошибка ${xhr.status}: ${xhr.statusText}`));
            }
          };
          
          xhr.onerror = function() {
            reject(new Error('Ошибка сети при загрузке'));
          };
        });
        
        // Открываем соединение и отправляем файл
        xhr.open('POST', serverUrl, true);
        
        const formData = new FormData();
        formData.append('file', file);
        xhr.send(formData);
        
        // Ждем результата загрузки
        const uploadResult = await uploadPromise;
        
        console.log("Upload result:", uploadResult);
        setUploadResponse(uploadResult);
        
        // Обновляем форму с полученным путем к файлу
        setFormData(prev => {
          const newData = {
            ...prev,
            videoType: VIDEO_TYPES.LOCAL
          };
          
          if (uploadResult.videoType === VIDEO_TYPES.STORAGE || STORAGE_CONFIG.USE_REMOTE_STORAGE) {
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
    
    // If changing from LOCAL to another type, check if we need to delete any files
    if (oldType === VIDEO_TYPES.LOCAL && newType !== VIDEO_TYPES.LOCAL) {
      // Try to delete local file if it exists
      if (formData.localVideo) {
        try {
          deleteVideoFile(formData.localVideo);
          console.log('Requested file deletion for type change:', formData.localVideo);
        } catch (error) {
          console.error('Error requesting file deletion:', error);
        }
      }
      
      // Try to delete storage file if it exists (could be storage file displayed as local)
      if (formData.storagePath && STORAGE_CONFIG.USE_REMOTE_STORAGE) {
        try {
          // Use the deleteVideoFile function for storage files too
          deleteVideoFile(formData.storagePath);
          console.log('Requested storage file deletion for type change:', formData.storagePath);
        } catch (error) {
          console.error('Error requesting storage file deletion:', error);
        }
      }
    }
    
    setFormData(prev => ({
      ...prev,
      videoType: newType,
      // Очищаем соответствующие поля при смене типа
      ...(newType !== VIDEO_TYPES.LOCAL ? { localVideo: '', storagePath: '', uploadedFile: null } : {}),
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
      // Обработка локальных видео (includes storage videos behind the scenes)
      else if (formData.videoType === VIDEO_TYPES.LOCAL) {
        // Check if this is actually a storage video (has storagePath)
        if (formData.storagePath && STORAGE_CONFIG.USE_REMOTE_STORAGE) {
          // This is a storage video but displayed as local to the user
          finalVideoData.storagePath = formData.storagePath;
          finalVideoData.localVideo = '';
          finalVideoData.videoUrl = '';
          finalVideoData.videoType = VIDEO_TYPES.STORAGE; // Internally use STORAGE
        }
        // Regular local video
        else if (formData.uploadedFile && formData.localVideo || formData.localVideo) {
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
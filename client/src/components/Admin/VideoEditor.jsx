// client/src/components/Admin/VideoEditor.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { uploadVideoFile } from '../../services/course.service';
import Header from '../Layout/Header';
import { VIDEO_TYPES } from '../../config';
import styles from '../../styles/courses.module.css';
import { v4 as uuidv4 } from 'uuid';

// Добавим кастомный компонент для текстовых уроков
const TextLessonEditor = ({ video, onSave }) => {
  const [title, setTitle] = useState(video?.title || '');
  const [description, setDescription] = useState(video?.description || '');

  const handleSave = () => {
    if (!title.trim()) {
      alert('Пожалуйста, введите название урока');
      return;
    }

    onSave({
      id: video?.id || uuidv4(),
      title,
      description,
      videoType: VIDEO_TYPES.TEXT,
      localVideo: '',
      videoUrl: ''
    });
  };

  return (
    <div className={styles.textLessonEditor}>
      <div className={styles.adminFormField}>
        <label className={styles.adminLabel}>Название текстового урока</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={styles.adminInput}
          required
        />
      </div>

      <div className={styles.adminFormField}>
        <label className={styles.adminLabel}>Описание урока</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={styles.adminTextarea}
          rows={6}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
        <button 
          onClick={handleSave} 
          className={styles.adminButton}
        >
          Сохранить текстовый урок
        </button>
      </div>
    </div>
  );
};

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
      } else if (!video.videoUrl && !video.localVideo) {
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
      setFormData(prev => ({
        ...prev,
        uploadedFile: file,
        videoType: VIDEO_TYPES.LOCAL // Automatically switch to local video type
      }));
      
      // Сразу загружаем файл на сервер
      try {
        setLoading(true);
        setUploadProgress(0);
        
        const uploadResult = await uploadVideoFile(file, (progress) => {
          setUploadProgress(progress);
        });
        
        console.log("Upload result:", uploadResult);
        setUploadResponse(uploadResult);
        
        // Обновляем форму с полученным путем к файлу
        setFormData(prev => ({
          ...prev,
          localVideo: uploadResult.filePath
        }));
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
    setFormData(prev => ({
      ...prev,
      videoType: newType
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
          id: formData.id || uuidv4(),
          title: formData.title,
          description: formData.description || '',
          videoType: VIDEO_TYPES.TEXT,
          duration: '00:00',
          localVideo: '',
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
        finalVideoData.videoType = VIDEO_TYPES.EXTERNAL;
      } 
      // Обработка локальных видео
      else if (formData.videoType === VIDEO_TYPES.LOCAL) {
        // Используем результат загрузки, если он есть
        if (formData.uploadedFile && formData.localVideo) {
          finalVideoData.localVideo = formData.localVideo;
          finalVideoData.videoUrl = '';
          finalVideoData.videoType = VIDEO_TYPES.LOCAL;
        } 
        // Или используем существующий локальный путь
        else if (formData.localVideo) {
          finalVideoData.localVideo = formData.localVideo;
          finalVideoData.videoUrl = '';
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
      
      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1>{isCreating ? t('admin.addVideo') : t('admin.editVideo')}</h1>
          
          <button 
            className={styles.adminButtonSecondary}
            onClick={() => onClose()}
          >
            {t('admin.cancel')}
          </button>
        </div>
        
        {error && (
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#ffe0e0', 
            color: '#d32f2f', 
            borderRadius: '8px',
            marginBottom: '20px' 
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className={styles.adminFormField}>
            <label className={styles.adminLabel}>{t('admin.title')}</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={styles.adminInput}
              required
            />
          </div>
          
          <div className={styles.adminFormField}>
            <label className={styles.adminLabel}>{t('admin.description')}</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={styles.adminTextarea}
            />
          </div>
          
          <div className={styles.adminFormField}>
            <label className={styles.adminLabel}>{t('admin.duration')}</label>
            <input
              type="text"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              className={styles.adminInput}
              placeholder="e.g. 10:30"
            />
          </div>
          
          <div className={styles.adminFormField} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              name="isPrivate"
              checked={formData.isPrivate}
              onChange={handleChange}
              id="isPrivate"
            />
            <label htmlFor="isPrivate">{t('admin.isPrivate')}</label>
          </div>
          
          <div className={styles.adminFormField}>
            <label className={styles.adminLabel}>{t('admin.videoType')}</label>
            <select
              name="videoType"
              value={formData.videoType}
              onChange={handleVideoTypeChange}
              className={styles.adminSelect}
            >
              <option value={VIDEO_TYPES.EXTERNAL}>{t('admin.externalUrl')}</option>
              <option value={VIDEO_TYPES.LOCAL}>{t('admin.localFile')}</option>
              <option value={VIDEO_TYPES.TEXT}>{t('admin.textLesson')}</option>
            </select>
          </div>
          
          {formData.videoType === VIDEO_TYPES.EXTERNAL && (
            <div className={styles.adminFormField}>
              <label className={styles.adminLabel}>YouTube URL</label>
              <input
                type="text"
                name="videoUrl"
                value={formData.videoUrl}
                onChange={handleChange}
                className={styles.adminInput}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
          )}
          
          {formData.videoType === VIDEO_TYPES.LOCAL && (
            <div className={styles.adminFormField}>
              <label className={styles.adminLabel}>{t('admin.uploadVideo')}</label>
              
              {formData.localVideo && !formData.uploadedFile && !uploadResponse && (
                <div style={{ marginBottom: '10px' }}>
                  <p>Current file: {formData.localVideo}</p>
                </div>
              )}
              
              {uploadResponse && (
                <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#e8f4f8', borderRadius: '4px' }}>
                  <p>Uploaded file: {uploadResponse.originalName}</p>
                  <p>File path: {uploadResponse.filePath}</p>
                </div>
              )}
              
              <input
                type="file"
                accept="video/mp4,video/webm,video/ogg"
                onChange={handleFileChange}
                className={styles.adminInputFile}
              />
              
              {formData.uploadedFile && !uploadResponse && (
                <div style={{ marginTop: '10px' }}>
                  <p>Selected file: {formData.uploadedFile.name}</p>
                </div>
              )}
              
              {loading && uploadProgress > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <progress value={uploadProgress} max="100" style={{ width: '100%' }}></progress>
                  <p>{uploadProgress}% uploaded</p>
                </div>
              )}
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px' }}>
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
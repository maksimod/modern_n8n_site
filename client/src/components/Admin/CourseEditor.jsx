// client/src/components/Admin/CourseEditor.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { createCourse, updateCourse, getCourseById } from '../../services/course.service';
import Header from '../Layout/Header';
import VideoEditor from './VideoEditor';
import VideoList from './VideoList';
import { SUPPORTED_LANGUAGES } from '../../config';
import styles from '../../styles/courses.module.css';
import { v4 as uuidv4 } from 'uuid'; // Need to install this package

const CourseEditor = ({ course, onClose, language }) => {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    language: language || 'ru',
    videos: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(!course);
  const [showVideoEditor, setShowVideoEditor] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  
  // Загружаем детали курса если редактируем существующий
  useEffect(() => {
    if (course) {
      setFormData({
        id: course.id,
        title: course.title || '',
        description: course.description || '',
        language: course.language || language || 'ru',
        videos: course.videos || []
      });
    } else {
      // Generate a unique ID for new courses
      setFormData({
        id: uuidv4(),
        title: '',
        description: '',
        language: language || 'ru',
        videos: []
      });
    }
  }, [course, language]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError(t('Please enter a course title'));
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Создаем глубокую копию данных для отправки
      const dataToSend = JSON.parse(JSON.stringify(formData));
      
      if (isCreating) {
        await createCourse(dataToSend);
      } else {
        await updateCourse(dataToSend.id, dataToSend);
      }
      
      // Close the editor and refresh the course list
      onClose(true);
    } catch (err) {
      console.error('Error saving course:', err);
      setError(err.message || 'Failed to save course');
    } finally {
      setLoading(false);
    }
  };
  
  // Add video button handler
  const handleAddVideo = () => {
    setCurrentVideo(null);
    setShowVideoEditor(true);
  };
  
  // Edit video handler
  const handleEditVideo = (video) => {
    setCurrentVideo(video);
    setShowVideoEditor(true);
  };
  
  // Close video editor
  const handleCloseVideoEditor = (newVideo = null, isUpdate = false) => {
    setShowVideoEditor(false);
    
    // If we have a new/updated video, add it to the form data
    if (newVideo) {
      setFormData(prev => {
        if (isUpdate) {
          // Update existing video
          const updatedVideos = prev.videos.map(video => 
            video.id === newVideo.id ? newVideo : video
          );
          return { ...prev, videos: updatedVideos };
        } else {
          // Add new video
          return { ...prev, videos: [...prev.videos, newVideo] };
        }
      });
    }
  };
  
  // Delete video handler
  const handleDeleteVideo = (videoId) => {
    if (window.confirm(t('admin.confirmDeleteVideo'))) {
      setFormData(prev => ({
        ...prev,
        videos: prev.videos.filter(video => video.id !== videoId)
      }));
    }
  };
  
  // Update video positions
  const handleReorderVideos = (videoId, direction) => {
    setFormData(prev => {
      const videos = [...prev.videos];
      const index = videos.findIndex(v => v.id === videoId);
      
      if (index === -1) return prev;
      
      if (direction === 'up' && index > 0) {
        // Move video up
        [videos[index], videos[index - 1]] = [videos[index - 1], videos[index]];
      } else if (direction === 'down' && index < videos.length - 1) {
        // Move video down
        [videos[index], videos[index + 1]] = [videos[index + 1], videos[index]];
      }
      
      return { ...prev, videos };
    });
  };
  
  // If video editor is open
  if (showVideoEditor) {
    return (
      <VideoEditor
        video={currentVideo}
        courseId={formData.id}
        onClose={handleCloseVideoEditor}
        language={formData.language}
      />
    );
  }
  
  return (
    <div>
      <Header />
      
      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1>{isCreating ? t('admin.createCourse') : t('admin.editCourse')}</h1>
          
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
            <label className={styles.adminLabel}>{t('admin.language')}</label>
            <select
              name="language"
              value={formData.language}
              onChange={handleChange}
              className={styles.adminSelect}
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ marginTop: '30px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2>{t('courseContents')}</h2>
              
              <button 
                type="button"
                className={styles.adminButton}
                onClick={handleAddVideo}
              >
                {t('admin.addVideo')}
              </button>
            </div>
            
            <VideoList 
              videos={formData.videos}
              onEdit={handleEditVideo}
              onDelete={handleDeleteVideo}
              onReorder={handleReorderVideos}
            />
          </div>
          
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

export default CourseEditor;
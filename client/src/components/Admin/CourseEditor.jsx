// client/src/components/Admin/CourseEditor.jsx

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { createCourse, updateCourse, getCourseById, updateVideoPositions, deleteVideo } from '../../services/course.service';  // Убедитесь, что здесь есть импорт deleteVideo
import Header from '../Layout/Header';
import VideoEditor from './VideoEditor';
import VideoList from './VideoList';
import { SUPPORTED_LANGUAGES } from '../../config';
import styles from '../../styles/admin.module.css';
import { v4 as uuidv4 } from 'uuid';


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
  const [successMessage, setSuccessMessage] = useState(null);
  const [isCreating, setIsCreating] = useState(!course);
  const [showVideoEditor, setShowVideoEditor] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  
  // Сбрасываем сообщение об успехе через 5 секунд
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
  
  // Загружаем детали курса если редактируем существующий
  useEffect(() => {
    if (course) {
      // Ищем версию курса на выбранном языке
      const courseLanguage = language || 'ru';
      const fetchCourseByLanguage = async () => {
        try {
          // Получаем курс на выбранном языке
          const courseData = await getCourseById(course.id, courseLanguage);
          if (courseData) {
            setFormData({
              id: courseData.id,
              title: courseData.title || '',
              description: courseData.description || '',
              language: courseData.language || courseLanguage,
              videos: courseData.videos || []
            });
          } else {
            // Если нет курса на выбранном языке, используем текущие данные
            setFormData({
              id: course.id,
              title: course.title || '',
              description: course.description || '',
              language: courseLanguage,
              videos: course.videos || []
            });
          }
        } catch (error) {
          console.error('Error fetching course by language:', error);
          // Используем текущий курс при ошибке
          setFormData({
            id: course.id,
            title: course.title || '',
            description: course.description || '',
            language: courseLanguage,
            videos: course.videos || []
          });
        }
      };
  
      fetchCourseByLanguage();
    } else {
      // Создаем новый курс на выбранном языке
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
    setSuccessMessage(null);
    
    try {
      // Создаем глубокую копию данных для отправки
      const dataToSend = JSON.parse(JSON.stringify(formData));
      
      if (isCreating) {
        await createCourse(dataToSend);
      } else {
        await updateCourse(dataToSend.id, dataToSend);
      }
      
      // Показываем сообщение об успехе
      setSuccessMessage(t('Course successfully saved'));
      
      // Закрываем редактор через короткую задержку
      setTimeout(() => {
        // Close the editor and refresh the course list
        onClose(true);
      }, 1000);
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
  const handleCloseVideoEditor = async (newVideo = null, isUpdate = false) => {
    setShowVideoEditor(false);
    
    // If we have a new/updated video, add it to the form data and save the course
    if (newVideo) {
      // Показываем состояние загрузки
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      
      try {
        // Обновляем локальное состояние
        let updatedFormData;
        setFormData(prev => {
          let newFormData;
          if (isUpdate) {
            // Update existing video
            const updatedVideos = prev.videos.map(video => 
              video.id === newVideo.id ? newVideo : video
            );
            newFormData = { ...prev, videos: updatedVideos };
          } else {
            // Add new video
            newFormData = { ...prev, videos: [...prev.videos, newVideo] };
          }
          
          // Сохраняем для использования в API запросе
          updatedFormData = newFormData;
          return newFormData;
        });
        
        // Даем немного времени для обновления состояния
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Автоматически сохраняем курс после изменения видео
        console.log(`Auto-saving course after ${isUpdate ? 'updating' : 'adding'} video...`, newVideo.id);
        
        // Создаем глубокую копию данных для отправки
        const dataToSend = updatedFormData || JSON.parse(JSON.stringify(formData));
        
        // Сохраняем курс на сервере
        const saveResult = await updateCourse(dataToSend.id, dataToSend);
        console.log('Course auto-saved after video change:', saveResult);
        
        // Показываем сообщение об успехе
        setSuccessMessage(
          isUpdate 
            ? t('Video successfully updated and saved to the server')
            : t('Video successfully added and saved to the server')
        );
      } catch (err) {
        console.error(`Error auto-saving course after ${isUpdate ? 'updating' : 'adding'} video:`, err);
        setError(`Video was added to the course, but there was an error saving to the server: ${err.message || 'Unknown error'}. Please try saving the course manually.`);
      } finally {
        setLoading(false);
      }
    }
  };
  
  const handleDeleteVideo = async (videoId) => {
    if (window.confirm(t('admin.confirmDeleteVideo'))) {
      try {
        setLoading(true);
        setError(null);
        
        // Находим видео для логирования
        const videoToDelete = formData.videos.find(v => v.id === videoId);
        console.log(`Deleting video: ${videoId} from course: ${formData.id}`, 
          videoToDelete ? `(type: ${videoToDelete.videoType || 'unknown'})` : '');
        
        // Создаем копию текущего состояния для возможного восстановления
        const previousVideos = [...formData.videos];
        
        // Удаляем видео из состояния
        const updatedVideos = formData.videos.filter(v => v.id !== videoId);
        const updatedFormData = {
          ...formData,
          videos: updatedVideos
        };
        
        // Обновляем UI немедленно
        setFormData(updatedFormData);
        console.log('Video removed from UI state');
        
        // Вызываем оба API одновременно для максимальной надежности:
        // 1. Удаляем видео через API удаления
        // 2. Сохраняем полное состояние курса без удаленного видео
        try {
          await Promise.all([
            // API удаления видео
            deleteVideo(formData.id, videoId, formData.language).then(result => {
              console.log('Delete video API response:', result);
            }).catch(error => {
              console.error('Error in delete video API:', error);
              // Продолжаем выполнение, так как мы все равно сохраним курс
              return null;
            }),
            
            // Принудительное сохранение курса без видео
            updateCourse(formData.id, updatedFormData).then(result => {
              console.log('Course saved after video deletion:', result);
            }).catch(error => {
              console.error('Error saving course after video deletion:', error);
              throw error; // Прокидываем ошибку наверх
            })
          ]);
          
          console.log('Video successfully deleted and course updated');
        } catch (apiError) {
          console.error('Critical error during video deletion:', apiError);
          
          // Восстанавливаем состояние только в случае отказа обоих API
          setFormData({
            ...formData,
            videos: previousVideos
          });
          console.log('Restored previous state due to API errors');
          setError(`Failed to delete video: ${apiError.message || 'Server error'}`);
        }
      } catch (err) {
        console.error('Error in delete video handler:', err);
        setError(`Failed to delete video: ${err.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
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
      
      // Async call to update video positions on the server
      const videoIds = videos.map(video => video.id);
      updateVideoPositions(formData.id, videoIds)
        .catch(err => {
          // Игнорируем ошибку 404, так как эндпоинт может быть не реализован
          if (err?.response?.status !== 404) {
            console.error('Error saving video positions:', err);
          } else {
            console.log('Video positions endpoint not available yet, but UI reordering still works');
          }
        });
      
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
      
      <div className={styles.adminForm}>
        <div className={styles.adminHeader}>
          <h1 className={styles.adminTitle}>
            {isCreating ? t('admin.createCourse') : t('admin.editCourse')}
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
        
        {successMessage && (
          <div className={styles.successAlert} style={{ 
            backgroundColor: '#d1fae5', 
            color: '#065f46', 
            padding: '1rem',
            borderRadius: '0.375rem',
            marginBottom: '1rem'
          }}>
            {successMessage}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="id">{t('ID')}</label>
            <input
              type="text"
              id="id"
              name="id"
              value={formData.id}
              onChange={handleChange}
              className={styles.formInput}
              required
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
            <label className={styles.formLabel} htmlFor="language">{t('admin.language')}</label>
            <select
              id="language"
              name="language"
              value={formData.language}
              onChange={handleChange}
              className={styles.formSelect}
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className={styles.videoListSection}>
            <div className={styles.videoListHeader}>
              <h2 className={styles.videoListTitle}>{t('courseContents')}</h2>
              
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
              courseId={formData.id}
            />
          </div>
          
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

export default CourseEditor;
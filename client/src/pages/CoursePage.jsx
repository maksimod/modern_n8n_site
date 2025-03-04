import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getCourseById, getVideoById, markVideoAsCompleted, getCourseProgress, isVideoCompleted } from '../services/course.service';
import Header from '../components/Layout/Header';
import styles from '../styles/courses.module.css';

const CoursePage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const videoId = searchParams.get('video');
  const { language } = useLanguage();
  const { currentUser, isAuthenticated } = useAuth();
  
  const [course, setCourse] = useState(null);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedVideos, setCompletedVideos] = useState({});

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const courseData = await getCourseById(courseId, language);
        setCourse(courseData);
        
        // Если язык курса не совпадает с выбранным языком, уведомляем пользователя
        if (courseData && courseData.language !== language) {
          console.log(`Курс доступен только на языке: ${courseData.language}`);
          // Можно добавить уведомление для пользователя
        }
        
        if (courseData && (!videoId || !courseData.videos.find(v => v.id === videoId))) {
          if (courseData.videos.length > 0) {
            setSearchParams({ video: courseData.videos[0].id });
          }
        } else if (videoId && courseData) {
          const videoData = await getVideoById(courseId, videoId, language);
          setCurrentVideo(videoData);
          
          // Загрузка данных о просмотренных видео
          if (currentUser) {
            const progress = getCourseProgress(currentUser, courseId);
            setCompletedVideos(progress || {});
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки курса:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchCourse();
  }, [courseId, videoId, language, setSearchParams, currentUser]);

  const handleMarkAsCompleted = async (videoId, completed) => {
    if (!isAuthenticated) {
      return;
    }
    
    try {
      await markVideoAsCompleted(currentUser.id, courseId, videoId, completed);
      setCompletedVideos(prev => ({
        ...prev,
        [videoId]: completed
      }));
    } catch (error) {
      console.error('Ошибка при отметке видео:', error);
    }
  };

  // Обработчик события при завершении видео - это важная часть, которая обновляет состояние в родительском компоненте
  const handleVideoComplete = (videoId, completed) => {
    setCompletedVideos(prev => ({
      ...prev,
      [videoId]: completed
    }));
  };

  if (loading) {
    return <div style={{ padding: '40px' }}>{t('loading')}</div>;
  }

  if (!course) {
    return <div style={{ padding: '40px' }}>Курс не найден</div>;
  }

  return (
    <div>
      <Header />
      
      <div style={{ display: 'flex', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ width: '300px', padding: '20px', borderRight: '1px solid #ddd' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', color: '#4f46e5', textDecoration: 'none' }}>
            <span>← Назад к курсам</span>
          </Link>
          
          <h2 style={{ marginBottom: '20px' }}>Основы n8n</h2>
          
          <div>
            {course.videos.map((video, index) => {
              const isCompleted = completedVideos[video.id];
              const isActive = currentVideo && currentVideo.id === video.id;
              
              return (
                <div key={video.id} style={{ display: 'flex', marginBottom: '10px' }}>
                  <Link 
                    to={`/course/${courseId}?video=${video.id}`}
                    style={{
                      display: 'flex',
                      flex: 1,
                      padding: '15px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      borderLeft: isCompleted ? '4px solid #10b981' : '1px solid #ddd',
                      textDecoration: 'none',
                      background: isActive ? '#eff6ff' : 'white',
                      color: '#111827'
                    }}
                  >
                    <div style={{ 
                      minWidth: '28px', 
                      height: '28px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      backgroundColor: '#f1f5f9', 
                      borderRadius: '50%', 
                      marginRight: '10px',
                      flexShrink: 0
                    }}>
                      {index + 1}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <h4 style={{ margin: 0, fontWeight: 500 }}>{video.title}</h4>
                        <span style={{ 
                          fontSize: '12px', 
                          padding: '2px 8px', 
                          backgroundColor: '#f1f5f9', 
                          borderRadius: '4px' 
                        }}>
                          {video.duration}
                        </span>
                      </div>
                    </div>
                  </Link>
                  
                  <div style={{ marginLeft: '10px', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={!!isCompleted} 
                      onChange={(e) => handleMarkAsCompleted(video.id, e.target.checked)}
                      style={{ transform: 'scale(1.2)' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div style={{ flex: 1, padding: '20px' }}>
          {currentVideo ? (
            <div>
              <div style={{ 
                paddingTop: '56.25%', 
                position: 'relative', 
                backgroundColor: '#000', 
                marginBottom: '20px',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <iframe
                  src={currentVideo.videoUrl.replace('watch?v=', 'embed/')}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                  title={currentVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ margin: 0 }}>{currentVideo.title}</h2>
                <label style={{ display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={!!completedVideos[currentVideo.id]} 
                    onChange={(e) => handleMarkAsCompleted(currentVideo.id, e.target.checked)}
                    style={{ marginRight: '5px', transform: 'scale(1.2)' }}
                  />
                </label>
              </div>
              <p style={{ color: '#666' }}>{currentVideo.description}</p>
            </div>
          ) : (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              backgroundColor: '#f9f9f9',
              borderRadius: '8px'
            }}>
              {t('selectVideo')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursePage;
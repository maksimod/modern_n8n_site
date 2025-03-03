import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { getCourseById, getVideoById } from '../services/course.service';

const CoursePage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const videoId = searchParams.get('video');
  const { language } = useLanguage();
  
  const [course, setCourse] = useState(null);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const courseData = await getCourseById(courseId, language);
        setCourse(courseData);
        
        // Если видео не выбрано, выбираем первое
        if (courseData && (!videoId || !courseData.videos.find(v => v.id === videoId))) {
          if (courseData.videos.length > 0) {
            setSearchParams({ video: courseData.videos[0].id });
          }
        } else if (videoId && courseData) {
          const videoData = await getVideoById(courseId, videoId, language);
          setCurrentVideo(videoData);
        }
      } catch (error) {
        console.error('Ошибка загрузки курса:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, videoId, language, setSearchParams]);

  if (loading) {
    return <div style={{ padding: '40px' }}>{t('loading')}</div>;
  }

  if (!course) {
    return <div style={{ padding: '40px' }}>Курс не найден</div>;
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/" style={{ color: '#4f46e5', textDecoration: 'none' }}>{t('backToCourses')}</Link>
      </div>
      
      <h1 style={{ marginBottom: '20px' }}>{course.title}</h1>
      <p style={{ marginBottom: '30px', color: '#666' }}>{course.description}</p>
      
      <div style={{ display: 'flex', gap: '30px' }}>
        {/* Список видео */}
        <div style={{ width: '300px', borderRight: '1px solid #ddd', paddingRight: '20px' }}>
          <h2 style={{ marginBottom: '15px', fontSize: '18px' }}>{t('courseContents')}</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {course.videos.map(video => (
              <li key={video.id} style={{ marginBottom: '10px' }}>
                <Link 
                  to={`/course/${courseId}?video=${video.id}`}
                  style={{ 
                    display: 'block',
                    padding: '10px', 
                    borderRadius: '4px',
                    textDecoration: 'none',
                    color: currentVideo && currentVideo.id === video.id ? '#fff' : '#333',
                    backgroundColor: currentVideo && currentVideo.id === video.id ? '#4f46e5' : 'transparent'
                  }}
                >
                  {video.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Видеоплеер */}
        <div style={{ flex: 1 }}>
          {currentVideo ? (
            <>
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
              
              <h2 style={{ marginBottom: '10px' }}>{currentVideo.title}</h2>
              <p style={{ color: '#666' }}>{currentVideo.description}</p>
              <div style={{ marginTop: '10px', color: '#888', fontSize: '14px' }}>
                {t('duration')}: {currentVideo.duration}
              </div>
            </>
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
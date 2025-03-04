import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getCourseById, getVideoById, markVideoAsCompleted, getCourseProgress } from '../services/course.service';
import Header from '../components/Layout/Header';
import styles from '../styles/courses.module.css'; // Убедитесь, что этот файл существует
import debug from 'debug';

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
        
        if (courseData && courseData.language !== language) {
          console.log(`Курс доступен только на языке: ${courseData.language}`);
        }
        
        if (courseData && (!videoId || !courseData.videos.find(v => v.id === videoId))) {
          if (courseData.videos.length > 0) {
            setSearchParams({ video: courseData.videos[0].id });
          }
        } else if (videoId && courseData) {
          const videoData = await getVideoById(courseId, videoId, language);
          setCurrentVideo(videoData);
          
          if (currentUser) {
            const progress = await getCourseProgress(currentUser.id, courseId);
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
    console.log("1");
    // process.stdout.write('Отладочная информация\n');
    // process.stderr.write('Ошибка: что-то пошло не так\n');
    if (!isAuthenticated) {
      return;
    }
    console.log(isAuthenticated);
    try {
      await markVideoAsCompleted(currentUser.id, courseId, videoId);
      console.log("ok");
      debugger;
      setCompletedVideos(prev => ({
        ...prev,
        [videoId]: completed
      }));
    } catch (error) {
      console.error('Ошибка при отметке видео:', error);
    }
  };

  if (loading) {
    return <div className={styles.loading}>{t('loading')}</div>;
  }

  if (!course) {
    return <div className={styles.notFound}>Курс не найден</div>;
  }

  return (
    <div>
      <Header />
      
      <div className={styles.coursePageContainer}>
        <div className={styles.courseSidebar}>
          <Link to="/" className={styles.backToCoursesLink}>
            <span>← Назад к курсам</span>
          </Link>
          
          <h2 className={styles.courseTitle}>Основы n8n</h2>
          
          <div>
            {course.videos.map((video, index) => {
              const isCompleted = !!completedVideos[video.id];
              const isActive = currentVideo && currentVideo.id === video.id;
              
              return (
                <div key={video.id} className={styles.videoItemContainer}>
                  <Link 
                    to={`/course/${courseId}?video=${video.id}`}
                    className={`${styles.videoItem} ${isActive ? styles.videoItemActive : ''}`}
                  >
                    <div className={styles.videoIndex}>{index + 1}</div>
                    
                    <div className={styles.videoDetails}>
                      <div className={styles.videoTitleRow}>
                        <h4 className={styles.videoTitle}>{video.title}</h4>
                        <span className={styles.videoDuration}>{video.duration}</span>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={isCompleted} 
                      onChange={(e) => handleMarkAsCompleted(video.id, e.target.checked)}
                      className={styles.videoCheckbox}
                    />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className={styles.videoContent}>
          {currentVideo ? (
            <div>
              <div className={styles.videoWrapper}>
                <iframe
                  src={currentVideo.videoUrl.replace('watch?v=', 'embed/')}
                  title={currentVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className={styles.videoIframe}
                ></iframe>
              </div>
              
              <div className={styles.videoInfo}>
                <h2 className={styles.videoTitle}>{currentVideo.title}</h2>
              </div>
              <p className={styles.videoDescription}>{currentVideo.description}</p>
            </div>
          ) : (
            <div className={styles.selectVideo}>{t('selectVideo')}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursePage;
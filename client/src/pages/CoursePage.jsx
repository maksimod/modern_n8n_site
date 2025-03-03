import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getCourseById, getVideoById, getCourseProgress } from '../services/course.service';
import CourseItem from '../components/Courses/CourseItem';
import VideoPlayer from '../components/Courses/VideoPlayer';
import styles from '../styles/courses.module.css';

const CoursePage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const videoId = searchParams.get('video');
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  
  const [course, setCourse] = useState(null);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch course data
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const courseData = await getCourseById(courseId, language);
        
        if (!courseData) {
          setError('Course not found');
          return;
        }
        
        setCourse(courseData);
        
        // Get user progress for this course
        if (currentUser) {
          const userProgress = getCourseProgress(currentUser, courseId);
          setProgress(userProgress || {});
        }
        
        // If no video is selected, use the first one
        if (!videoId && courseData.videos.length > 0) {
          navigate(`/course/${courseId}?video=${courseData.videos[0].id}`, { replace: true });
        } else if (videoId) {
          const videoData = await getVideoById(courseId, videoId, language);
          setCurrentVideo(videoData);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching course:', err);
        setError('Failed to load course');
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, videoId, language, currentUser, navigate]);

  // Handle video completion
  const handleVideoComplete = (videoId, completed) => {
    setProgress({ ...progress, [videoId]: completed });
  };

  // Find next and previous videos
  const getAdjacentVideos = () => {
    if (!course || !currentVideo) return { prev: null, next: null };
    
    const videoIndex = course.videos.findIndex(v => v.id === currentVideo.id);
    if (videoIndex === -1) return { prev: null, next: null };
    
    const prev = videoIndex > 0 ? course.videos[videoIndex - 1] : null;
    const next = videoIndex < course.videos.length - 1 ? course.videos[videoIndex + 1] : null;
    
    return { prev, next };
  };
  
  const { prev, next } = getAdjacentVideos();

  if (loading) {
    return <div>{t('common.loading')}</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!course) {
    return <div>Course not found</div>;
  }

  return (
    <div>
      <div className={styles.courseHeader}>
        <div className={styles.courseDetails}>
          <h1 className={styles.coursePageTitle}>{course.title}</h1>
          <p className={styles.coursePageDescription}>{course.description}</p>
        </div>
      </div>

      {currentVideo ? (
        <>
          <VideoPlayer 
            course={course} 
            video={currentVideo} 
            isCompleted={progress[currentVideo.id]} 
            onVideoComplete={handleVideoComplete}
          />
          
          {(prev || next) && (
            <div className={styles.videoNavigation}>
              {prev && (
                <a 
                  href={`/course/${courseId}?video=${prev.id}`}
                  className={styles.videoNavItem}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/course/${courseId}?video=${prev.id}`);
                  }}
                >
                  <div className={styles.videoNavType}>{t('Previous')}</div>
                  <div className={styles.videoNavTitle}>{prev.title}</div>
                </a>
              )}
              
              {next && (
                <a 
                  href={`/course/${courseId}?video=${next.id}`}
                  className={styles.videoNavItem}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/course/${courseId}?video=${next.id}`);
                  }}
                >
                  <div className={styles.videoNavType}>{t('Next')}</div>
                  <div className={styles.videoNavTitle}>{next.title}</div>
                </a>
              )}
            </div>
          )}
        </>
      ) : (
        <div>Select a video to start watching</div>
      )}
      
      <CourseItem course={course} currentVideo={currentVideo} />
    </div>
  );
};

export default CoursePage;
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCourses, calculateCourseCompletion } from '../../services/course.service';
import styles from '../../styles/courses.module.css';

const CourseList = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const coursesData = await getCourses(language);
        setCourses(coursesData);
        setError(null);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to load courses');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [language]);

  if (loading) {
    return <div>{t('common.loading')}</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  // Find the next course to continue for the user
  const findNextCourse = () => {
    if (!currentUser || !currentUser.progress) return courses[0];
    
    // First, check for courses in progress
    const courseInProgress = courses.find(course => {
      const completion = calculateCourseCompletion(currentUser, course);
      return completion > 0 && completion < 100;
    });
    
    if (courseInProgress) return courseInProgress;
    
    // If no courses in progress, find the first course not started
    const notStartedCourse = courses.find(course => {
      const completion = calculateCourseCompletion(currentUser, course);
      return completion === 0;
    });
    
    return notStartedCourse || courses[0];
  };

  const nextCourse = findNextCourse();

  return (
    <div>
      <div className={styles.welcomeCard}>
        <h1 className={styles.welcomeTitle}>{t('Welcome to VideoLearn')}</h1>
        <p className={styles.welcomeText}>
          {t('Explore our comprehensive video courses and enhance your skills.')}
        </p>
        
        {nextCourse && (
          <Link 
            to={`/course/${nextCourse.id}`}
            className={styles.courseCardButton}
          >
            {currentUser && currentUser.progress && currentUser.progress[nextCourse.id] 
              ? t('course.continueCourse') 
              : t('course.startCourse')}
          </Link>
        )}
      </div>

      <h2 className={styles.sidebarTitle}>{t('Available Courses')}</h2>
      
      <div className={styles.courseGrid}>
        {courses.map((course) => {
          const completionPercentage = calculateCourseCompletion(currentUser, course);
          
          return (
            <Link key={course.id} to={`/course/${course.id}`} className={styles.courseCard}>
              <div className={styles.courseCardBody}>
                <h3 className={styles.courseCardTitle}>{course.title}</h3>
                <p className={styles.courseCardDescription}>{course.description}</p>
                <div>
                  <span className={styles.courseCardMeta}>
                    {course.videos.length} {t('videos')}
                  </span>
                </div>
              </div>
              
              <div className={styles.courseCardFooter}>
                {completionPercentage > 0 ? (
                  <div className={styles.courseCardProgress}>
                    <div className={styles.progressContainer}>
                      <div 
                        className={styles.progressBar}
                        style={{ width: `${completionPercentage}%` }}
                      ></div>
                    </div>
                    <span className={styles.courseCardProgressText}>
                      {completionPercentage}% {t('course.completed')}
                    </span>
                  </div>
                ) : (
                  <div></div>
                )}
                
                <span className={styles.courseCardButton}>
                  {completionPercentage > 0 
                    ? t('course.continueCourse') 
                    : t('course.startCourse')}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default CourseList;
import React, { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCourses, calculateCourseCompletion } from '../../services/course.service';
import styles from '../../styles/layout.module.css';
import courseStyles from '../../styles/courses.module.css';

const Sidebar = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const { courseId } = useParams();
  const location = useLocation();
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
    return <div className={styles.sidebar}>{t('common.loading')}</div>;
  }

  if (error) {
    return <div className={styles.sidebar}>{error}</div>;
  }

  return (
    <aside className={styles.sidebar}>
      <h2 className={courseStyles.sidebarTitle}>{t('course.courses')}</h2>
      
      <ul className={courseStyles.courseList}>
        {courses.map((course) => {
          const progress = calculateCourseCompletion(currentUser, course);
          const isActive = course.id === courseId;
          
          return (
            <li key={course.id} className={courseStyles.courseItem}>
              <Link
                to={`/course/${course.id}`}
                className={`${courseStyles.courseLink} ${
                  isActive ? courseStyles.activeCourse : ''
                }`}
              >
                <div className={courseStyles.courseInfo}>
                  <h3 className={courseStyles.courseTitle}>{course.title}</h3>
                  <p className={courseStyles.courseDescription}>
                    {course.description}
                  </p>
                  
                  {/* {progress > 0 && (
                    <div className={courseStyles.progressContainer}>
                      <div 
                        className={courseStyles.progressBar}
                        style={{ width: `${progress}%` }}
                      ></div>
                      <span className={courseStyles.progressText}>
                        {progress}% {t('course.completed')}
                      </span>
                    </div>
                  )} */}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};

export default Sidebar;
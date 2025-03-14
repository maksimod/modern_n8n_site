import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { getCourses } from '../services/course.service';
import Header from '../components/Layout/Header';
import styles from '../styles/HomePage.module.css';

const HomePage = () => {
  const { t } = useTranslation();
  const { language, switchLanguage, supportedLanguages } = useLanguage();
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCourses(language);
      setCourses(data);
    } catch (err) {
      console.error('Ошибка загрузки курсов:', err);
      setError('Не удалось загрузить курсы. Пожалуйста, убедитесь, что сервер запущен.');
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleLanguageSwitch = (lang) => {
    if (lang !== language) {
      switchLanguage(lang);
    }
  };

  return (
    <div>
      <Header />
      
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>{t('videoCourses')}</h1>
          <div className={styles.languageSwitcher}>
            {supportedLanguages.map(lang => (
              <button
                key={lang.code}
                onClick={() => handleLanguageSwitch(lang.code)}
                className={`${styles.languageButton} ${language === lang.code ? styles.activeLanguage : ''}`}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingContainer}>
            <p>{t('loading')}</p>
          </div>
        ) : error ? (
          <div className={styles.errorContainer}>
            {error}
          </div>
        ) : courses.length === 0 ? (
          <p className={styles.emptyMessage}>Курсы не найдены. Проверьте, что сервер запущен и работает корректно.</p>
        ) : (
          <div className={styles.courseGrid}>
            {courses.map(course => (
              <Link 
                key={course.id} 
                to={`/course/${course.id}`}
                className={styles.courseCard}
              >
                <h2 className={styles.courseTitle}>{course.title}</h2>
                <p className={styles.courseDescription}>{course.description}</p>
                <div className={styles.courseFooter}>
                  <span className={styles.courseVideosCount}>
                    {course.videos?.length || 0} {t('videos')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
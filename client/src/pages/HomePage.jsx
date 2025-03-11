import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { getCourses } from '../services/course.service';

const HomePage = () => {
  const { t } = useTranslation();
  const { language, switchLanguage, supportedLanguages } = useLanguage();
  const { currentUser, logout, isAdmin } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
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
    };

    fetchCourses();
  }, [language]);

  const handleLogout = () => {
    logout();
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>{t('videoCourses')}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div>
            {supportedLanguages.map(lang => (
              <button
                key={lang.code}
                onClick={() => switchLanguage(lang.code)}
                style={{
                  padding: '8px 16px',
                  marginLeft: '10px',
                  background: language === lang.code ? '#4f46e5' : '#fff',
                  color: language === lang.code ? '#fff' : '#000',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {lang.name}
              </button>
            ))}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>
              {currentUser.username}
            </span>
            
            {/* Display admin link for admin users */}
            {isAdmin && (
              <Link 
                to="/admin"
                style={{
                  padding: '8px 16px',
                  background: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  textDecoration: 'none'
                }}
              >
                {t('admin.dashboard')}
              </Link>
            )}
            
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {t('logout')}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <p>{t('loading')}</p>
      ) : error ? (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#ffe0e0', 
          color: '#d32f2f', 
          borderRadius: '8px',
          marginBottom: '20px' 
        }}>
          {error}
        </div>
      ) : courses.length === 0 ? (
        <p>Курсы не найдены. Проверьте, что сервер запущен и работает корректно.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {courses.map(course => (
            <Link 
              key={course.id} 
              to={`/course/${course.id}`}
              style={{
                padding: '20px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
                background: '#fff'
              }}
            >
              <h2 style={{ marginBottom: '10px', color: '#4f46e5' }}>{course.title}</h2>
              <p style={{ color: '#666' }}>{course.description}</p>
              <div style={{ marginTop: '15px', fontSize: '14px', color: '#888' }}>
                {course.videos?.length || 0} {t('videos')}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default HomePage;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const AuthPage = () => {
  const { t } = useTranslation();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, register, isAuthenticated } = useAuth();
  const { language, switchLanguage, supportedLanguages } = useLanguage();
  const navigate = useNavigate();
  
  // Если пользователь уже авторизован, перенаправляем на главную
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError(t('enterAllFields'));
      return;
    }
    
    if (!isLoginMode && password !== confirmPassword) {
      setError(t('passwordsDontMatch'));
      return;
    }
    
    try {
      setLoading(true);
      if (isLoginMode) {
        await login(username, password);
      } else {
        await register(username, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setError('');
  };
  
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)',
      padding: '1rem'
    }}>
      {/* Кнопки переключения языка */}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        {supportedLanguages.map(lang => (
          <button
            key={lang.code}
            onClick={() => switchLanguage(lang.code)}
            style={{
              padding: '8px 16px',
              marginLeft: '10px',
              background: language === lang.code ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {lang.name}
          </button>
        ))}
      </div>
      
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '2rem 2rem 1rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            {isLoginMode ? t('login') : t('register')}
          </h1>
          <p style={{ color: '#4b5563' }}>
            {isLoginMode ? t('enterYourData') : t('createAccount')}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem 2rem 2rem' }}>
          {error && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              padding: '0.75rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label 
              htmlFor="username" 
              style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
            >
              {t('username')}
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                transition: 'border-color 0.2s'
              }}
            />
          </div>
          
          <div style={{ marginBottom: isLoginMode ? '1.5rem' : '1rem' }}>
            <label 
              htmlFor="password" 
              style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
            >
              {t('password')}
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                transition: 'border-color 0.2s'
              }}
            />
          </div>
          
          {!isLoginMode && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label 
                htmlFor="confirmPassword" 
                style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
              >
                {t('confirmPassword')}
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                fontWeight: 500,
                backgroundColor: '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading 
                ? t('loading')
                : isLoginMode ? t('login') : t('register')}
            </button>
            
            <div style={{ color: '#4b5563', fontSize: '0.875rem' }}>
              {isLoginMode ? t('noAccount') : t('hasAccount')}
              <span 
                onClick={toggleMode}
                style={{
                  color: '#4f46e5',
                  cursor: 'pointer',
                  marginLeft: '0.25rem',
                  fontWeight: 500
                }}
              >
                {isLoginMode ? t('register') : t('login')}
              </span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
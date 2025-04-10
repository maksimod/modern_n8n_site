// client/src/pages/AuthPage.jsx
// Модифицированный компонент для поддержки информирования пользователя об отозванном доступе
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import styles from '../styles/AuthPage.module.css';

const AuthPage = () => {
  const { t } = useTranslation();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [accessRevokedMessage, setAccessRevokedMessage] = useState(''); // Новое состояние
  const [loading, setLoading] = useState(false);
  
  const { login, register, isAuthenticated, accessRevoked } = useAuth();
  const { language, switchLanguage, supportedLanguages } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Получаем URL для перенаправления из query params
  const getRedirectUrl = () => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('redirect') || '/';
  };
  
  // Проверяем параметр revoked в URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const isRevoked = searchParams.get('revoked') === 'true';
    
    if (isRevoked || accessRevoked) {
      setAccessRevokedMessage(t('Ваш доступ был отозван. Пожалуйста, обратитесь к администратору.'));
    }
  }, [location.search, accessRevoked, t]);
  
  // Если пользователь уже авторизован, перенаправляем
  useEffect(() => {
    if (isAuthenticated) {
      const redirectUrl = getRedirectUrl();
      navigate(redirectUrl);
    }
  }, [isAuthenticated, navigate, location]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setAccessRevokedMessage('');
    
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
      
      // Перенаправляем пользователя после авторизации
      const redirectUrl = getRedirectUrl();
      navigate(redirectUrl);
    } catch (err) {
      // Проверяем специфические ошибки доступа
      if (err.message.includes('access has been revoked') || err.message.includes('restricted to trusted users')) {
        setAccessRevokedMessage(err.message);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setError('');
    setAccessRevokedMessage('');
  };
  
  return (
    <div className={styles.authPageContainer}>
      <div className={styles.languageSwitcher}>
        {supportedLanguages.map(lang => (
          <button
            key={lang.code}
            onClick={() => switchLanguage(lang.code)}
            className={`${styles.languageButton} ${language === lang.code ? styles.activeLanguage : ''}`}
          >
            {lang.name}
          </button>
        ))}
      </div>
      
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>
            {isLoginMode ? t('login') : t('register')}
          </h1>
          <p className={styles.authSubtitle}>
            {isLoginMode ? t('enterYourData') : t('createAccount')}
          </p>
        </div>
        
        <form className={styles.authForm} onSubmit={handleSubmit}>
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}
          
          {/* Новый блок для отображения сообщения об отозванном доступе */}
          {accessRevokedMessage && (
            <div className={`${styles.errorMessage} ${styles.revokedMessage}`}>
              <strong>{t('Внимание!')} </strong>
              {accessRevokedMessage}
              <p className={styles.revokedHint}>
                {t('Если вы считаете, что это ошибка, обратитесь к администратору системы.')}
              </p>
            </div>
          )}
          
          <div className={styles.inputGroup}>
            <label htmlFor="username" className={styles.inputLabel}>
              {t('username')}
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={styles.input}
              disabled={loading}
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.inputLabel}>
              {t('password')}
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              disabled={loading}
            />
          </div>
          
          {!isLoginMode && (
            <div className={styles.inputGroup}>
              <label htmlFor="confirmPassword" className={styles.inputLabel}>
                {t('confirmPassword')}
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.input}
                disabled={loading}
              />
            </div>
          )}
          
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading 
              ? t('loading')
              : isLoginMode ? t('login') : t('register')}
          </button>
          
          <div className={styles.toggleMode}>
            {isLoginMode ? t('noAccount') : t('hasAccount')}
            <span 
              onClick={toggleMode}
              className={styles.toggleLink}
            >
              {isLoginMode ? t('register') : t('login')}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
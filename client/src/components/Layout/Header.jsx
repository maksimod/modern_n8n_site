// client/src/components/Layout/Header.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import styles from '../../styles/layout.module.css';

const Header = () => {
  const { t } = useTranslation();
  const { currentUser, logout, isAdmin } = useAuth();
  const { language, switchLanguage, supportedLanguages } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Получить первую букву имени пользователя для аватара
  const getInitial = (name) => name ? name.charAt(0).toUpperCase() : '';

  // Если пользователь не авторизован, показываем только логотип
  if (!currentUser) {
    return (
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          <span>VideoLearn</span>
        </Link>
      </header>
    );
  }

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo}>
        <span>VideoLearn</span>
      </Link>

      <div className={styles.navList}>
        <div className={styles.userMenu}>
          {/* Ссылка на админ-панель для администраторов */}
          {isAdmin && (
            <Link to="/admin" className={styles.adminLink}>
              {t('admin.dashboard')}
            </Link>
          )}
        
          <button 
            className={styles.userButton} 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
          >
            <div className={styles.userAvatar}>
              {getInitial(currentUser.username)}
            </div>
            <span className={styles.userName}>{currentUser.username}</span>
          </button>

          {dropdownOpen && (
            <div className={styles.dropdown}>
              {/* Ссылка на админ-панель в выпадающем меню */}
              {isAdmin && (
                <Link 
                  to="/admin" 
                  className={styles.dropdownItem}
                  onClick={() => setDropdownOpen(false)}
                >
                  {t('admin.dashboard')}
                </Link>
              )}
            
              <button 
                className={styles.dropdownItem} 
                onClick={() => {
                  logout();
                  setDropdownOpen(false);
                }}
              >
                {t('logout')}
              </button>
              
              <div className={styles.languages}>
                {supportedLanguages.map(lang => (
                  <button
                    key={lang.code}
                    className={`${styles.languageButton} ${
                      language === lang.code ? styles.activeLanguage : ''
                    }`}
                    onClick={() => {
                      switchLanguage(lang.code);
                      setDropdownOpen(false);
                    }}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
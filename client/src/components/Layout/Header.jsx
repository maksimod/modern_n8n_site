import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import styles from '../../styles/layout.module.css';

const Header = () => {
  const { t } = useTranslation();
  const { currentUser, logout } = useAuth();
  const { language, switchLanguage, supportedLanguages } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);
  const closeDropdown = () => setDropdownOpen(false);

  const handleLogout = () => {
    logout();
    closeDropdown();
  };

  const handleLanguageChange = (lang) => {
    switchLanguage(lang);
    closeDropdown();
  };

  // Get first letter of username for avatar
  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : '';
  };

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo}>
        <span>VideoLearn</span>
      </Link>

      <nav>
        <ul className={styles.navList}>
          <li className={styles.navItem}>
            <Link to="/" className={styles.navLink}>
              {t('nav.home')}
            </Link>
          </li>

          {currentUser && (
            <li className={styles.userMenu}>
              <button 
                className={styles.userButton} 
                onClick={toggleDropdown}
                aria-expanded={dropdownOpen}
              >
                <div className={styles.userAvatar}>
                  {getInitial(currentUser.username)}
                </div>
                <span className={styles.userName}>{currentUser.username}</span>
              </button>

              {dropdownOpen && (
                <div className={styles.dropdown}>
                  <button className={styles.dropdownItem} onClick={handleLogout}>
                    {t('nav.logout')}
                  </button>
                  
                  <div className={styles.languages}>
                    {supportedLanguages.map((lang) => (
                      <button
                        key={lang.code}
                        className={`${styles.languageButton} ${
                          language === lang.code ? styles.activeLanguage : ''
                        }`}
                        onClick={() => handleLanguageChange(lang.code)}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
};

export default Header;
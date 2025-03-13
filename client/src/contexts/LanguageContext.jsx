// client/src/contexts/LanguageContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../config';

const LanguageContext = createContext(null);

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState(() => 
    localStorage.getItem('language') || 'ru'
  );

  // Эффект для загрузки языка при инициализации
  useEffect(() => {
    // Проверяем URL для параметра lang
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    
    if (urlLang && SUPPORTED_LANGUAGES.some(l => l.code === urlLang)) {
      // Устанавливаем язык из URL
      handleLanguageChange(urlLang);
    } else {
      // Инициализируем текущий язык
      i18n.changeLanguage(language);
    }
  }, []);

  // Функция смены языка
  const handleLanguageChange = (lang) => {
    // Устанавливаем язык в i18n
    i18n.changeLanguage(lang);
    
    // Обновляем состояние
    setLanguage(lang);
    
    // Сохраняем в localStorage
    localStorage.setItem('language', lang);
    
    // Обновляем URL без перезагрузки
    const url = new URL(window.location.href);
    url.searchParams.set('lang', lang);
    window.history.pushState({}, '', url);
  };

  return (
    <LanguageContext.Provider value={{
      language,
      switchLanguage: handleLanguageChange,
      supportedLanguages: SUPPORTED_LANGUAGES
    }}>
      {children}
    </LanguageContext.Provider>
  );
};
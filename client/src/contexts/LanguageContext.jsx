import React, { createContext, useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext(null);

export const useLanguage = () => {
  return useContext(LanguageContext);
};

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState('ru');

  useEffect(() => {
    // Проверяем URL для параметра lang
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    
    if (urlLang && ['ru', 'en'].includes(urlLang)) {
      // Устанавливаем язык из URL
      setLanguage(urlLang);
      i18n.changeLanguage(urlLang);
      localStorage.setItem('language', urlLang);
    } else {
      // Используем сохраненный язык
      const savedLang = localStorage.getItem('language') || 'ru';
      setLanguage(savedLang);
      i18n.changeLanguage(savedLang);
    }
  }, [i18n]);

  const switchLanguage = (lang) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    
    // Добавляем параметр к URL
    const url = new URL(window.location.href);
    url.searchParams.set('lang', lang);
    window.history.pushState({}, '', url);
  };

  const value = {
    language,
    switchLanguage,
    supportedLanguages: [
      { code: 'ru', name: 'Русский' },
      { code: 'en', name: 'English' }
    ]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
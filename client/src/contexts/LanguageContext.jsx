import React, { createContext, useState, useContext } from 'react';

const LanguageContext = createContext(null);

export const useLanguage = () => {
  return useContext(LanguageContext);
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'ru';
  });

  const switchLanguage = (lang) => {
    setLanguage(lang);
    i18n.changeLanguage(lang); // Эта строка обязательна!
    localStorage.setItem('language', lang);
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
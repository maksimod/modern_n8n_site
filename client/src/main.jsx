import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/global.css'
import './utils/i18n.js' // Важно: добавьте этот импорт!

// Защита от бесконечной рекурсии iframe
// Если страница загружена в iframe, и есть признаки, что это может быть рекурсия,
// то показываем простое сообщение вместо полного приложения
if (window.self !== window.top && window.location.href.includes('course/')) {
  const container = document.getElementById('root');
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 20px; text-align: center; font-family: Arial, sans-serif;">
      <p style="font-size: 16px; color: #333;">Ошибка загрузки. Страница недоступна во фрейме.</p>
    </div>
  `;
} else {
  // Нормальная загрузка приложения
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
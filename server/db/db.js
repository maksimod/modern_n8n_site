// server/db/db.js
const { Pool } = require('pg');

// Настройки кодировки для преобразования текста
process.env.PGCLIENTENCODING = 'UTF8';

// Получение конфигурации из переменных окружения
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Добавьте функцию для обработки кириллицы
const fixEncoding = (text) => {
  if (typeof text !== 'string') return text;
  return text.replace(/\uFFFD/g, ''); // Удаление некорректных символов
};

// Доработка функции запроса для обработки результатов
const query = async (text, params) => {
  const result = await pool.query(text, params);
  
  // Обработка результатов для исправления кодировки
  if (result.rows && result.rows.length > 0) {
    result.rows = result.rows.map(row => {
      const fixedRow = {};
      for (const key in row) {
        fixedRow[key] = fixEncoding(row[key]);
      }
      return fixedRow;
    });
  }
  
  return result;
};

module.exports = {
  query,
  pool
};
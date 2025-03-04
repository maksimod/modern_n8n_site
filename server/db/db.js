// server/db/db.js
const { Pool } = require('pg');

// Создаем пул соединений с базой данных
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'videocourses',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
  // Явно указываем кодировку
  options: "-c client_encoding=UTF8"
});

// Простая обертка для выполнения запросов
const query = async (text, params) => {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (error) {
    console.error('Ошибка выполнения запроса:', error);
    throw error;
  }
};

module.exports = {
  query,
  pool
};
const { Pool } = require('pg');
require('dotenv').config();

// Проверка обязательных переменных окружения
const requiredEnvVars = ['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASSWORD'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Необходимо задать переменную окружения: ${envVar}`);
  }
}

// Конфигурация пула соединений
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Обертка для выполнения запросов
const query = async (text, params) => {
  try {
    const start = Date.now(); // Для отладки
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Выполнен запрос:', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Ошибка выполнения запроса:', { 
      text, 
      params, 
      message: error.message 
    });
    throw error;
  }
};

// Экспорт
module.exports = {
  query,
  pool,
};
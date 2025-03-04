// server/init-db.js
const { Pool } = require('pg');
require('dotenv').config();

async function initDatabase() {
  console.log('Начинаем инициализацию базы данных...');
  
  // Подключаемся к системной базе postgres
  const systemPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'postgres', // Подключаемся к postgres для создания новой БД
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
  });
  
  try {
    console.log('Удаляем базу данных, если она существует...');
    await systemPool.query('DROP DATABASE IF EXISTS videocourses');
    
    console.log('Создаем новую базу данных с UTF-8 кодировкой...');
    await systemPool.query(`CREATE DATABASE videocourses 
                          WITH ENCODING 'UTF8' 
                          TEMPLATE template0`);
    
    console.log('База данных успешно создана!');
    await systemPool.end();
    
    // Подключаемся к новой базе данных
    const dbPool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: 'videocourses',
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT
    });
    
    console.log('Создаем таблицы и заполняем их данными...');
    
    // Создаем таблицы
    await dbPool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Таблица users создана');
    
    await dbPool.query(`
      CREATE TABLE courses (
        id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        language VARCHAR(10) NOT NULL DEFAULT 'ru',
        PRIMARY KEY (id, language)
      );
    `);
    console.log('Таблица courses создана');
    
    // Создаем таблицу videos с полем language
    await dbPool.query(`
        CREATE TABLE videos (
          id VARCHAR(255) NOT NULL,
          course_id VARCHAR(255) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          duration VARCHAR(50),
          video_url TEXT,
          is_private BOOLEAN DEFAULT FALSE,
          order_index INTEGER NOT NULL,
          language VARCHAR(10) NOT NULL DEFAULT 'ru',
          PRIMARY KEY (id, language)
        );
      `);
      console.log('Таблица videos создана');
    
    console.log('База данных успешно инициализирована!');
    await dbPool.end();
    
  } catch (error) {
    console.error('Ошибка при инициализации базы данных:', error);
  }
}

initDatabase();
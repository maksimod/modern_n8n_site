// server/init-db.js
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function initDatabase() {
  console.log('Начинаем инициализацию базы данных...');
  
  // Подключаемся к системной базе postgres
  const systemPool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'postgres', // Подключаемся к postgres для создания новой БД
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432
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
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: 'videocourses',
      password: process.env.DB_PASSWORD || 'postgres',
      port: process.env.DB_PORT || 5432
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
    
    await dbPool.query(`
      CREATE TABLE user_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        course_id VARCHAR(255) NOT NULL,
        video_id VARCHAR(255) NOT NULL,
        language VARCHAR(10) NOT NULL DEFAULT 'ru',
        is_completed BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id, language) REFERENCES videos(id, language),
        UNIQUE(user_id, course_id, video_id, language)
      );
    `);
    console.log('Таблица user_progress создана');
    
    // Вставка демо-данных
    console.log('Вставляем демо-данные...');
    
    // Курсы на русском и английском языке
    await dbPool.query(`
      INSERT INTO courses (id, title, description, language) VALUES 
      ('n8n-basics', 'Основы n8n', 'Изучите основы n8n', 'ru'),
      ('n8n-basics', 'The basics of n8n', 'Learn the basics of n8n', 'en'),
      ('react-basics', 'React Basics', 'Learn the fundamentals of React library', 'en'),
      ('nodejs-basics', 'Node.js Basics', 'Learn the fundamentals of server-side development with Node.js', 'en');
    `);
    console.log('Курсы добавлены');
    
    // Вставка видео для русской версии
    await dbPool.query(`
        INSERT INTO videos (id, course_id, title, description, duration, video_url, is_private, order_index, language) VALUES
        ('n8n-interface', 'n8n-basics', 'Интерфейс', 'Обзор интерфейса n8n', '12:25', 'https://www.youtube.com/watch?v=1gyb8gt2VnU', FALSE, 0, 'ru'),
        ('n8n-triggers', 'n8n-basics', 'Триггеры', 'Использование триггеров в n8n', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 1, 'ru'),
        ('n8n-action-in-app', 'n8n-basics', 'Узлы «Action in app»', 'Работа с Action in app', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 2, 'ru'),
        ('n8n-credentials', 'n8n-basics', 'Credentials', 'Настройка учетных данных', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 3, 'ru'),
        ('n8n-data-transformation', 'n8n-basics', 'Узлы «Data transformation»', 'Преобразование данных', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 4, 'ru'),
        ('n8n-flow', 'n8n-basics', 'Узлы «Flow»', 'Управление потоком данных', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 5, 'ru'),
        ('n8n-core', 'n8n-basics', 'Узлы "Core"', 'Базовые узлы Core', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 6, 'ru'),
        ('n8n-json', 'n8n-basics', 'JSON', 'Работа с JSON форматом', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 7, 'ru'),
        ('n8n-work-with-data', 'n8n-basics', 'Работа с данными', 'Продвинутые методы работы с данными', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 8, 'ru'),
        ('n8n-postgres', 'n8n-basics', 'Postgres', 'Интеграция с PostgreSQL', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 9, 'ru'),
        ('n8n-google-cloud-console', 'n8n-basics', 'Google cloud console', 'Подключение к Google Cloud', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 10, 'ru'),
        ('n8n-google-sheets', 'n8n-basics', 'Google sheets', 'Работа с Google Sheets', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 11, 'ru'),
        ('n8n-google-drive', 'n8n-basics', 'Google drive', 'Интеграция с Google Drive', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 12, 'ru'),
        ('n8n-practice-easy', 'n8n-basics', 'Практика: простой workflow', 'Создание простого рабочего процесса', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 13, 'ru'),
        ('n8n-telegram-trigger', 'n8n-basics', 'Практика: Telegram Trigger', 'Настройка Telegram триггера', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 14, 'ru'),
        ('n8n-telegram-bot', 'n8n-basics', 'Практика: телеграм бот', 'Создание телеграм бота', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 15, 'ru'),
        ('n8n-practice-hard', 'n8n-basics', 'Практика: сложный workflow', 'Создание продвинутого рабочего процесса', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 16, 'ru')
      `);
      
      // Вставка видео для английской версии
      await dbPool.query(`
        INSERT INTO videos (id, course_id, title, description, duration, video_url, is_private, order_index, language) VALUES
        ('n8n-interface', 'n8n-basics', 'Interface', 'Overview of n8n interface', '12:25', 'https://www.youtube.com/watch?v=ypJT_r_GSSM', FALSE, 0, 'en'),
        ('n8n-triggers', 'n8n-basics', 'Triggers', 'Using triggers in n8n', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 1, 'en'),
        ('n8n-action-in-app', 'n8n-basics', 'Action in app nodes', 'Working with Action in app', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 2, 'en'),
        ('n8n-credentials', 'n8n-basics', 'Credentials', 'Setting up credentials', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 3, 'en'),
        ('n8n-data-transformation', 'n8n-basics', 'Data transformation nodes', 'Data transformations', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 4, 'en'),
        ('n8n-flow', 'n8n-basics', 'Flow nodes', 'Managing data flow', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 5, 'en'),
        ('n8n-core', 'n8n-basics', 'Core nodes', 'Basic Core nodes', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 6, 'en'),
        ('n8n-json', 'n8n-basics', 'JSON', 'Working with JSON format', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 7, 'en'),
        ('n8n-work-with-data', 'n8n-basics', 'Working with data', 'Advanced data processing methods', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 8, 'en'),
        ('n8n-postgres', 'n8n-basics', 'Postgres', 'PostgreSQL integration', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 9, 'en'),
        ('n8n-google-cloud-console', 'n8n-basics', 'Google cloud console', 'Connecting to Google Cloud', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 10, 'en'),
        ('n8n-google-sheets', 'n8n-basics', 'Google sheets', 'Working with Google Sheets', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 11, 'en'),
        ('n8n-google-drive', 'n8n-basics', 'Google drive', 'Google Drive integration', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 12, 'en'),
        ('n8n-practice-easy', 'n8n-basics', 'Practice: simple workflow', 'Creating a simple workflow', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 13, 'en'),
        ('n8n-telegram-trigger', 'n8n-basics', 'Practice: Telegram Trigger', 'Setting up Telegram Trigger', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 14, 'en'),
        ('n8n-telegram-bot', 'n8n-basics', 'Practice: telegram bot', 'Creating a telegram bot', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 15, 'en'),
        ('n8n-practice-hard', 'n8n-basics', 'Practice: complex workflow', 'Creating an advanced workflow', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 16, 'en'),
        
        ('react-intro', 'react-basics', 'Introduction to React', 'What is React and why use it', '8:20', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 0, 'en'),
        ('react-components', 'react-basics', 'React Components', 'Creating and using components', '14:10', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', TRUE, 1, 'en'),
        ('react-hooks', 'react-basics', 'React Hooks', 'Using hooks for state management', '18:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', TRUE, 2, 'en'),
        
        ('nodejs-intro', 'nodejs-basics', 'Introduction to Node.js', 'What is Node.js and how it works', '9:45', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 0, 'en'),
        ('express-basics', 'nodejs-basics', 'Express Basics', 'Building server applications with Express', '16:20', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', TRUE, 1, 'en')
      `);
      console.log('Видео добавлены для русского и английского языков');
    
    console.log('База данных успешно инициализирована!');
    await dbPool.end();
    
  } catch (error) {
    console.error('Ошибка при инициализации базы данных:', error);
  }
}

initDatabase();
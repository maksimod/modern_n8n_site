-- Удаление базы данных, если существует
DROP DATABASE IF EXISTS videocourses;

-- Создание базы данных с явным указанием кодировки UTF-8
CREATE DATABASE videocourses WITH ENCODING 'UTF8' LC_COLLATE 'ru_RU.UTF-8' LC_CTYPE 'ru_RU.UTF-8';

-- Подключение к базе данных
\c videocourses

-- Создание таблицы пользователей
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы курсов
CREATE TABLE courses (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  language VARCHAR(10) NOT NULL DEFAULT 'ru'
);

-- Создание таблицы видео
CREATE TABLE videos (
  id VARCHAR(255) PRIMARY KEY,
  course_id VARCHAR(255) REFERENCES courses(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration VARCHAR(50),
  video_url TEXT,
  is_private BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL
);

-- Создание таблицы прогресса пользователей
CREATE TABLE user_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  course_id VARCHAR(255) REFERENCES courses(id),
  video_id VARCHAR(255) REFERENCES videos(id),
  is_completed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, course_id, video_id)
);

-- Добавление тестовых пользователей
INSERT INTO users (username, password) VALUES
('admin', '$2a$10$rTwSMv1lSMgxGZfT3yOtte/NzmdpZ1QvJaXySpO0nQz95TcF2U2Ga'); -- пароль 'admin'
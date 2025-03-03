-- Создание базы данных
CREATE DATABASE videocourses;

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

-- Вставка демо-данных для курса на русском языке
INSERT INTO courses (id, title, description, language) VALUES 
('n8n-basics', 'Основы n8n', 'Изучите основы n8n', 'ru');

-- Вставка демо-данных для курса на английском языке
INSERT INTO courses (id, title, description, language) VALUES 
('n8n-basics', 'The basics of n8n', 'Learn the basics of n8n', 'en');

-- Вставка демо-данных для видео (русский язык)
INSERT INTO videos (id, course_id, title, description, duration, video_url, is_private, order_index) VALUES
('n8n-interface', 'n8n-basics', 'Интерфейс', '', '12:25', 'https://www.youtube.com/watch?v=ypJT_r_GSSM', FALSE, 0),
('n8n-triggers', 'n8n-basics', 'Триггеры', '', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 1),
('n8n-action-in-app', 'n8n-basics', 'Узлы «Action in app»', '', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 2),
('n8n-credentials', 'n8n-basics', 'Credentials', '', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 3),
('n8n-data-transformation', 'n8n-basics', 'Узлы «Data transformation»', '', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 4),
('n8n-flow', 'n8n-basics', 'Узлы «Flow»', '', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 5),
('n8n-core', 'n8n-basics', 'Узлы "Core"', '', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 6),
('n8n-json', 'n8n-basics', 'JSON', '', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 7),
('n8n-work-with-data', 'n8n-basics', 'Работа с данными', '', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 8),
('n8n-postgres', 'n8n-basics', 'Postgres', '', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 9),
('n8n-google-cloud-console', 'n8n-basics', 'Google cloud console', '', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 10),
('n8n-google-sheets', 'n8n-basics', 'Google sheets', '', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 11),
('n8n-google-drive', 'n8n-basics', 'Google drive', '', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 12),
('n8n-practice-easy', 'n8n-basics', 'Практика: простой workflow', '', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 13),
('n8n-telegram-trigger', 'n8n-basics', 'Практика: Telegram Trigger', '', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 14),
('n8n-telegram-bot', 'n8n-basics', 'Практика: телеграм бот', '', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 15),
('n8n-practice-hard', 'n8n-basics', 'Практика: сложный workflow', '', '12:30', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', FALSE, 16);

-- Создание админ пользователя
INSERT INTO users (username, password) VALUES
('admin', '$2a$10$rTwSMv1lSMgxGZfT3yOtte/NzmdpZ1QvJaXySpO0nQz95TcF2U2Ga'); -- пароль 'admin'
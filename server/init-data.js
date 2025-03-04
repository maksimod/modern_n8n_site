// server/init-data.js
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Пути к файлам данных
const DATA_DIR = path.join(__dirname, 'data/db');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const COURSES_FILE = path.join(DATA_DIR, 'courses.json');
const PROGRESS_FILE = path.join(DATA_DIR, 'progress.json');

// Пример данных для инициализации
const initialUsers = [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$rTwSMv1lSMgxGZfT3yOtte/NzmdpZ1QvJaXySpO0nQz95TcF2U2Ga', // 'admin'
    created_at: new Date().toISOString()
  }
];

const initialProgress = [];

// Функция инициализации данных
async function initData() {
  console.log('Начинаем инициализацию базы данных...');
  
  // Создаем директории, если не существуют
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`Создана директория ${DATA_DIR}`);
  }
  
  // Создаем директорию для видео, если не существует
  const videosDir = path.join(__dirname, 'data/videos');
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
    console.log(`Создана директория ${videosDir}`);
  }
  
  // Сохраняем данные в файлы
  fs.writeFileSync(USERS_FILE, JSON.stringify(initialUsers, null, 2));
  console.log(`Данные пользователей сохранены в ${USERS_FILE}`);
  
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(initialProgress, null, 2));
  console.log(`Данные прогресса сохранены в ${PROGRESS_FILE}`);
  
  // Создаем пример пустых файлов для локальных видео
  const sampleVideoFile = path.join(videosDir, 'n8n-interface.mp4');
  if (!fs.existsSync(sampleVideoFile)) {
    // Создаем пустой файл
    fs.writeFileSync(sampleVideoFile, '');
    console.log(`Создан пример файла видео: ${sampleVideoFile}`);
  }
  
  const sampleVideoFileEn = path.join(videosDir, 'n8n-interface-en.mp4');
  if (!fs.existsSync(sampleVideoFileEn)) {
    // Создаем пустой файл
    fs.writeFileSync(sampleVideoFileEn, '');
    console.log(`Создан пример файла видео: ${sampleVideoFileEn}`);
  }
  
  console.log('Инициализация данных завершена успешно!');
}

// Запускаем инициализацию, если файл запущен напрямую
if (require.main === module) {
  initData().catch(console.error);
}

module.exports = { initData };
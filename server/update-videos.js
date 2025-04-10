/**
 * Скрипт для обновления данных видео
 * Добавляет поле storagePath для всех существующих видео с локальными файлами
 */

const fs = require('fs');
const path = require('path');
const { VIDEO_TYPES, STORAGE_CONFIG } = require('./config');

// Путь к файлу с курсами
const COURSES_FILE = path.join(__dirname, './data/db/courses.json');

// Загрузка данных курсов
function loadCourses() {
  try {
    if (!fs.existsSync(COURSES_FILE)) {
      console.error('Файл с курсами не найден:', COURSES_FILE);
      return [];
    }
    
    const data = fs.readFileSync(COURSES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Ошибка чтения файла курсов:', error);
    return [];
  }
}

// Сохранение данных курсов
function saveCourses(courses) {
  try {
    const dataDir = path.dirname(COURSES_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(COURSES_FILE, JSON.stringify(courses, null, 2));
    return true;
  } catch (error) {
    console.error('Ошибка сохранения файла курсов:', error);
    return false;
  }
}

// Основная функция обновления
function updateVideos() {
  console.log('Начинаем обновление данных видео...');
  console.log('Конфигурация хранилища:', STORAGE_CONFIG);
  
  // Загружаем курсы
  const courses = loadCourses();
  
  if (!courses.length) {
    console.log('Курсы не найдены. Выход...');
    return;
  }
  
  console.log(`Найдено ${courses.length} курсов`);
  
  let totalVideos = 0;
  let updatedVideos = 0;
  
  // Обрабатываем каждый курс
  courses.forEach(course => {
    if (!course.videos || !Array.isArray(course.videos)) {
      console.log(`Курс ${course.id} не содержит видео`);
      return;
    }
    
    console.log(`Обрабатываем курс: ${course.id} (${course.title}), видео: ${course.videos.length}`);
    
    // Обрабатываем каждое видео в курсе
    course.videos.forEach(video => {
      totalVideos++;
      
      // Проверяем, требуется ли обновление
      if (video.localVideo && !video.storagePath && STORAGE_CONFIG.USE_REMOTE_STORAGE) {
        console.log(`Обновляем видео ${video.id}: ${video.title}`);
        
        // Копируем значение localVideo в storagePath
        video.storagePath = video.localVideo;
        video.videoType = VIDEO_TYPES.STORAGE;
        
        updatedVideos++;
      }
      
      // Если не задан тип видео, устанавливаем его
      if (!video.videoType) {
        if (video.storagePath && STORAGE_CONFIG.USE_REMOTE_STORAGE) {
          video.videoType = VIDEO_TYPES.STORAGE;
        } else if (video.localVideo || video.storagePath) {
          video.videoType = VIDEO_TYPES.LOCAL;
        } else if (video.videoUrl) {
          video.videoType = VIDEO_TYPES.EXTERNAL;
        } else {
          video.videoType = VIDEO_TYPES.TEXT;
        }
        
        console.log(`Установлен тип видео ${video.id}: ${video.videoType}`);
        updatedVideos++;
      }
    });
  });
  
  // Сохраняем обновленные данные
  if (updatedVideos > 0) {
    const saved = saveCourses(courses);
    if (saved) {
      console.log(`Обновление завершено. Обновлено ${updatedVideos} из ${totalVideos} видео.`);
    } else {
      console.error('Ошибка при сохранении обновленных данных!');
    }
  } else {
    console.log(`Обновление не требуется. Проверено ${totalVideos} видео.`);
  }
}

// Запуск обновления
updateVideos(); 
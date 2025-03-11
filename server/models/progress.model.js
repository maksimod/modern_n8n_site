// server/models/progress.model.js
const fs = require('fs');
const path = require('path');

const PROGRESS_FILE = path.join(__dirname, '../data/db/user_progress.json');

const progressModel = {
  saveProgress: (userId, courseId, videoId, isCompleted) => {
    try {
      console.log('Saving progress:', { userId, courseId, videoId, isCompleted });
      
      let progress = {};
      
      // Создаем директорию, если не существует
      const dir = path.dirname(PROGRESS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Читаем существующий прогресс
      if (fs.existsSync(PROGRESS_FILE)) {
        try {
          progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
        } catch (parseError) {
          console.error('Error parsing progress file:', parseError);
          progress = {};
        }
      }

      // Создаем структуру, если не существует
      if (!progress[userId]) {
        progress[userId] = {};
      }
      if (!progress[userId][courseId]) {
        progress[userId][courseId] = {};
      }

      // Сохраняем статус видео
      progress[userId][courseId][videoId] = isCompleted;

      // Записываем обратно в файл
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
      
      console.log('Progress saved successfully');
      return true;
    } catch (error) {
      console.error('Error in saveProgress:', error);
      return false;
    }
  },

  getProgress: (userId, courseId) => {
    try {
      console.log('Getting progress:', { userId, courseId });
      
      if (!fs.existsSync(PROGRESS_FILE)) {
        console.log('Progress file does not exist');
        return {};
      }

      const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      const userProgress = progress[userId]?.[courseId] || {};
      
      console.log('Retrieved progress:', userProgress);
      return userProgress;
    } catch (error) {
      console.error('Error in getProgress:', error);
      return {};
    }
  }
};

module.exports = progressModel;
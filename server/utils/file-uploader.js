const fs = require('fs');
const path = require('path');
const { VIDEO_TYPES } = require('../config');

/**
 * Загружает файл в локальное хранилище
 * @param {string} tempFilePath Путь к временному файлу
 * @param {string} fileName Имя файла
 * @param {string} originalName Оригинальное имя файла
 * @param {number} fileSize Размер файла
 * @returns {Promise<Object>} Результат загрузки
 */
async function uploadFileToStorage(tempFilePath, fileName, originalName, fileSize) {
  console.log(`[LOCAL STORAGE] Starting file upload: ${fileName}`);
  
  // Проверяем существование временного файла
  if (!fs.existsSync(tempFilePath)) {
    console.error(`Temporary file does not exist: ${tempFilePath}`);
    throw new Error(`Temporary file not found: ${tempFilePath}`);
  }
  
  // Создаем каталог для видео, если не существует
  const videosDir = path.join(__dirname, '../data/videos');
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
    console.log(`Created video directory: ${videosDir}`);
  }
  
  // Копируем файл в директорию видео
  const localVideoPath = path.join(videosDir, fileName);
  
  try {
    fs.copyFileSync(tempFilePath, localVideoPath);
    console.log(`File copied to videos directory: ${localVideoPath}`);
    
    // Проверяем, что файл был успешно скопирован
    if (!fs.existsSync(localVideoPath)) {
      throw new Error(`Failed to copy file to videos directory`);
    }
    
    // Удаляем временный файл после копирования
    try {
      fs.unlinkSync(tempFilePath);
      console.log(`Temporary file deleted: ${tempFilePath}`);
    } catch (err) {
      console.error(`Non-critical error deleting temporary file: ${tempFilePath}`, err);
    }
    
    // Возвращаем информацию об успешной загрузке
    return {
      success: true,
      message: 'File uploaded successfully to local storage',
      filePath: fileName,
      originalName: originalName,
      size: fileSize,
      videoType: VIDEO_TYPES.LOCAL
    };
  } catch (error) {
    console.error('Error during file upload:', error);
    
    // Пытаемся удалить временный файл в случае ошибки
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (e) {
      console.error(`Error cleaning up temp file: ${tempFilePath}`, e);
    }
    
    throw error;
  }
}

module.exports = {
  uploadFileToStorage
}; 
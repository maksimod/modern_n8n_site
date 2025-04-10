const fs = require('fs');
const path = require('path');
const { VIDEO_TYPES, STORAGE_CONFIG } = require('../config');
const axios = require('axios');
const FormData = require('form-data');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Загружает файл в хранилище (локальное или удаленное)
 * @param {string} tempFilePath Путь к временному файлу
 * @param {string} fileName Имя файла
 * @param {string} originalName Оригинальное имя файла
 * @param {number} fileSize Размер файла
 * @returns {Promise<Object>} Результат загрузки
 */
async function uploadFileToStorage(tempFilePath, fileName, originalName, fileSize) {
  // Проверяем существование временного файла
  if (!fs.existsSync(tempFilePath)) {
    console.error(`Временный файл не найден: ${tempFilePath}`);
    throw new Error(`Временный файл не найден: ${tempFilePath}`);
  }

  // Используем удаленное хранилище, если оно включено в конфигурации
  if (STORAGE_CONFIG.USE_REMOTE_STORAGE) {
    console.log(`[УДАЛЕННОЕ ХРАНИЛИЩЕ] Начало загрузки файла: ${fileName}`);
    
    try {
      // Создаем объект FormData для отправки файла
      const formData = new FormData();
      const fileStream = fs.createReadStream(tempFilePath);
      formData.append('file', fileStream);
      
      // Отправляем файл на удаленный сервер
      console.log(`Отправка на сервер: ${STORAGE_CONFIG.API_URL}/upload`);
      
      const axiosConfig = {
        headers: {
          ...formData.getHeaders(),
          'X-API-KEY': STORAGE_CONFIG.API_KEY
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      };
      
      console.log('Конфигурация запроса:', {
        url: `${STORAGE_CONFIG.API_URL}/upload`,
        method: 'POST',
        headers: {
          'X-API-KEY': STORAGE_CONFIG.API_KEY,
          ...formData.getHeaders()
        }
      });
      
      // Пробуем отправить файл через axios
      const response = await axios.post(
        `${STORAGE_CONFIG.API_URL}/upload`, 
        formData, 
        axiosConfig
      );
      
      console.log(`Результат загрузки: ${JSON.stringify(response.data)}`);
      
      // Удаляем временный файл после загрузки
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`Временный файл удален: ${tempFilePath}`);
      } catch (err) {
        console.error(`Не критичная ошибка при удалении временного файла: ${tempFilePath}`, err);
      }
      
      // Возвращаем успешный результат
      return {
        success: true,
        message: 'Файл успешно загружен в удаленное хранилище',
        filePath: fileName,
        originalName: originalName,
        size: fileSize,
        videoType: VIDEO_TYPES.STORAGE
      };
    } catch (error) {
      console.error('Ошибка загрузки в удаленное хранилище:', error.message);
      
      if (error.response) {
        console.error('Данные ответа:', error.response.data);
        console.error('Статус ответа:', error.response.status);
      }
      
      // Если не удалось загрузить в удаленное хранилище, сохраняем локально
      console.log('Переходим к локальному хранилищу как запасному варианту');
      
      return await saveFileLocally(tempFilePath, fileName, originalName, fileSize);
    }
  } else {
    // Логика для локального хранилища (на случай отключения удаленного)
    return await saveFileLocally(tempFilePath, fileName, originalName, fileSize);
  }
}

/**
 * Сохраняет файл локально
 * @param {string} tempFilePath Путь к временному файлу
 * @param {string} fileName Имя файла
 * @param {string} originalName Оригинальное имя файла
 * @param {number} fileSize Размер файла
 * @returns {Promise<Object>} Результат сохранения
 */
async function saveFileLocally(tempFilePath, fileName, originalName, fileSize) {
  console.log(`[ЛОКАЛЬНОЕ ХРАНИЛИЩЕ] Начало загрузки файла: ${fileName}`);
  
  // Создаем каталог для видео, если не существует
  const videosDir = path.join(__dirname, '../data/videos');
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
    console.log(`Создана директория для видео: ${videosDir}`);
  }
  
  // Копируем файл в директорию видео
  const localVideoPath = path.join(videosDir, fileName);
  
  try {
    fs.copyFileSync(tempFilePath, localVideoPath);
    console.log(`Файл скопирован в директорию видео: ${localVideoPath}`);
    
    // Проверяем, что файл был успешно скопирован
    if (!fs.existsSync(localVideoPath)) {
      throw new Error(`Не удалось скопировать файл в директорию видео`);
    }
    
    // Удаляем временный файл после копирования
    try {
      fs.unlinkSync(tempFilePath);
      console.log(`Временный файл удален: ${tempFilePath}`);
    } catch (err) {
      console.error(`Не критичная ошибка при удалении временного файла: ${tempFilePath}`, err);
    }
    
    // Возвращаем информацию об успешной загрузке
    return {
      success: true,
      message: 'Файл успешно загружен в локальное хранилище',
      filePath: fileName,
      originalName: originalName,
      size: fileSize,
      videoType: VIDEO_TYPES.LOCAL
    };
  } catch (error) {
    console.error('Ошибка при загрузке файла:', error);
    
    // Пытаемся удалить временный файл в случае ошибки
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (e) {
      console.error(`Ошибка при очистке временного файла: ${tempFilePath}`, e);
    }
    
    throw error;
  }
}

/**
 * Получает файл из хранилища
 * @param {string} filePath Путь к файлу в хранилище
 * @returns {Promise<Buffer>} Буфер с содержимым файла
 */
async function getFileFromStorage(filePath) {
  if (STORAGE_CONFIG.USE_REMOTE_STORAGE) {
    try {
      console.log(`[УДАЛЕННОЕ ХРАНИЛИЩЕ] Загрузка файла: ${filePath}`);
      
      // Формируем URL для запроса с правильным кодированием параметра пути
      const apiUrl = `${STORAGE_CONFIG.API_URL}/download`;
      const apiKey = STORAGE_CONFIG.API_KEY;
      
      console.log(`Запрос к API: ${apiUrl}?filePath=${encodeURIComponent(filePath)}`);
      
      // Пробуем прямой запрос через axios
      try {
        const response = await axios({
          method: 'GET',
          url: apiUrl,
          params: { filePath },
          headers: {
            'X-API-KEY': apiKey
          },
          responseType: 'arraybuffer'
        });
        
        console.log(`Ответ получен, статус: ${response.status}, размер: ${response.data ? response.data.length : 'N/A'} байт`);
        
        return response.data;
      } catch (error) {
        console.error('Ошибка при получении файла:', error.message);
        
        if (error.response) {
          console.error('Статус ответа:', error.response.status);
        }
        
        throw error;
      }
    } catch (error) {
      console.error(`Ошибка загрузки файла из удаленного хранилища: ${filePath}`, error.message);
      
      // Пробуем получить файл из локального хранилища как запасной вариант
      console.log(`Попытка получить файл из локального хранилища: ${filePath}`);
      try {
        return await getFileFromLocalStorage(filePath);
      } catch (localError) {
        console.error('Ошибка получения файла из локального хранилища:', localError.message);
        throw error; // Возвращаем оригинальную ошибку
      }
    }
  } else {
    // Логика для локального хранилища
    return await getFileFromLocalStorage(filePath);
  }
}

/**
 * Получает файл из локального хранилища
 * @param {string} filePath Путь к файлу в хранилище
 * @returns {Promise<Buffer>} Буфер с содержимым файла
 */
async function getFileFromLocalStorage(filePath) {
  try {
    const localPath = path.join(__dirname, '../data/videos', filePath);
    
    if (!fs.existsSync(localPath)) {
      throw new Error(`Файл не найден в локальном хранилище: ${localPath}`);
    }
    
    return fs.readFileSync(localPath);
  } catch (error) {
    console.error(`Ошибка чтения файла из локального хранилища: ${filePath}`, error.message);
    throw error;
  }
}

module.exports = {
  uploadFileToStorage,
  getFileFromStorage
}; 
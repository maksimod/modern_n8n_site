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

  // Ensure fileName has no path prefix
  const cleanFileName = path.basename(fileName);
  console.log(`Using clean fileName: ${cleanFileName} (original: ${fileName})`);

  // Используем удаленное хранилище, если оно включено в конфигурации
  let actualStorageType = VIDEO_TYPES.LOCAL; // Default to local
  if (STORAGE_CONFIG.USE_REMOTE_STORAGE) {
    console.log(`[УДАЛЕННОЕ ХРАНИЛИЩЕ] Начало загрузки файла: ${cleanFileName}`);
    
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
        maxBodyLength: Infinity,
        timeout: 60000 // 60 seconds timeout
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
      
      // Set the actual storage type
      actualStorageType = VIDEO_TYPES.STORAGE;
      
      // Store the clean filename without any path prefixes
      // Возвращаем успешный результат
      return {
        success: true,
        message: 'Файл успешно загружен в удаленное хранилище',
        filePath: cleanFileName,
        originalName: originalName,
        size: fileSize,
        videoType: VIDEO_TYPES.STORAGE
      };
    } catch (error) {
      console.error('Ошибка загрузки в удаленное хранилище:', error.message);
      
      if (error.response) {
        console.error('Данные ответа:', error.response.data);
        console.error('Статус ответа:', error.response.status);
      } else if (error.request) {
        console.error('Запрос был сделан, но ответ не получен:', error.request);
      } else {
        console.error('Ошибка при настройке запроса:', error.message);
      }
      
      // Если не удалось загрузить в удаленное хранилище, сохраняем локально
      console.log('Переходим к локальному хранилищу как запасному варианту');
      
      return await saveFileLocally(tempFilePath, cleanFileName, originalName, fileSize);
    }
  } else {
    // Логика для локального хранилища (на случай отключения удаленного)
    return await saveFileLocally(tempFilePath, cleanFileName, originalName, fileSize);
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
 * @param {string} rangeHeader Заголовок Range для частичной загрузки
 * @returns {Promise<Object>} Результат запроса с данными и заголовками
 */
async function getFileFromStorage(filePath, rangeHeader) {
  if (STORAGE_CONFIG.USE_REMOTE_STORAGE) {
    try {
      console.log(`[УДАЛЕННОЕ ХРАНИЛИЩЕ] Загрузка файла: ${filePath} с диапазоном: ${rangeHeader || 'нет'}`);
      
      // Формируем URL для запроса с правильным кодированием параметра пути
      const apiUrl = `${STORAGE_CONFIG.API_URL}/download`;
      const apiKey = STORAGE_CONFIG.API_KEY;
      
      console.log(`Запрос к API: ${apiUrl}?filePath=${encodeURIComponent(filePath)}`);
      
      // Настраиваем опции запроса
      const options = {
        method: 'GET',
        url: apiUrl,
        params: { filePath },
        headers: {
          'X-API-KEY': apiKey,
          'Accept': 'video/mp4, application/octet-stream'
        },
        responseType: 'arraybuffer',
        timeout: 30000, // 30 секунд таймаут
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      };
      
      // Добавляем заголовок Range если он есть
      if (rangeHeader) {
        options.headers['Range'] = rangeHeader;
        console.log(`[УДАЛЕННОЕ ХРАНИЛИЩЕ] Добавлен заголовок Range: ${rangeHeader}`);
      }
      
      // Пробуем прямой запрос через axios
      const response = await axios(options);
      
      console.log(`Ответ получен, статус: ${response.status}, размер: ${response.data ? response.data.length : 'N/A'} байт`);
      console.log(`Заголовки ответа:`, response.headers);
      
      return {
        data: response.data,
        headers: response.headers,
        status: response.status
      };
    } catch (error) {
      console.error(`Ошибка загрузки файла из удаленного хранилища: ${filePath}`, error.message);
      
      if (error.response) {
        console.error('Статус ответа:', error.response.status);
        console.error('Заголовки ответа:', error.response.headers);
        
        // Если ошибка формата запроса, пробуем альтернативный способ
        if (error.response.status === 400 || error.response.status === 404) {
          console.log('Пробуем альтернативный формат запроса к API...');
          
          try {
            // Пробуем добавить filePath в путь вместо параметра запроса
            const altUrl = `${STORAGE_CONFIG.API_URL}/download/${encodeURIComponent(filePath)}`;
            console.log(`Альтернативный URL: ${altUrl}`);
            
            const altOptions = {
              method: 'GET',
              url: altUrl,
              headers: {
                'X-API-KEY': apiKey,
                'Accept': 'video/mp4, application/octet-stream'
              },
              responseType: 'arraybuffer',
              timeout: 30000
            };
            
            if (rangeHeader) {
              altOptions.headers['Range'] = rangeHeader;
            }
            
            const altResponse = await axios(altOptions);
            console.log(`Альтернативный запрос успешен, статус: ${altResponse.status}`);
            
            return {
              data: altResponse.data,
              headers: altResponse.headers,
              status: altResponse.status
            };
          } catch (altError) {
            console.error('Альтернативный запрос тоже не удался:', altError.message);
          }
        }
      }
      
      // Пробуем получить файл из локального хранилища как запасной вариант
      if (STORAGE_CONFIG.FALLBACK_TO_LOCAL !== false) {
        console.log(`Попытка получить файл из локального хранилища: ${filePath}`);
        try {
          const localData = await getFileFromLocalStorage(filePath);
          return {
            data: localData,
            status: 200,
            headers: {
              'content-type': 'video/mp4',
              'content-length': localData.length,
              'accept-ranges': 'bytes'
            }
          };
        } catch (localError) {
          console.error('Ошибка получения файла из локального хранилища:', localError.message);
        }
      }
      
      throw error; // Переброс ошибки выше
    }
  } else {
    // Логика для локального хранилища
    try {
      const localData = await getFileFromLocalStorage(filePath);
      return {
        data: localData,
        status: 200,
        headers: {
          'content-type': 'video/mp4',
          'content-length': localData.length,
          'accept-ranges': 'bytes'
        }
      };
    } catch (error) {
      console.error(`Ошибка чтения файла из локального хранилища: ${filePath}`, error.message);
      throw error;
    }
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
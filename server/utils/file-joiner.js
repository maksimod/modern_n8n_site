const fs = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);

/**
 * Эффективно объединяет файловые чанки в единый файл без загрузки всего содержимого в память
 * @param {Array<string>} chunkPaths Массив путей к файлам-чанкам в порядке соединения
 * @param {string} outputPath Путь для выходного файла
 * @param {Function} progressCallback Опциональный коллбэк для отслеживания прогресса (chunksProcessed, totalChunks)
 * @returns {Promise<void>} Промис, который разрешается, когда файл будет собран
 */
async function joinChunksEfficiently(chunkPaths, outputPath, progressCallback) {
  if (!chunkPaths || !chunkPaths.length) {
    throw new Error('No chunk paths provided');
  }
  
  if (!outputPath) {
    throw new Error('Output path is required');
  }
  
  // Создаем поток для записи в выходной файл
  const outputStream = fs.createWriteStream(outputPath);
  
  // Обработчики событий для выходного потока
  return new Promise((resolve, reject) => {
    outputStream.on('error', (err) => {
      console.error('Error in output stream:', err);
      reject(err);
    });
    
    outputStream.on('close', () => {
      resolve(outputPath);
    });
    
    // Последовательно добавляем каждый чанк в выходной файл
    processChunks(chunkPaths, outputStream, progressCallback)
      .then(() => {
        // Закрываем выходной поток после обработки всех чанков
        outputStream.end();
      })
      .catch(err => {
        outputStream.destroy(err);
        reject(err);
      });
  });
}

/**
 * Последовательно обрабатывает все чанки и записывает их в выходной поток
 * @param {Array<string>} chunkPaths Массив путей к файлам-чанкам
 * @param {fs.WriteStream} outputStream Поток для записи
 * @param {Function} progressCallback Коллбэк для отслеживания прогресса
 * @returns {Promise<void>}
 */
async function processChunks(chunkPaths, outputStream, progressCallback) {
  const totalChunks = chunkPaths.length;
  
  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = chunkPaths[i];
    
    // Проверяем существование файла чанка
    if (!fs.existsSync(chunkPath)) {
      throw new Error(`Chunk file not found: ${chunkPath}`);
    }
    
    // Создаем поток чтения для текущего чанка
    const chunkStream = fs.createReadStream(chunkPath);
    
    // Передаем данные из чанка в выходной поток без завершения выходного потока
    await new Promise((resolve, reject) => {
      chunkStream.on('error', (err) => {
        console.error(`Error reading chunk ${i}:`, err);
        reject(err);
      });
      
      chunkStream.on('end', () => {
        // Вызываем коллбэк прогресса, если он предоставлен
        if (progressCallback) {
          progressCallback(i + 1, totalChunks);
        }
        resolve();
      });
      
      // Передаем данные в выходной поток
      chunkStream.pipe(outputStream, { end: false });
    });
  }
}

/**
 * Очищает временные файлы-чанки после успешного объединения
 * @param {Array<string>} chunkPaths Массив путей к файлам-чанкам
 * @param {string} sessionDir Директория сессии загрузки
 * @returns {Promise<void>}
 */
async function cleanupChunks(chunkPaths, sessionDir) {
  for (const chunkPath of chunkPaths) {
    try {
      if (fs.existsSync(chunkPath)) {
        fs.unlinkSync(chunkPath);
      }
    } catch (err) {
      console.error(`Error removing chunk ${chunkPath}:`, err);
      // Продолжаем удаление других чанков даже в случае ошибки
    }
  }
  
  // Пробуем удалить директорию сессии
  try {
    if (sessionDir && fs.existsSync(sessionDir)) {
      fs.rmdirSync(sessionDir);
    }
  } catch (err) {
    console.error(`Error removing session directory ${sessionDir}:`, err);
  }
}

module.exports = {
  joinChunksEfficiently,
  cleanupChunks
}; 
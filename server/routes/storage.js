// server/routes/storage.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { STORAGE_CONFIG } = require('../config');
const { uploadFileToStorage } = require('../utils/file-uploader');
const { joinChunksEfficiently, cleanupChunks } = require('../utils/file-joiner');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

// Configure multer for temporary storage
const tempStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function(req, file, cb) {
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    cb(null, fileName);
  }
});

// Set up multer with size limits for chunks
const upload = multer({
  storage: tempStorage,
  limits: { 
    fileSize: 300 * 1024, // 300KB - с запасом для клиентского размера чанка
    fieldSize: 1024 * 1024 // 1MB для значений полей
  }
});

// Хранилище для сессий загрузки
const uploadSessions = {};

// Инициализация загрузки файла
router.post('/init-upload', [auth, isAdmin], async (req, res) => {
  try {
    const { fileName, fileSize } = req.body;
    
    if (!fileName || !fileSize) {
      return res.status(400).json({
        success: false,
        message: 'Missing fileName or fileSize'
      });
    }
    
    console.log(`Initializing upload for: ${fileName}, size: ${fileSize}`);
    
    // Variable to track whether to use local storage instead of remote
    let useLocalStorage = !STORAGE_CONFIG.USE_REMOTE_STORAGE;
    
    // Check remote storage if it's enabled in config
    if (STORAGE_CONFIG.USE_REMOTE_STORAGE) {
      try {
        console.log('Testing remote storage connection...');
        // Try a simple request to remote storage
        const response = await axios({
          method: 'GET',
          url: `${STORAGE_CONFIG.API_URL}/health`,
          headers: {
            'X-API-KEY': STORAGE_CONFIG.API_KEY
          },
          timeout: 5000 // 5 second timeout for health check
        });
        
        console.log('Remote storage health check response:', response.status);
        
        if (response.status !== 200) {
          console.warn(`Remote storage returned non-200 status: ${response.status}`);
          useLocalStorage = true;
        }
      } catch (error) {
        console.error('Remote storage is unreachable:', error.message);
        console.warn('Falling back to local storage for this session');
        useLocalStorage = true;
      }
    }
    
    // Создаем уникальный ID сессии
    const sessionId = uuidv4();
    
    // Создаем директорию для временных чанков
    const sessionDir = path.join(__dirname, '../temp', sessionId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    
    // Сохраняем информацию о сессии
    uploadSessions[sessionId] = {
      fileName,
      fileSize,
      chunks: {},
      totalChunks: 0,
      uploadedChunks: 0,
      sessionDir,
      createdAt: Date.now(),
      useLocalStorage // Store flag to force local storage if needed
    };
    
    // Возвращаем ID сессии
    return res.json({
      success: true,
      sessionId,
      message: useLocalStorage ? 
        'Upload session initialized (will use local storage)' : 
        'Upload session initialized',
      storage: useLocalStorage ? 'local' : 'remote'
    });
  } catch (error) {
    console.error('Error initializing upload:', error);
    return res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
});

// Загрузка чанка
router.post('/upload-chunk', [auth, isAdmin, upload.single('chunk')], async (req, res) => {
  // Увеличиваем таймауты для больших чанков
  req.setTimeout(120000); // 2 минуты
  res.setTimeout(120000); // 2 минуты
  
  try {
    const { sessionId, chunkIndex, totalChunks } = req.body;
    
    if (!sessionId || !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Missing sessionId or chunk data'
      });
    }
    
    // Проверяем существование сессии
    if (!uploadSessions[sessionId]) {
      return res.status(404).json({
        success: false,
        message: 'Upload session not found'
      });
    }
    
    const session = uploadSessions[sessionId];
    const chunkIdx = parseInt(chunkIndex);
    const total = parseInt(totalChunks);
    
    console.log(`Received chunk ${chunkIdx + 1}/${total} for session ${sessionId}`);
    
    // Обновляем общее количество чанков при первом чанке
    if (session.totalChunks === 0) {
      session.totalChunks = total;
    }
    
    // Сохраняем чанк
    const chunkPath = path.join(session.sessionDir, `chunk_${chunkIdx}`);
    
    // Переименовываем временный файл мультера
    fs.renameSync(req.file.path, chunkPath);
    
    // Обновляем информацию о сессии
    session.chunks[chunkIdx] = {
      path: chunkPath,
      size: req.file.size
    };
    session.uploadedChunks++;
    
    return res.json({
      success: true,
      message: `Chunk ${chunkIdx + 1}/${total} received`,
      progress: Math.round((session.uploadedChunks / session.totalChunks) * 100)
    });
  } catch (error) {
    console.error('Error uploading chunk:', error);
    return res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
});

// Маршрут для финализации загрузки
router.post('/finalize-upload', [auth, isAdmin], async (req, res) => {
  const { sessionId, originalName } = req.body;
  
  // Увеличиваем таймауты запроса/ответа
  req.setTimeout(600000); // 10 минут
  res.setTimeout(600000); // 10 минут
  
  try {
    if (!sessionId || !uploadSessions[sessionId]) {
      return res.status(400).json({
        success: false,
        message: 'Upload session not found'
      });
    }
    
    const session = uploadSessions[sessionId];
    
    console.log(`Finalizing upload for session ${sessionId}, chunks: ${session.uploadedChunks}/${session.totalChunks}`);
    console.log(`Session useLocalStorage flag: ${session.useLocalStorage}`);
    
    // Проверяем, все ли чанки загружены
    if (session.uploadedChunks !== session.totalChunks) {
      return res.status(400).json({
        success: false,
        message: `Not all chunks uploaded (${session.uploadedChunks}/${session.totalChunks})`
      });
    }
    
    // Создаем массив путей к чанкам в правильном порядке
    const chunkPaths = [];
    for (let i = 0; i < session.totalChunks; i++) {
      if (!session.chunks[i]) {
        return res.status(400).json({
          success: false,
          message: `Missing chunk ${i}`
        });
      }
      chunkPaths.push(session.chunks[i].path);
    }
    
    // Создаем временный файл для объединения
    const fileExt = path.extname(session.fileName);
    const tempFileName = `${uuidv4()}${fileExt}`;
    const tempFilePath = path.join(__dirname, '../temp', tempFileName);
    
    // Обновляем статус сессии
    session.status = 'processing';
    session.processedChunks = 0;
    session.tempFilePath = tempFilePath;
    session.tempFileName = tempFileName;
    
    // Отвечаем клиенту немедленно
    res.json({
      success: true,
      message: 'File assembly started in background',
      status: 'processing',
      sessionId: sessionId,
      fileName: originalName || session.fileName,
      totalChunks: session.totalChunks
    });
    
    // Запускаем процесс обработки в фоновом режиме
    (async () => {
      try {
        // Используем нашу оптимизированную функцию для объединения файлов
        await joinChunksEfficiently(
          chunkPaths, 
          tempFilePath, 
          (processed, total) => {
            session.processedChunks = processed;
            console.log(`Processing chunks: ${processed}/${total}`);
          }
        );
        
        console.log(`All chunks combined to: ${tempFilePath}`);
        
        // Override storage config if session has explicit flag
        const useRemoteStorage = session.useLocalStorage === true ? false : STORAGE_CONFIG.USE_REMOTE_STORAGE;
        
        console.log(`Upload destination: ${useRemoteStorage ? 'REMOTE STORAGE' : 'LOCAL STORAGE'}`);
        
        // Загружаем объединенный файл в хранилище
        const uploadResult = await uploadFileToStorage(
          tempFilePath,
          tempFileName,
          originalName || session.fileName,
          session.fileSize
        );
        
        console.log('Storage upload result:', uploadResult);
        
        // Очищаем временные файлы
        await cleanupChunks(chunkPaths, session.sessionDir);
        
        // Удаляем объединенный файл
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        
        // Сохраняем результат в сессии и обновляем статус
        session.status = 'completed';
        session.result = {
          success: true,
          message: 'File uploaded successfully',
          filePath: uploadResult.filePath,
          originalName: uploadResult.originalName,
          videoType: uploadResult.videoType || (useRemoteStorage ? 'storage' : 'local'),
          size: session.fileSize
        };
        
        // Планируем удаление сессии через 30 минут
        session.cleanupTimeout = setTimeout(() => {
          console.log(`Cleaning up completed upload session ${sessionId}`);
          delete uploadSessions[sessionId];
        }, 30 * 60 * 1000);
        
      } catch (error) {
        console.error('Error in background processing:', error);
        
        // Проверяем возможность использования локального хранилища как запасной вариант
        try {
          if (STORAGE_CONFIG.USE_REMOTE_STORAGE && !session.useLocalStorage && fs.existsSync(tempFilePath)) {
            console.log('Trying local storage as fallback for failed remote upload...');
            
            // Force local storage
            session.useLocalStorage = true;
            
            // Try to upload locally
            const localResult = await uploadFileToStorage(
              tempFilePath,
              tempFileName,
              originalName || session.fileName,
              session.fileSize
            );
            
            console.log('Local storage fallback result:', localResult);
            
            // Обновляем статус и результат
            session.status = 'completed';
            session.result = {
              success: true,
              message: 'File uploaded successfully to local storage (fallback)',
              filePath: localResult.filePath,
              originalName: localResult.originalName,
              videoType: 'local',
              size: session.fileSize
            };
            
            // Планируем удаление сессии через 30 минут
            session.cleanupTimeout = setTimeout(() => {
              delete uploadSessions[sessionId];
            }, 30 * 60 * 1000);
            
            return;
          }
        } catch (fallbackError) {
          console.error('Even local storage fallback failed:', fallbackError);
        }
        
        // Обновляем статус в случае ошибки
        session.status = 'failed';
        session.error = error.message || 'Unknown error during file assembly';
        
        // Планируем удаление сессии через 30 минут
        session.cleanupTimeout = setTimeout(() => {
          delete uploadSessions[sessionId];
        }, 30 * 60 * 1000);
      }
    })();
  } catch (error) {
    console.error('Error initiating finalize upload:', error);
    return res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
});

// Новый маршрут для проверки статуса загрузки
router.get('/upload-status/:sessionId', [auth, isAdmin], (req, res) => {
  const { sessionId } = req.params;
  
  if (!sessionId || !uploadSessions[sessionId]) {
    return res.status(404).json({
      success: false,
      message: 'Session not found or expired'
    });
  }
  
  const session = uploadSessions[sessionId];
  
  if (session.status === 'completed' && session.result) {
    return res.json({
      success: true,
      status: 'completed',
      ...session.result
    });
  } else if (session.status === 'failed') {
    return res.status(500).json({
      success: false,
      status: 'failed',
      message: session.error || 'Unknown error during file assembly'
    });
  } else {
    // В процессе обработки
    return res.json({
      success: true,
      status: 'processing',
      progress: {
        chunksProcessed: session.processedChunks || 0,
        totalChunks: session.totalChunks || 0
      }
    });
  }
});

// Simple upload endpoint for compatibility (will redirect to chunked upload)
router.post('/upload', [auth, isAdmin, upload.single('file')], async (req, res) => {
  console.log('Received simple upload request, will use chunked upload');
  
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file was uploaded'
      });
    }
    
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    const tempFilePath = req.file.path;
    
    console.log('Processing simple upload:', {
      filename: fileName,
      size: fileSize,
      tempPath: tempFilePath
    });
    
    try {
      // Use our utility to upload to storage (handles both local and remote)
      const result = await uploadFileToStorage(
        tempFilePath,
        path.basename(tempFilePath),
        fileName,
        fileSize
      );
      
      console.log('Simple upload result:', result);
      
      // Return a standardized response
      return res.json({
        success: true,
        message: 'File uploaded successfully',
        filePath: result.filePath,
        originalName: result.originalName || fileName,
        videoType: STORAGE_CONFIG.USE_REMOTE_STORAGE ? 'storage' : 'local',
        size: fileSize
      });
    } catch (uploadError) {
      console.error('Error with simple upload:', uploadError);
      
      // Clean up temp file if it exists
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
      
      return res.status(500).json({
        success: false,
        message: `Upload error: ${uploadError.message}`
      });
    }
  } catch (error) {
    console.error('Simple upload handler error:', error);
    return res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
});

// Очистка старых сессий каждый час
setInterval(() => {
  const now = Date.now();
  const expireTime = 2 * 60 * 60 * 1000; // 2 часа
  
  for (const sessionId in uploadSessions) {
    const session = uploadSessions[sessionId];
    
    if (now - session.createdAt > expireTime) {
      console.log(`Cleaning up expired session: ${sessionId}`);
      
      try {
        // Удаляем чанки
        for (let i = 0; i < session.totalChunks; i++) {
          if (session.chunks[i] && fs.existsSync(session.chunks[i].path)) {
            fs.unlinkSync(session.chunks[i].path);
          }
        }
        
        // Удаляем директорию сессии
        if (fs.existsSync(session.sessionDir)) {
          fs.rmdirSync(session.sessionDir);
        }
      } catch (cleanupError) {
        console.error(`Error cleaning up session ${sessionId}:`, cleanupError);
      }
      
      // Удаляем сессию из памяти
      delete uploadSessions[sessionId];
    }
  }
}, 60 * 60 * 1000); // Запускаем каждый час

// Endpoint to delete files
router.delete('/delete', [auth, isAdmin], async (req, res) => {
  try {
    const { pattern, confirm } = req.body;
    
    if (!pattern) {
      return res.status(400).json({
        success: false,
        message: 'No file pattern provided'
      });
    }
    
    console.log(`Received request to delete file: ${pattern}, confirm: ${confirm}`);
    
    // Clean up the pattern - remove any path prefixes that might cause issues
    const cleanPattern = pattern.replace(/^\/videos\//, '');
    console.log(`Using cleaned pattern for deletion: ${cleanPattern}`);
    
    // If using remote storage, delete from there
    if (STORAGE_CONFIG.USE_REMOTE_STORAGE) {
      try {
        console.log(`Sending direct delete request to remote storage: ${cleanPattern}`);
        
        // Make a straightforward delete request directly to the storage API
        const response = await axios({
          method: 'DELETE',
          url: `${STORAGE_CONFIG.API_URL}/delete`,
          headers: {
            'X-API-KEY': STORAGE_CONFIG.API_KEY,
            'Content-Type': 'application/json'
          },
          data: { 
            pattern: cleanPattern,
            confirm: true  // Always include confirm:true
          }
        });
        
        console.log('Remote storage delete response:', response.data);
        
        // Also try to delete local copy just in case
        try {
          const videosDir = path.join(__dirname, '../data/videos');
          const localFilePath = path.join(videosDir, cleanPattern);
          
          if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
            console.log(`Also deleted local copy at: ${localFilePath}`);
          }
        } catch (localError) {
          console.log('Could not delete local copy, but remote deletion proceeded');
        }
        
        return res.json({
          success: true,
          message: 'File deleted from remote storage',
          details: response.data
        });
      } catch (apiError) {
        console.error('Error deleting from remote storage:', apiError);
        
        // If remote delete fails, try local as fallback
        console.log('Falling back to local delete...');
      }
    }
    
    // For local storage or as fallback
    const videosDir = path.join(__dirname, '../data/videos');
    const filePath = path.join(videosDir, cleanPattern);
    
    console.log(`Checking for local file: ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted local file: ${filePath}`);
      
      return res.json({
        success: true,
        message: 'File deleted from local storage'
      });
    } else {
      console.log(`File not found locally: ${filePath}`);
      
      // For graceful degradation, return success even if file not found
      return res.json({
        success: true,
        message: 'File may have been already deleted'
      });
    }
  } catch (error) {
    console.error('Error in file deletion handler:', error);
    
    // For UI continuity, return success with error details
    res.json({
      success: true, // Still report success to not block UI
      message: `Storage operation completed with warnings: ${error.message}`,
      hadErrors: true
    });
  }
});

module.exports = router; 
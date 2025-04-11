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

// Set up multer with very large size limits
const upload = multer({
  storage: tempStorage,
  limits: { 
    fileSize: 10000 * 1024 * 1024, // 10GB 
    fieldSize: 100 * 1024 * 1024   // 100MB for field values
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
      createdAt: Date.now()
    };
    
    // Возвращаем ID сессии
    return res.json({
      success: true,
      sessionId,
      message: 'Upload session initialized'
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

// Завершение загрузки и объединение чанков
router.post('/finalize-upload', [auth, isAdmin], async (req, res) => {
  try {
    const { sessionId, originalName } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing sessionId'
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
    
    console.log(`Finalizing upload for session ${sessionId}, chunks: ${session.uploadedChunks}/${session.totalChunks}`);
    
    // Проверяем, все ли чанки загружены
    if (session.uploadedChunks !== session.totalChunks) {
      return res.status(400).json({
        success: false,
        message: `Not all chunks uploaded (${session.uploadedChunks}/${session.totalChunks})`
      });
    }
    
    // Создаем временный файл для объединения
    const fileExt = path.extname(session.fileName);
    const tempFileName = `${uuidv4()}${fileExt}`;
    const tempFilePath = path.join(__dirname, '../temp', tempFileName);
    
    // Объединяем чанки
    const writeStream = fs.createWriteStream(tempFilePath);
    
    // Записываем чанки по порядку
    for (let i = 0; i < session.totalChunks; i++) {
      if (!session.chunks[i]) {
        return res.status(400).json({
          success: false,
          message: `Missing chunk ${i}`
        });
      }
      
      // Синхронное добавление чанка в файл
      try {
        const chunkData = fs.readFileSync(session.chunks[i].path);
        writeStream.write(chunkData);
      } catch (error) {
        console.error(`Error reading chunk ${i}:`, error);
        return res.status(500).json({
          success: false,
          message: `Error reading chunk ${i}: ${error.message}`
        });
      }
    }
    
    // Ждем завершения записи
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      writeStream.end();
    });
    
    console.log(`All chunks combined to: ${tempFilePath}`);
    
    try {
      // Загружаем объединенный файл в хранилище
      const uploadResult = await uploadFileToStorage(
        tempFilePath,
        tempFileName,
        originalName || session.fileName,
        session.fileSize
      );
      
      console.log('Storage upload result:', uploadResult);
      
      // Очищаем директорию с чанками
      try {
        for (let i = 0; i < session.totalChunks; i++) {
          if (session.chunks[i] && fs.existsSync(session.chunks[i].path)) {
            fs.unlinkSync(session.chunks[i].path);
          }
        }
        fs.rmdirSync(session.sessionDir);
        
        // Удаляем объединенный файл
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up temp files:', cleanupError);
      }
      
      // Удаляем сессию
      delete uploadSessions[sessionId];
      
      // Возвращаем результат
      return res.json({
        success: true,
        message: 'File uploaded successfully',
        filePath: uploadResult.filePath,
        originalName: uploadResult.originalName,
        videoType: STORAGE_CONFIG.USE_REMOTE_STORAGE ? 'storage' : 'local',
        size: session.fileSize
      });
    } catch (uploadError) {
      console.error('Error uploading to storage:', uploadError);
      return res.status(500).json({
        success: false,
        message: `Storage upload error: ${uploadError.message}`
      });
    }
  } catch (error) {
    console.error('Error finalizing upload:', error);
    return res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
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
    const { pattern } = req.body;
    
    if (!pattern) {
      return res.status(400).json({
        success: false,
        message: 'No file pattern provided'
      });
    }
    
    console.log(`Received request to delete file: ${pattern}`);
    
    // If using remote storage, delete from there
    if (STORAGE_CONFIG.USE_REMOTE_STORAGE) {
      try {
        const response = await axios({
          method: 'DELETE',
          url: `${STORAGE_CONFIG.API_URL}/delete`,
          headers: {
            'X-API-KEY': STORAGE_CONFIG.API_KEY,
            'Content-Type': 'application/json'
          },
          data: { pattern }
        });
        
        console.log('Remote storage delete response:', response.data);
        
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
    const filePath = path.join(videosDir, pattern);
    
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
      
      return res.json({
        success: false,
        message: 'File not found in local storage'
      });
    }
  } catch (error) {
    console.error('Error in file deletion handler:', error);
    
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
});

module.exports = router; 
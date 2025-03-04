// server/models/data-model.js
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Пути к файлам данных
const DATA_DIR = path.join(__dirname, '../data/db');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const COURSES_FILE = path.join(DATA_DIR, 'courses.json');
const PROGRESS_FILE = path.join(DATA_DIR, 'progress.json');

// Инициализация структуры данных
const ensureDataFilesExist = () => {
  // Убедиться, что директория существует
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Создать файлы, если они не существуют
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
  }

  if (!fs.existsSync(COURSES_FILE)) {
    fs.writeFileSync(COURSES_FILE, JSON.stringify([]));
  }

  if (!fs.existsSync(PROGRESS_FILE)) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify([]));
  }
};

// Получить данные из файла
const getData = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Ошибка чтения файла ${filePath}:`, error);
    return [];
  }
};

// Сохранить данные в файл
const saveData = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Ошибка записи в файл ${filePath}:`, error);
    return false;
  }
};

// Операции с пользователями
const userModel = {
  getAll: () => getData(USERS_FILE),
  
  findByUsername: (username) => {
    const users = getData(USERS_FILE);
    return users.find(user => user.username === username);
  },
  
  findById: (id) => {
    const users = getData(USERS_FILE);
    return users.find(user => user.id === id);
  },
  
  create: async (username, password) => {
    const users = getData(USERS_FILE);
    
    // Проверка на существующего пользователя
    if (users.some(user => user.username === username)) {
      throw new Error('User already exists');
    }
    
    // Хеширование пароля
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Создание пользователя
    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      username,
      password: hashedPassword,
      created_at: new Date().toISOString()
    };
    
    users.push(newUser);
    saveData(USERS_FILE, users);
    
    // Возвращаем пользователя без пароля
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  },
  
  authenticate: async (username, password) => {
    const user = userModel.findByUsername(username);
    
    if (!user) {
      return null;
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return null;
    }
    
    // Возвращаем пользователя без пароля
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
};

// Операции с курсами
const courseModel = {
  getAll: (language = 'ru') => {
    const courses = getData(COURSES_FILE);
    return courses.filter(course => course.language === language);
  },
  
  findById: (id, language = 'ru') => {
    const courses = getData(COURSES_FILE);
    return courses.find(course => course.id === id && course.language === language);
  },
  
  getVideo: (courseId, videoId, language = 'ru') => {
    const course = courseModel.findById(courseId, language);
    
    if (!course) {
      return null;
    }
    
    return course.videos.find(video => video.id === videoId);
  }
};

// Операции с прогрессом
const progressModel = {
  getUserProgress: (userId) => {
    const progressData = getData(PROGRESS_FILE);
    return progressData.filter(p => p.user_id === userId);
  },
  
  getCourseProgress: (userId, courseId) => {
    const progressData = getData(PROGRESS_FILE);
    return progressData.filter(p => p.user_id === userId && p.course_id === courseId);
  },
  
  updateProgress: (userId, courseId, videoId, completed) => {
    const progressData = getData(PROGRESS_FILE);
    
    // Поиск существующей записи
    const existingIndex = progressData.findIndex(
      p => p.user_id === userId && p.course_id === courseId && p.video_id === videoId
    );
    
    if (existingIndex !== -1) {
      // Обновление существующей записи
      progressData[existingIndex].is_completed = completed;
      progressData[existingIndex].updated_at = new Date().toISOString();
    } else {
      // Создание новой записи
      progressData.push({
        id: progressData.length > 0 ? Math.max(...progressData.map(p => p.id)) + 1 : 1,
        user_id: userId,
        course_id: courseId,
        video_id: videoId,
        is_completed: completed,
        updated_at: new Date().toISOString()
      });
    }
    
    saveData(PROGRESS_FILE, progressData);
    
    // Возвращаем обновленный прогресс для курса
    return progressModel.getCourseProgress(userId, courseId);
  },
  
  // Форматированный прогресс для пользователя
  getUserFormattedProgress: (userId) => {
    const progressData = progressModel.getUserProgress(userId);
    const formattedProgress = {};
    
    progressData.forEach(item => {
      if (!formattedProgress[item.course_id]) {
        formattedProgress[item.course_id] = {};
      }
      
      formattedProgress[item.course_id][item.video_id] = item.is_completed;
    });
    
    return formattedProgress;
  }
};

// Инициализируем структуру данных при запуске
ensureDataFilesExist();

module.exports = {
  userModel,
  courseModel,
  progressModel,
  USERS_FILE,
  COURSES_FILE,
  PROGRESS_FILE
};
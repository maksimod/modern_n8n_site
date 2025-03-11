// server/models/data-model.js
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Пути к файлам данных
const DATA_DIR = path.join(__dirname, '../data/db');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const COURSES_FILE = path.join(DATA_DIR, 'courses.json');

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
};

// Получить данные из файла
const getData = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    console.log(`Reading data from ${filePath}, size: ${data.length} bytes`);
    return JSON.parse(data);
  } catch (error) {
    console.error(`Ошибка чтения файла ${filePath}:`, error);
    return [];
  }
};

// Сохранить данные в файл
const saveData = (filePath, data) => {
  try {
    console.log(`Saving data to ${filePath}, object keys:`, Object.keys(data[0] || {}));
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

// Инициализируем структуру данных при запуске
ensureDataFilesExist();

module.exports = {
  userModel,
  courseModel,
  USERS_FILE,
  COURSES_FILE,
};
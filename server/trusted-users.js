// server/trusted-users.js
/**
 * Конфигурационный файл с перечнем доверенных пользователей
 * 
 * Этот файл должен быть защищен и доступен только администратору сервера
 * Необходимо обеспечить корректные права доступа для этого файла в боевом окружении
 */

const fs = require('fs');
const path = require('path');

// Путь к файлу хранения доверенных пользователей
const TRUSTED_USERS_FILE = path.join(__dirname, 'data/security/trusted-users.json');

// Создаем директорию для файла, если она не существует
const ensureDirectoryExists = () => {
  const dir = path.dirname(TRUSTED_USERS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Инициализируем файл с доверенными пользователями, если он не существует
const initTrustedUsersFile = () => {
  ensureDirectoryExists();
  
  if (!fs.existsSync(TRUSTED_USERS_FILE)) {
    // Создаем файл с начальными данными (например, admin)
    const initialData = {
      // Список пользователей в формате username: { enabled: true/false, notes: "описание" }
      users: {
        "admin": { enabled: true, notes: "Built-in administrator account" },
        // Добавьте других пользователей здесь...
      },
      // Метаданные
      meta: {
        lastUpdated: new Date().toISOString(),
        version: 1
      }
    };
    
    fs.writeFileSync(TRUSTED_USERS_FILE, JSON.stringify(initialData, null, 2));
    console.log(`Создан файл доверенных пользователей: ${TRUSTED_USERS_FILE}`);
  }
};

// Получить список доверенных пользователей
const getTrustedUsers = () => {
  try {
    // Убедимся, что файл существует
    initTrustedUsersFile();
    
    // Читаем данные
    const data = fs.readFileSync(TRUSTED_USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Ошибка чтения файла доверенных пользователей:', error);
    // В случае ошибки возвращаем только admin
    return {
      users: {
        "admin": { enabled: true, notes: "Built-in administrator account (fallback)" }
      },
      meta: {
        lastUpdated: new Date().toISOString(),
        version: 0,
        error: true
      }
    };
  }
};

// Проверка, является ли пользователь доверенным
const isUserTrusted = (username) => {
  const trustedData = getTrustedUsers();
  return trustedData.users[username] && trustedData.users[username].enabled;
};

// Добавление нового доверенного пользователя (только для администратора)
const addTrustedUser = (username, notes = "") => {
  try {
    const trustedData = getTrustedUsers();
    
    // Добавляем пользователя
    trustedData.users[username] = { 
      enabled: true, 
      notes,
      addedAt: new Date().toISOString()
    };
    
    // Обновляем метаданные
    trustedData.meta.lastUpdated = new Date().toISOString();
    trustedData.meta.version += 1;
    
    // Записываем обновленные данные
    fs.writeFileSync(TRUSTED_USERS_FILE, JSON.stringify(trustedData, null, 2));
    
    return true;
  } catch (error) {
    console.error('Ошибка при добавлении доверенного пользователя:', error);
    return false;
  }
};

// Отключение доверенного пользователя (только для администратора)
const disableTrustedUser = (username) => {
  try {
    const trustedData = getTrustedUsers();
    
    // Проверяем, существует ли пользователь
    if (trustedData.users[username]) {
      // Отключаем пользователя
      trustedData.users[username].enabled = false;
      trustedData.users[username].disabledAt = new Date().toISOString();
      
      // Обновляем метаданные
      trustedData.meta.lastUpdated = new Date().toISOString();
      trustedData.meta.version += 1;
      
      // Записываем обновленные данные
      fs.writeFileSync(TRUSTED_USERS_FILE, JSON.stringify(trustedData, null, 2));
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Ошибка при отключении доверенного пользователя:', error);
    return false;
  }
};

// Получить все записи (включая отключенных пользователей)
const getAllTrustedUsers = () => {
  const trustedData = getTrustedUsers();
  return trustedData.users;
};

// Получить только активные доверенные записи
const getActiveTrustedUsers = () => {
  const trustedData = getTrustedUsers();
  const activeUsers = {};
  
  Object.keys(trustedData.users).forEach(username => {
    if (trustedData.users[username].enabled) {
      activeUsers[username] = trustedData.users[username];
    }
  });
  
  return activeUsers;
};

// Инициализируем файл при запуске модуля
initTrustedUsersFile();

module.exports = {
  isUserTrusted,
  addTrustedUser,
  disableTrustedUser,
  getAllTrustedUsers,
  getActiveTrustedUsers
};
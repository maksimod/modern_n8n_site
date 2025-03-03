// Для демо используем localStorage вместо API-запросов
const USERS_KEY = 'video_platform_users';

// Получение пользователей из localStorage
const getUsers = () => {
  const usersJson = localStorage.getItem(USERS_KEY);
  return usersJson ? JSON.parse(usersJson) : [];
};

// Сохранение пользователей в localStorage
const saveUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

// Создание пользователя-администратора, если нет пользователей
const initializeDefaultUser = () => {
  const users = getUsers();
  if (users.length === 0) {
    const defaultUser = {
      id: "admin1",
      username: "admin",
      password: "admin123", // В реальном приложении так делать нельзя!
      progress: {}
    };
    users.push(defaultUser);
    saveUsers(users);
    console.log("Создан пользователь по умолчанию: admin / admin123");
  }
};

// Инициализация при загрузке
initializeDefaultUser();

export const checkUsername = (username) => {
  return new Promise((resolve) => {
    const users = getUsers();
    const isUsernameTaken = users.some(user => user.username === username);
    resolve(!isUsernameTaken);
  });
};

export const register = (username, password) => {
  return new Promise((resolve, reject) => {
    const users = getUsers();
    const isUsernameTaken = users.some(user => user.username === username);
    
    if (isUsernameTaken) {
      reject(new Error('Имя пользователя уже занято'));
      return;
    }
    
    const newUser = {
      id: Date.now().toString(),
      username,
      password, // В реальном приложении НИКОГДА не храните пароли в открытом виде
      progress: {}
    };
    
    users.push(newUser);
    saveUsers(users);
    
    // Возвращаем данные пользователя без пароля
    const { password: _, ...userData } = newUser;
    resolve(userData);
  });
};

export const login = (username, password) => {
  return new Promise((resolve, reject) => {
    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
      reject(new Error('Неверное имя пользователя или пароль'));
      return;
    }
    
    // Возвращаем данные пользователя без пароля
    const { password: _, ...userData } = user;
    resolve(userData);
  });
};

export const logout = () => {
  return Promise.resolve(true);
};

export const updateUserProgress = (userId, courseId, videoId, completed) => {
  return new Promise((resolve, reject) => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      reject(new Error('Пользователь не найден'));
      return;
    }
    
    // Инициализируем прогресс курса, если он не существует
    if (!users[userIndex].progress[courseId]) {
      users[userIndex].progress[courseId] = {};
    }
    
    // Обновляем прогресс видео
    users[userIndex].progress[courseId][videoId] = completed;
    
    saveUsers(users);
    
    // Обновляем текущего пользователя в localStorage
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (currentUser.id === userId) {
      currentUser.progress = users[userIndex].progress;
      localStorage.setItem('user', JSON.stringify(currentUser));
    }
    
    resolve(users[userIndex].progress);
  });
};
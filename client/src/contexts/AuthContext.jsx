import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Проверяем, есть ли сохраненный пользователь в localStorage
    const user = localStorage.getItem('user');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
    setLoading(false);
  }, []);

  // Функция для регистрации
  const register = async (username, password) => {
    // Проверяем, существует ли уже пользователь
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userExists = users.some(user => user.username === username);
    
    if (userExists) {
      setError('Пользователь с таким именем уже существует');
      throw new Error('Пользователь с таким именем уже существует');
    }
    
    // Создаем нового пользователя
    const newUser = {
      id: Date.now().toString(),
      username,
      password, // В реальном приложении никогда не храните пароли в открытом виде!
      progress: {}
    };
    
    // Сохраняем пользователя в "базу данных" (localStorage)
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    // Логиним пользователя
    const { password: _, ...userWithoutPassword } = newUser;
    setCurrentUser(userWithoutPassword);
    localStorage.setItem('user', JSON.stringify(userWithoutPassword));
    setError(null);
    
    return userWithoutPassword;
  };

  // Функция для входа
  const login = async (username, password) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
      setError('Неверное имя пользователя или пароль');
      throw new Error('Неверное имя пользователя или пароль');
    }
    
    // Логиним пользователя
    const { password: _, ...userWithoutPassword } = user;
    setCurrentUser(userWithoutPassword);
    localStorage.setItem('user', JSON.stringify(userWithoutPassword));
    setError(null);
    
    return userWithoutPassword;
  };

  // Функция для выхода
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('user');
  };
  
  // Функция для проверки username
  const checkUsername = async (username) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    return !users.some(user => user.username === username);
  };

  // Создаем первого пользователя, если его нет
  useEffect(() => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if (users.length === 0) {
      const defaultUser = {
        id: 'admin1',
        username: 'admin',
        password: 'admin',
        progress: {}
      };
      users.push(defaultUser);
      localStorage.setItem('users', JSON.stringify(users));
      console.log('Создан пользователь по умолчанию: admin / admin');
    }
  }, []);

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    loading,
    error,
    register,
    login,
    logout,
    checkUsername
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
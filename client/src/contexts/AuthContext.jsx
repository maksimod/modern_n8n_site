// client/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { register, login, logout, checkUsername, getCurrentUser } from '../services/auth.service';

const AuthContext = createContext(null);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null); // Добавляем состояние для токена
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Проверяем, есть ли сохраненный пользователь
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      // Также проверяем сохраненный токен
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
      }
    }
    setLoading(false);
  }, []);

  // Функция для регистрации
  const registerUser = async (username, password) => {
    try {
      setError(null);
      const user = await register(username, password);
      setCurrentUser(user);
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Функция для входа
  const loginUser = async (username, password) => {
    try {
      setError(null);
      const response = await login(username, password);
      const user = response.user;
      const token = response.token; // Получаем токен из ответа
      setCurrentUser(user);
      setToken(token); // Устанавливаем токен в контексте
      localStorage.setItem('token', token); // Сохраняем токен в локальном хранилище
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Функция для выхода
  const logoutUser = () => {
    logout();
    setCurrentUser(null);
    setToken(null); // Удаляем токен при выходе
    localStorage.removeItem('token'); // Удаляем токен из локального хранилища
  };

  // Функция для проверки username
  const checkUsernameAvailable = async (username) => {
    try {
      return await checkUsername(username);
    } catch (err) {
      console.error('Error checking username:', err);
      return false;
    }
  };

  const value = {
    currentUser,
    token, // Добавляем токен в контекст
    isAuthenticated: !!currentUser,
    loading,
    error,
    register: registerUser,
    login: loginUser,
    logout: logoutUser,
    checkUsername: checkUsernameAvailable
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

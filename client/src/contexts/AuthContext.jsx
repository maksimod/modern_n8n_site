// client/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { register, login, logout, checkUsername, getCurrentUser } from '../services/auth.service';

const AuthContext = createContext(null);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Проверяем, есть ли сохраненный пользователь и токен
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        setToken(storedToken);
        // Проверяем, является ли пользователь администратором
        setIsAdmin(user.username === 'admin');
      } catch (err) {
        console.error('Ошибка при парсинге данных пользователя:', err);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  // Функция для регистрации
  const registerUser = async (username, password) => {
    try {
      setError(null);
      const response = await register(username, password);
      const { user, token } = response;
      
      // Сохраняем пользователя и токен
      setCurrentUser(user);
      setToken(token);
      
      // Обновляем localStorage
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      
      // Проверяем, является ли пользователь администратором
      setIsAdmin(user.username === 'admin');
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
      const { user, token } = response;
      
      // Сохраняем пользователя и токен
      setCurrentUser(user);
      setToken(token);
      
      // Обновляем localStorage
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      
      // Проверяем, является ли пользователь администратором
      setIsAdmin(user.username === 'admin');
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
    setToken(null);
    setIsAdmin(false);
    
    // Очищаем localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('token');
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
    token,
    isAuthenticated: !!currentUser && !!token,
    isAdmin,
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
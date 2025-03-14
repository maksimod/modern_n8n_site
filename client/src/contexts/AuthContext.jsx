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
  const [accessRevoked, setAccessRevoked] = useState(false); // Новое состояние для отозванного доступа

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

  // Обработка ошибок API для проверки отозванного доступа
  const handleApiError = (err) => {
    setError(err.message);
    
    // Проверяем, был ли отозван доступ
    if (err.response && err.response.data && err.response.data.code === 'ACCESS_REVOKED') {
      console.log('Доступ к аккаунту был отозван');
      setAccessRevoked(true);
      
      // Очищаем данные пользователя
      logoutUser();
    }
    
    throw err;
  };

  // Функция для регистрации
  const registerUser = async (username, password) => {
    try {
      setError(null);
      setAccessRevoked(false);
      
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
      // Проверяем, был ли отказ в регистрации из-за отсутствия в списке доверенных
      if (err.response && err.response.data && err.response.data.code === 'NOT_TRUSTED') {
        setError('Регистрация ограничена только для доверенных пользователей');
      } else {
        handleApiError(err);
      }
      throw err;
    }
  };

  // Функция для входа
  const loginUser = async (username, password) => {
    try {
      setError(null);
      setAccessRevoked(false);
      
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
      return handleApiError(err);
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
      const response = await checkUsername(username);
      
      // Обновленный ответ API включает информацию о доверенных пользователях
      if (response && typeof response.available !== 'undefined') {
        // Если имя свободно, но пользователь не в списке доверенных
        if (response.available && response.trusted === false) {
          setError('Регистрация ограничена только для доверенных пользователей');
          return false;
        }
        return response.available;
      }
      
      return false;
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
    accessRevoked, // Добавляем новое состояние
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
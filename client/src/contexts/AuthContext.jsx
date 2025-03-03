import React, { createContext, useState, useEffect, useContext } from 'react';
import { register, login, logout, checkUsername, getCurrentUser } from '../services/auth.service';

const AuthContext = createContext(null);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Проверяем, есть ли сохраненный пользователь
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
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
      const user = await login(username, password);
      setCurrentUser(user);
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
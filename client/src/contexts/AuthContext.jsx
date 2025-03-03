import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register, logout, checkUsername } from '../services/auth.service';

const AuthContext = createContext(null);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const user = localStorage.getItem('user');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
    setLoading(false);
  }, []);

  const handleLogin = async (username, password) => {
    try {
      setError(null);
      const userData = await login(username, password);
      setCurrentUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      navigate('/');
      return userData;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login');
      throw err;
    }
  };

  const handleRegister = async (username, password) => {
    try {
      setError(null);
      // Check if username is available
      const isAvailable = await checkUsername(username);
      if (!isAvailable) {
        throw new Error('Username is already taken');
      }
      
      const userData = await register(username, password);
      setCurrentUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      navigate('/');
      return userData;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to register');
      throw err;
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setCurrentUser(null);
      localStorage.removeItem('user');
      navigate('/auth');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    loading,
    error,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    checkUsername
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
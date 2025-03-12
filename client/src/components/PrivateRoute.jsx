import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from '../styles/components.module.css';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return <div className={styles.loadingContainer}>Загрузка...</div>;
  }
  
  if (!isAuthenticated) {
    // Сохраняем текущий URL для перенаправления после входа
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} />;
  }
  
  return children;
};

export default PrivateRoute;
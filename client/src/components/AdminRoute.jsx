import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from '../styles/components.module.css';

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  
  if (loading) {
    return <div className={styles.loadingContainer}>Загрузка...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" />;
  }
  
  if (!isAdmin) {
    return <Navigate to="/" />;
  }
  
  return children;
};

export default AdminRoute;
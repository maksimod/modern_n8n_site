import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { ProgressProvider } from './contexts/ProgressContext';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';

// Ленивая загрузка компонентов для повышения производительности
const HomePage = lazy(() => import('./pages/HomePage'));
const CoursePage = lazy(() => import('./pages/CoursePage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// Компонент загрузки
const Loading = () => <div style={{ 
  display: 'flex', 
  justifyContent: 'center', 
  alignItems: 'center', 
  height: '100vh' 
}}>Загрузка...</div>;

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ProgressProvider>
          <BrowserRouter>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/" element={
                  <PrivateRoute>
                    <HomePage />
                  </PrivateRoute>
                } />
                <Route path="/course/:courseId" element={
                  <PrivateRoute>
                    <CoursePage />
                  </PrivateRoute>
                } />
                <Route path="/admin" element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ProgressProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
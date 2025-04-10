import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../../styles/auth.module.css';

const Login = ({ onSwitchMode }) => {
  const { t } = useTranslation();
  const { login, error } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear specific field error when user starts typing again
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: null });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    // Validate username
    if (!formData.username.trim()) {
      errors.username = t('auth.usernameRequired');
    }
    
    // Validate password
    if (!formData.password) {
      errors.password = t('auth.passwordRequired');
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const isValid = validateForm();
    if (isValid) {
      try {
        await login(formData.username, formData.password);
        // Navigation will be handled by auth context
      } catch (error) {
        // Error will be handled by auth context
        console.error('Login error:', error);
      }
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className={styles.authForm}>
      {error && <div className={styles.errorMessage}>{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="username" className={styles.label}>
            {t('auth.username')}
          </label>
          <div className={styles.inputGroup}>
            <input
              type="text"
              id="username"
              name="username"
              className={`${styles.input} ${formErrors.username ? styles.inputError : ''}`}
              value={formData.username}
              onChange={handleChange}
              disabled={isSubmitting}
              autoComplete="username"
            />
            {formErrors.username && (
              <div className={styles.formError}>{formErrors.username}</div>
            )}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.label}>
            {t('auth.password')}
          </label>
          <div className={styles.inputGroup}>
            <input
              type="password"
              id="password"
              name="password"
              className={`${styles.input} ${formErrors.password ? styles.inputError : ''}`}
              value={formData.password}
              onChange={handleChange}
              disabled={isSubmitting}
              autoComplete="current-password"
            />
            {formErrors.password && (
              <div className={styles.formError}>{formErrors.password}</div>
            )}
          </div>
        </div>

        <div className={styles.formFooter}>
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? t('common.loading') : t('auth.login')}
          </button>
          
          <div className={styles.switchMode}>
            {t('auth.noAccount')}
            <span 
              className={styles.switchModeLink}
              onClick={onSwitchMode}
            >
              {t('auth.register')}
            </span>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Login;
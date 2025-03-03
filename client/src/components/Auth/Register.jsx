import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../../styles/auth.module.css';

const Register = ({ onSwitchMode }) => {
  const { t } = useTranslation();
  const { register, error, checkUsername } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear specific field error when user starts typing again
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: null });
    }
    
    // Reset username availability check when username changes
    if (name === 'username') {
      setUsernameAvailable(null);
    }
  };

  const validateForm = async () => {
    const errors = {};
    
    // Validate username
    if (!formData.username.trim()) {
      errors.username = t('auth.usernameRequired');
    } else if (formData.username.length < 3) {
      errors.username = t('Username must be at least 3 characters');
    }
    
    // Check username availability
    if (formData.username && !errors.username) {
      setUsernameChecking(true);
      try {
        const isAvailable = await checkUsername(formData.username);
        if (!isAvailable) {
          errors.username = t('auth.usernameExists');
          setUsernameAvailable(false);
        } else {
          setUsernameAvailable(true);
        }
      } catch (error) {
        console.error('Error checking username:', error);
      } finally {
        setUsernameChecking(false);
      }
    }
    
    // Validate password
    if (!formData.password) {
      errors.password = t('auth.passwordRequired');
    } else if (formData.password.length < 6) {
      errors.password = t('Password must be at least 6 characters');
    }
    
    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t('auth.passwordMatch');
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const isValid = await validateForm();
    if (isValid) {
      try {
        await register(formData.username, formData.password);
        // Navigate will be handled by auth context
      } catch (error) {
        // Error will be handled by auth context
        console.error('Registration error:', error);
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
            {usernameAvailable === true && !formErrors.username && (
              <div style={{ color: 'green', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                {t('Username is available')}
              </div>
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
              autoComplete="new-password"
            />
            {formErrors.password && (
              <div className={styles.formError}>{formErrors.password}</div>
            )}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="confirmPassword" className={styles.label}>
            {t('auth.confirmPassword')}
          </label>
          <div className={styles.inputGroup}>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className={`${styles.input} ${formErrors.confirmPassword ? styles.inputError : ''}`}
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isSubmitting}
              autoComplete="new-password"
            />
            {formErrors.confirmPassword && (
              <div className={styles.formError}>{formErrors.confirmPassword}</div>
            )}
          </div>
        </div>

        <div className={styles.formFooter}>
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isSubmitting || usernameChecking}
          >
            {isSubmitting ? t('common.loading') : t('auth.register')}
          </button>
          
          <div className={styles.switchMode}>
            {t('auth.haveAccount')}
            <span 
              className={styles.switchModeLink}
              onClick={onSwitchMode}
            >
              {t('auth.login')}
            </span>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Register;
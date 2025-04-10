// client/src/components/Admin/TrustedUsersManager.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import styles from '../../styles/admin.module.css';

const TrustedUsersManager = () => {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  
  const [trustedUsers, setTrustedUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDisabled, setShowDisabled] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newUserNotes, setNewUserNotes] = useState('');
  const [addingUser, setAddingUser] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Загружаем список доверенных пользователей
  useEffect(() => {
    const fetchTrustedUsers = async () => {
      if (!isAdmin) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await api.get(`/api/admin/trusted-users?showDisabled=${showDisabled}`);
        
        if (response.data && response.data.success && response.data.users) {
          setTrustedUsers(response.data.users);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Error fetching trusted users:', err);
        setError('Failed to load trusted users');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrustedUsers();
  }, [isAdmin, showDisabled]);
  
  // Функция для добавления нового доверенного пользователя
  const handleAddTrustedUser = async (e) => {
    e.preventDefault();
    
    if (!newUsername.trim()) {
      setError('Please enter a username');
      return;
    }
    
    try {
      setAddingUser(true);
      setError(null);
      
      const response = await api.post('/api/admin/trusted-users', {
        username: newUsername.trim(),
        notes: newUserNotes.trim()
      });
      
      if (response.data && response.data.success) {
        setSuccessMessage(`User "${newUsername}" was added to trusted list`);
        
        // Обновляем список
        const updatedUsers = {
          ...trustedUsers,
          [newUsername]: {
            enabled: true,
            notes: newUserNotes,
            addedAt: new Date().toISOString()
          }
        };
        
        setTrustedUsers(updatedUsers);
        
        // Очищаем форму
        setNewUsername('');
        setNewUserNotes('');
        
        // Скрываем сообщение через 3 секунды
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        throw new Error('Failed to add user');
      }
    } catch (err) {
      console.error('Error adding trusted user:', err);
      setError(err.response?.data?.message || 'Failed to add trusted user');
    } finally {
      setAddingUser(false);
    }
  };
  
  // Функция для отзыва доступа пользователя
  const handleRevokeAccess = async (username) => {
    if (!window.confirm(`Are you sure you want to revoke access for "${username}"?`)) {
      return;
    }
    
    try {
      setError(null);
      
      const response = await api.delete(`/api/admin/trusted-users/${username}`);
      
      if (response.data && response.data.success) {
        setSuccessMessage(`Access for "${username}" was revoked`);
        
        // Обновляем список
        const updatedUsers = { ...trustedUsers };
        
        if (updatedUsers[username]) {
          updatedUsers[username].enabled = false;
          updatedUsers[username].disabledAt = new Date().toISOString();
          setTrustedUsers(updatedUsers);
        }
        
        // Скрываем сообщение через 3 секунды
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        throw new Error('Failed to revoke access');
      }
    } catch (err) {
      console.error('Error revoking access:', err);
      setError(err.response?.data?.message || 'Failed to revoke access');
    }
  };
  
  // Функция для запуска очистки пользователей
  const handleCleanupUsers = async () => {
    if (!window.confirm('This will remove all users who are not in the trusted list. Continue?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/api/admin/trusted-users/cleanup');
      
      if (response.data && response.data.success) {
        setSuccessMessage('User cleanup completed');
        
        // Скрываем сообщение через 3 секунды
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        throw new Error('Failed to run cleanup');
      }
    } catch (err) {
      console.error('Error during user cleanup:', err);
      setError(err.response?.data?.message || 'Failed to run cleanup');
    } finally {
      setLoading(false);
    }
  };
  
  if (!isAdmin) {
    return <div className={styles.errorAlert}>Admin access required</div>;
  }
  
  return (
    <div className={styles.adminSection}>
      <h2 className={styles.adminTitle}>Trusted Users Management</h2>
      <p className={styles.adminDescription}>
        Only users listed here can register and use the platform. 
        Users who have been removed from this list will lose access to the system.
      </p>
      
      {error && (
        <div className={styles.errorAlert}>{error}</div>
      )}
      
      {successMessage && (
        <div className={styles.successAlert}>{successMessage}</div>
      )}
      
      {/* Форма добавления нового пользователя */}
      <div className={styles.adminForm}>
        <h3 className={styles.formTitle}>Add New Trusted User</h3>
        
        <form onSubmit={handleAddTrustedUser}>
          <div className={styles.formGroup}>
            <label htmlFor="newUsername" className={styles.formLabel}>Username</label>
            <input
              type="text"
              id="newUsername"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className={styles.formInput}
              disabled={addingUser}
              placeholder="Enter username for new trusted user"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="newUserNotes" className={styles.formLabel}>Notes</label>
            <textarea
              id="newUserNotes"
              value={newUserNotes}
              onChange={(e) => setNewUserNotes(e.target.value)}
              className={styles.formTextarea}
              disabled={addingUser}
              placeholder="Optional notes about this user"
              rows={2}
            />
          </div>
          
          <div className={styles.formActions}>
            <button
              type="submit"
              className={styles.adminButton}
              disabled={addingUser || !newUsername.trim()}
            >
              {addingUser ? 'Adding...' : 'Add Trusted User'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Список пользователей */}
      <div className={styles.trustedUsersList}>
        <div className={styles.listHeader}>
          <h3 className={styles.listTitle}>Current Trusted Users</h3>
          
          <div className={styles.listControls}>
            <label className={styles.checkboxContainer}>
              <input
                type="checkbox"
                checked={showDisabled}
                onChange={() => setShowDisabled(!showDisabled)}
              />
              <span className={styles.checkboxLabel}>Show disabled users</span>
            </label>
            
            <button
              className={`${styles.adminButtonSecondary} ${styles.cleanupButton}`}
              onClick={handleCleanupUsers}
              disabled={loading}
            >
              Run Cleanup
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className={styles.loadingIndicator}>Loading...</div>
        ) : Object.keys(trustedUsers).length === 0 ? (
          <div className={styles.emptyList}>No trusted users found.</div>
        ) : (
          <div className={styles.userCards}>
            {Object.entries(trustedUsers).map(([username, userData]) => (
              <div 
                key={username}
                className={`${styles.userCard} ${!userData.enabled ? styles.disabledUser : ''}`}
              >
                <div className={styles.userHeader}>
                  <h4 className={styles.userName}>{username}</h4>
                  {userData.enabled ? (
                    <span className={styles.activeStatus}>Active</span>
                  ) : (
                    <span className={styles.disabledStatus}>Disabled</span>
                  )}
                </div>
                
                {userData.notes && (
                  <p className={styles.userNotes}>{userData.notes}</p>
                )}
                
                <div className={styles.userMeta}>
                  {userData.addedAt && (
                    <div className={styles.timeInfo}>
                      Added: {new Date(userData.addedAt).toLocaleString()}
                    </div>
                  )}
                  
                  {userData.disabledAt && (
                    <div className={styles.timeInfo}>
                      Disabled: {new Date(userData.disabledAt).toLocaleString()}
                    </div>
                  )}
                </div>
                
                {userData.enabled && (
                  <button
                    className={styles.adminButtonDanger}
                    onClick={() => handleRevokeAccess(username)}
                  >
                    Revoke Access
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrustedUsersManager;
// client/src/components/Admin/DiskUsage.jsx
import React, { useState, useEffect } from 'react';
import { getDiskUsage } from '../../services/admin.service';
import styles from '../../styles/admin.module.css';

const DiskUsage = () => {
  const [diskInfo, setDiskInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  useEffect(() => {
    // Track whether the component is still mounted
    let isMounted = true;
    
    const fetchDiskInfo = async () => {
      try {
        if (!isMounted) return;
        
        setLoading(true);
        setError(null);
        const data = await getDiskUsage();
        
        if (isMounted) {
          setDiskInfo(data);
          setRetryCount(0); // Reset retry count on success
        }
      } catch (err) {
        if (!isMounted) return;
        
        // Only log the error on the first attempt
        if (retryCount === 0) {
          console.warn('Error fetching disk usage - will retry silently');
        }
        
        setError('Не удалось загрузить информацию о дисковом пространстве');
        
        // Retry with increasing backoff, but max 3 times
        if (retryCount < 3) {
          const delay = Math.min(2000 * Math.pow(2, retryCount), 10000);
          setTimeout(() => {
            if (isMounted) {
              setRetryCount(prev => prev + 1);
            }
          }, delay);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchDiskInfo();
    
    // If retry count increases, try fetching again
    if (retryCount > 0) {
      fetchDiskInfo();
    }
    
    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [retryCount]);
  
  // Функция для форматирования размера в читаемый вид
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  if (loading && !diskInfo) {
    return (
      <div className={styles.diskUsageCard}>
        <h3 className={styles.diskUsageTitle}>Дисковое пространство</h3>
        <div className={styles.diskUsageLoading}>Загрузка информации...</div>
      </div>
    );
  }
  
  if (error && !diskInfo) {
    return (
      <div className={styles.diskUsageCard}>
        <h3 className={styles.diskUsageTitle}>Дисковое пространство</h3>
        <div className={styles.diskUsageError}>
          {error}
          <button 
            onClick={() => setRetryCount(prev => prev + 1)} 
            className={styles.retryButton}
            style={{ 
              marginLeft: '10px', 
              padding: '3px 8px', 
              background: '#4b5563', 
              color: 'white', 
              border: 'none', 
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Обновить
          </button>
        </div>
      </div>
    );
  }
  
  // If we have previously loaded disk info but current request failed,
  // keep showing the old data rather than an error
  if (!diskInfo) {
    return null;
  }
  
  // Вычисляем процент использования
  const usedPercent = Math.round((diskInfo.used / diskInfo.total) * 100);
  
  return (
    <div className={styles.diskUsageCard}>
      <h3 className={styles.diskUsageTitle}>Дисковое пространство</h3>
      
      <div className={styles.diskUsageInfo}>
        <div className={styles.diskUsageProgressContainer}>
          <div 
            className={styles.diskUsageProgressBar} 
            style={{ width: `${usedPercent}%` }}
            title={`${usedPercent}% использовано`}
          ></div>
        </div>
        <div className={styles.diskUsageText}>
          {usedPercent}% использовано (свободно {formatSize(diskInfo.free)} из {formatSize(diskInfo.total)})
        </div>
      </div>
      
      <div className={styles.diskUsageVideos}>
        <div>
          Видеофайлы: {diskInfo.videos.count} файлов ({formatSize(diskInfo.videos.size)})
        </div>
      </div>
    </div>
  );
};

export default DiskUsage;
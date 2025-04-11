// client/src/components/Admin/DiskUsage.jsx
import React, { useState, useEffect } from 'react';
import { getDiskUsage } from '../../services/admin.service';
import styles from '../../styles/admin.module.css';

// Keep track of server health to avoid repeated API calls
let serverUnavailableTimestamp = 0;
const SERVER_COOLDOWN_PERIOD = 60000; // 1 minute cooldown

const DiskUsage = () => {
  const [diskInfo, setDiskInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [serverAvailable, setServerAvailable] = useState(true);
  
  useEffect(() => {
    // If server was unavailable recently, don't even try to fetch
    const now = Date.now();
    if (serverUnavailableTimestamp > 0 && now - serverUnavailableTimestamp < SERVER_COOLDOWN_PERIOD) {
      setServerAvailable(false);
      setLoading(false);
      setError('Сервер временно недоступен. Повторите попытку позже.');
      return;
    }
    
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
          // Reset server availability if it was previously unavailable
          setServerAvailable(true);
          serverUnavailableTimestamp = 0;
        }
      } catch (err) {
        if (!isMounted) return;
        
        // Mark server as unavailable and set timestamp
        serverUnavailableTimestamp = Date.now();
        setServerAvailable(false);
        setError('Не удалось загрузить информацию о дисковом пространстве');
        
        // Don't retry automatically - manual only
        console.warn('Disk usage info unavailable - disabled automatic retries');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    // Only fetch if server is believed to be available
    if (serverAvailable) {
      fetchDiskInfo();
    }
    
    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [serverAvailable]);
  
  // Function to manually retry when user clicks button
  const handleManualRetry = () => {
    // Reset server unavailable timestamp to allow a new attempt
    serverUnavailableTimestamp = 0;
    setServerAvailable(true);
  };
  
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
  
  if (!serverAvailable || (error && !diskInfo)) {
    return (
      <div className={styles.diskUsageCard}>
        <h3 className={styles.diskUsageTitle}>Дисковое пространство</h3>
        <div className={styles.diskUsageError}>
          {error || 'Сервер временно недоступен'}
          <button 
            onClick={handleManualRetry} 
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
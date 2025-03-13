// client/src/components/Admin/DiskUsage.jsx
import React, { useState, useEffect } from 'react';
import { getDiskUsage } from '../../services/admin.service';
import styles from '../../styles/admin.module.css';

const DiskUsage = () => {
  const [diskInfo, setDiskInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchDiskInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getDiskUsage();
        setDiskInfo(data);
      } catch (err) {
        console.error('Error fetching disk usage:', err);
        setError('Не удалось загрузить информацию о дисковом пространстве');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDiskInfo();
  }, []);
  
  // Функция для форматирования размера в читаемый вид
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  if (loading) {
    return (
      <div className={styles.diskUsageCard}>
        <h3 className={styles.diskUsageTitle}>Дисковое пространство</h3>
        <div className={styles.diskUsageLoading}>Загрузка информации...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={styles.diskUsageCard}>
        <h3 className={styles.diskUsageTitle}>Дисковое пространство</h3>
        <div className={styles.diskUsageError}>{error}</div>
      </div>
    );
  }
  
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
import React, { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

// Компонент загрузки видео
const VideoUploader = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();
  const { authToken } = useAuth();

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const uploadFile = async (e) => {
    e.preventDefault();
    if (!file) {
      setError(t('admin.noFileSelected'));
      return;
    }

    setUploading(true);
    setProgress(0);
    setError('');

    try {
      const formData = new FormData();
      formData.append('video', file);

      console.log(`Uploading file: ${file.name}`);

      // Используем axios для отслеживания прогресса загрузки
      const response = await axios.post(
        `${SERVER_URL}/api/admin/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'x-auth-token': authToken
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percentCompleted);
            console.log(`Upload progress: ${percentCompleted}%`);
          },
          timeout: 3600000 // Увеличиваем таймаут до 1 часа
        }
      );

      console.log('Upload response:', response.data);

      setFile(null);
      if (onUploadSuccess) {
        onUploadSuccess(response.data);
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(err.response?.data?.message || err.message || t('admin.uploadError'));
    } finally {
      setUploading(false);
    }
  };
};

export default VideoUploader; 
// client/src/components/VideoTest.jsx
import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Header from './Layout/Header';
import styles from '../styles/courses.module.css';

const VideoTest = () => {
  const [searchParams] = useSearchParams();
  const videoId = searchParams.get('video');
  
  // Формируем URL на сервер напрямую
  const serverUrl = 'http://localhost:5000';
  const videoUrl = `${serverUrl}/videos/${videoId || 'test.mp4'}`;
  
  return (
    <div>
      <Header />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <h2 style={{ marginBottom: '20px' }}>Просмотр видео: {videoId || 'test.mp4'}</h2>
        
        <div className={styles.videoWrapper} style={{ position: 'relative', paddingTop: '56.25%', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
          <video 
            src={videoUrl}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            controls
            autoPlay={false}
          />
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <p><strong>URL видео:</strong> {videoUrl}</p>
          <a 
            href="/" 
            style={{ display: 'inline-block', padding: '10px 15px', backgroundColor: '#4f46e5', color: 'white', textDecoration: 'none', borderRadius: '5px', marginTop: '10px' }}
          >
            Вернуться на главную
          </a>
        </div>
      </div>
    </div>
  );
};

export default VideoTest;
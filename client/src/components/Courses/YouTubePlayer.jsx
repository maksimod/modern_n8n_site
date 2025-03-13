// client/src/components/Courses/YouTubePlayer.jsx
import React, { useEffect, useRef } from 'react';
import styles from '../../styles/courses.module.css';

const YouTubePlayer = ({ videoUrl }) => {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const playerInstanceRef = useRef(null);

  // Извлекаем YouTube ID из URL
  const extractYoutubeId = (url) => {
    if (!url) return null;
    
    // Youtube URL formats:
    // - https://www.youtube.com/watch?v=VIDEO_ID
    // - https://youtu.be/VIDEO_ID
    // - https://www.youtube.com/embed/VIDEO_ID
    const regexps = [
      /youtube\.com\/watch\?v=([^&]+)/,
      /youtu\.be\/([^?]+)/,
      /youtube\.com\/embed\/([^?]+)/
    ];
    
    for (const regex of regexps) {
      const match = url.match(regex);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  useEffect(() => {
    // Глобальный обработчик для YouTube API
    if (!window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady = () => {
        window.youTubeAPIReady = true;
        
        // Вызываем событие, чтобы уведомить все экземпляры компонента
        const event = new Event('youtubeapiready');
        window.dispatchEvent(event);
      };
    }
    
    const videoId = extractYoutubeId(videoUrl);
    if (!videoId) return;
    
    // Функция для создания плеера
    const createPlayer = () => {
      if (!containerRef.current) return;
      
      if (playerInstanceRef.current) {
        playerInstanceRef.current.destroy();
      }
      
      // Создаем новый div для плеера
      if (playerRef.current) {
        playerRef.current.remove();
      }
      
      playerRef.current = document.createElement('div');
      playerRef.current.id = `youtube-player-${videoId}`;
      containerRef.current.appendChild(playerRef.current);
      
      // Создаем плеер с мобильными параметрами
      playerInstanceRef.current = new window.YT.Player(playerRef.current.id, {
        videoId: videoId,
        playerVars: {
          playsinline: 1,       // Важно для iOS
          rel: 0,               // Не показывать похожие видео
          modestbranding: 1,    // Минимальный брендинг YouTube
          origin: window.location.origin,
          enablejsapi: 1
        },
        events: {
          onReady: (event) => {
            console.log('YouTube player ready');
          },
          onError: (event) => {
            console.error('YouTube player error:', event.data);
          }
        }
      });
    };
    
    // Проверяем, готово ли API
    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      // Ждем, когда API будет готово
      const onYouTubeReady = () => {
        createPlayer();
      };
      
      window.addEventListener('youtubeapiready', onYouTubeReady);
      
      return () => {
        window.removeEventListener('youtubeapiready', onYouTubeReady);
      };
    }
    
    return () => {
      if (playerInstanceRef.current) {
        playerInstanceRef.current.destroy();
        playerInstanceRef.current = null;
      }
    };
  }, [videoUrl]);

  return (
    <div 
      ref={containerRef} 
      className={styles.youtubeContainer}
    ></div>
  );
};

export default YouTubePlayer;
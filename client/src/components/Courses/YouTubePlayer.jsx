// client/src/components/Courses/YouTubePlayer.jsx
import React, { useEffect, useRef, useState } from 'react';
import styles from '../../styles/courses.module.css';

const YouTubePlayer = ({ videoUrl }) => {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const playerInstanceRef = useRef(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [isApiLoading, setIsApiLoading] = useState(false);

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

  // Загрузка YouTube API
  const loadYouTubeAPI = () => {
    if (window.YT && window.YT.Player) {
      setIsApiLoaded(true);
      return Promise.resolve();
    }

    if (isApiLoading) {
      return new Promise((resolve) => {
        window.onYouTubeIframeAPIReady = () => {
          setIsApiLoaded(true);
          resolve();
        };
      });
    }

    return new Promise((resolve) => {
      // Создаем функцию обратного вызова
      window.onYouTubeIframeAPIReady = () => {
        setIsApiLoaded(true);
        resolve();
      };

      // Динамически загружаем скрипт
      setIsApiLoading(true);
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    });
  };

  useEffect(() => {
    const videoId = extractYoutubeId(videoUrl);
    if (!videoId) return;
    
    // Функция для создания плеера
    const createPlayer = async () => {
      if (!containerRef.current) return;
      
      // Загружаем API если необходимо
      try {
        await loadYouTubeAPI();
      } catch (error) {
        console.error('Failed to load YouTube API:', error);
        return;
      }
      
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
      
      try {
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
      } catch (error) {
        console.error('Error creating YouTube player:', error);
      }
    };
    
    createPlayer();
    
    return () => {
      if (playerInstanceRef.current) {
        try {
          playerInstanceRef.current.destroy();
        } catch (error) {
          console.error('Error destroying YouTube player:', error);
        }
        playerInstanceRef.current = null;
      }
    };
  }, [videoUrl]);

  // Если URL недоступен, показываем сообщение
  if (!extractYoutubeId(videoUrl)) {
    return (
      <div className={styles.youtubeError}>
        <p>Видео недоступно</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={styles.youtubeContainer}
    ></div>
  );
};

export default YouTubePlayer;
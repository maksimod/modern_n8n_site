// client/src/components/Courses/YouTubePlayer.jsx
import React, { useEffect, useRef, useState } from 'react';
import styles from '../../styles/courses.module.css';

const YouTubePlayer = ({ videoUrl }) => {
  const containerRef = useRef(null);
  const playerInstanceRef = useRef(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [isApiLoading, setIsApiLoading] = useState(false);

  // Извлекаем YouTube ID из URL
  const extractYoutubeId = (url) => {
    if (!url) return null;
    
    const regexps = [
      /youtube\.com\/watch\?v=([^&]+)/,
      /youtu\.be\/([^?]+)/,
      /youtube\.com\/embed\/([^?]+)/
    ];
    
    for (const regex of regexps) {
      const match = url.match(regex);
      if (match && match[1]) return match[1];
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
      window.onYouTubeIframeAPIReady = () => {
        setIsApiLoaded(true);
        resolve();
      };

      setIsApiLoading(true);
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    });
  };

  useEffect(() => {
    const videoId = extractYoutubeId(videoUrl);
    if (!videoId || !containerRef.current) return;
    
    const createPlayer = async () => {
      try {
        await loadYouTubeAPI();
        
        if (playerInstanceRef.current) {
          playerInstanceRef.current.destroy();
        }
        
        const playerId = `youtube-player-${videoId}`;
        containerRef.current.innerHTML = `<div id="${playerId}"></div>`;
        
        playerInstanceRef.current = new window.YT.Player(playerId, {
          videoId: videoId,
          playerVars: {
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            origin: window.location.origin,
            enablejsapi: 1
          }
        });
      } catch (error) {
        console.error('Error with YouTube player:', error);
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

  if (!extractYoutubeId(videoUrl)) {
    return <div className={styles.youtubeError}><p>Видео недоступно</p></div>;
  }

  return <div ref={containerRef} className={styles.youtubeContainer}></div>;
};

export default YouTubePlayer;
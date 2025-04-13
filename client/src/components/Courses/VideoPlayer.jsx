// client/src/components/Courses/VideoPlayer.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useProgress } from '../../contexts/ProgressContext';
import { SERVER_URL, VIDEO_TYPES, STORAGE_CONFIG } from '../../config';
import styles from '../../styles/courses.module.css';

const VideoPlayer = ({ course, video, onVideoComplete, onVideoDelete }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { updateVideoProgress, isVideoCompleted } = useProgress();
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [fallbackToText, setFallbackToText] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [connectionSpeed, setConnectionSpeed] = useState('high'); // 'low', 'medium', 'high'
  const videoRef = useRef(null);
  const downloadStartTime = useRef(null);
  const downloadedBytes = useRef(0);
  const [testLimitReached, setTestLimitReached] = useState(false);
  const [chunksLoaded, setChunksLoaded] = useState(0);
  const [currentBuffer, setCurrentBuffer] = useState('');

  // Определение типа видео
  const detectVideoType = useCallback((videoData) => {
    if (!videoData) return VIDEO_TYPES.TEXT;
    if (fallbackToText) return VIDEO_TYPES.TEXT;
    if (videoData.videoType) return videoData.videoType;
    if (videoData.storagePath && STORAGE_CONFIG.USE_REMOTE_STORAGE) return VIDEO_TYPES.STORAGE;
    if (videoData.localVideo) return VIDEO_TYPES.LOCAL;
    if (videoData.storagePath && !STORAGE_CONFIG.USE_REMOTE_STORAGE) return VIDEO_TYPES.LOCAL;
    if (videoData.videoUrl) return VIDEO_TYPES.EXTERNAL;
    return VIDEO_TYPES.TEXT;
  }, [fallbackToText]);

  const videoType = detectVideoType(video);

  useEffect(() => {
    if (currentUser && course?.id && video?.id) {
      setCompleted(isVideoCompleted(course.id, video.id));
    }
    // Сбрасываем состояние при смене видео
    setError(null);
    setRetryCount(0);
    setFallbackToText(false);
  }, [currentUser, course, video, isVideoCompleted]);

  // Обработчик для отметки видео как просмотренного
  const handleComplete = async () => {
    if (loading || !currentUser) return;
    
    setLoading(true);
    try {
      const newStatus = !completed;
      await updateVideoProgress(course.id, video.id, newStatus);
      setCompleted(newStatus);
      
      if (onVideoComplete) {
        onVideoComplete(video.id, newStatus);
      }
    } catch (err) {
      console.error('Error updating progress:', err);
      setError('Ошибка при обновлении прогресса');
    } finally {
      setLoading(false);
    }
  };

  // Обработчик ошибки при загрузке видео
  const handleVideoError = useCallback((e) => {
    console.error('Video loading error:', e);
    
    // Если уже пробовали несколько раз и не получилось, показываем текстовый режим
    if (retryCount >= 2) {
      setError('Не удалось загрузить видео после нескольких попыток.');
      setFallbackToText(true);
      return;
    }
    
    setError(`Ошибка при загрузке видео. Попытка ${retryCount + 1} из 3.`);
    setRetryCount(prev => prev + 1);
    
    if (videoType === VIDEO_TYPES.STORAGE && video.storagePath) {
      loadVideoWithAlternativeMethods(video.storagePath);
    }
  }, [retryCount, videoType, video]);
  
  // Объединенная функция для загрузки видео альтернативными методами
  const loadVideoWithAlternativeMethods = useCallback((storagePath) => {
    if (!storagePath) return;
    
    const cleanPath = storagePath.replace(/^\/videos\//, '');
    const timestamp = new Date().getTime();
    
    // Используем разные URL для разных попыток, чтобы избежать кэширования ошибок
    let url;
    if (retryCount === 0) {
      url = `/api/proxy/storage/${encodeURIComponent(cleanPath)}?t=${timestamp}`;
    } else if (retryCount === 1) {
      url = `/api/videos/${encodeURIComponent(cleanPath)}?t=${timestamp}`;
    } else {
      url = `/download/${encodeURIComponent(cleanPath)}?t=${timestamp}`;
    }
    
    setError(`Загрузка видео альтернативным методом... (${retryCount + 1}/3)`);
    
    // Обновляем source у видео напрямую
    const videoElement = document.querySelector(`.${styles.videoElement}`);
    if (videoElement) {
      const source = videoElement.querySelector('source');
      if (source) {
        source.src = url;
        videoElement.load();
      }
    }
  }, [retryCount]);
  
  // Получение URL для хранилища
  const getStorageVideoUrl = useCallback((storagePath) => {
    if (!storagePath) return '';
    
    // Очищаем путь от потенциальных префиксов
    const cleanPath = storagePath.replace(/^\/videos\//, '');
    
    // Добавляем timestamp для предотвращения кэширования
    const timestamp = new Date().getTime();
    
    // Формируем правильный URL для прокси, который обращается к обновлённому API хранилища
    // Здесь важно: путь к файлу теперь передаётся как часть URL, а не как query параметр
    return `/api/proxy/storage/${encodeURIComponent(cleanPath)}?t=${timestamp}`;
  }, []);

  // Функция для предзагрузки следующего видео
  const preloadNextVideo = useCallback(() => {
    if (!course || !course.videos || !video) return;
    
    // Находим текущее видео в списке курса
    const currentIndex = course.videos.findIndex(v => v.id === video.id);
    if (currentIndex === -1 || currentIndex >= course.videos.length - 1) return;
    
    // Получаем следующее видео
    const nextVideo = course.videos[currentIndex + 1];
    if (!nextVideo) return;
    
    // Определяем тип следующего видео для предзагрузки
    const nextVideoType = detectVideoType(nextVideo);
    
    // Создаем ссылку на ресурс для предзагрузки
    let preloadUrl = '';
    
    if (nextVideoType === VIDEO_TYPES.STORAGE && nextVideo.storagePath) {
      preloadUrl = getStorageVideoUrl(nextVideo.storagePath);
    } else if (nextVideoType === VIDEO_TYPES.LOCAL && nextVideo.localVideo) {
      preloadUrl = `${SERVER_URL}/videos/${nextVideo.localVideo.replace(/^\/videos\//, '')}`;
    } else if (nextVideoType === VIDEO_TYPES.EXTERNAL && nextVideo.videoUrl) {
      // Для YouTube и других внешних ресурсов предзагрузка не требуется
      return;
    }
    
    if (!preloadUrl) return;
    
    // Создаем элемент link для предзагрузки
    const linkEl = document.createElement('link');
    linkEl.rel = 'preload';
    linkEl.as = 'video';
    linkEl.href = preloadUrl;
    
    // Добавляем элемент в head
    document.head.appendChild(linkEl);
    
    console.log(`Preloading next video: ${nextVideo.title}`);
  }, [course, video, detectVideoType, getStorageVideoUrl]);
  
  // Запускаем предзагрузку следующего видео при монтировании
  useEffect(() => {
    // Небольшая задержка для приоритета загрузки текущего видео
    const timer = setTimeout(() => {
      preloadNextVideo();
    }, 5000); // 5 секунд задержки для приоритета текущего видео
    
    return () => clearTimeout(timer);
  }, [preloadNextVideo]);

  // Обработчик для скачивания видео
  const handleDownload = () => {
    try {
      let downloadUrl;
      let fileName = video.title ? `${video.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4` : 'video.mp4';
      
      if (videoType === VIDEO_TYPES.STORAGE && video.storagePath && STORAGE_CONFIG.USE_REMOTE_STORAGE) {
        downloadUrl = getStorageVideoUrl(video.storagePath);
      } else if ((videoType === VIDEO_TYPES.LOCAL && video.localVideo) || 
                (videoType === VIDEO_TYPES.STORAGE && video.storagePath && !STORAGE_CONFIG.USE_REMOTE_STORAGE)) {
        const localPath = video.localVideo || video.storagePath;
        const cleanVideoPath = localPath.replace(/^\/videos\//, '');
        downloadUrl = `/api/videos/${cleanVideoPath}`;
      } else {
        setError('Невозможно скачать внешнее видео');
        return;
      }
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading video:', err);
      setError('Ошибка при скачивании видео');
    }
  };

  // Функция для удаления видео
  const handleDelete = () => {
    if (onVideoDelete && video && course) {
      onVideoDelete(course.id, video.id);
    }
  };

  // Преобразование видео URL для YouTube
  const getEmbedUrl = (url) => {
    if (!url) return '';
    
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('watch?v=')[1].split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1].split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    return url;
  };

  // Обработчик буферизации для локальных видео
  const handleBuffering = useCallback((e) => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    if (video.readyState < 3) { // HAVE_FUTURE_DATA = 3
      setIsBuffering(true);
    } else {
      setIsBuffering(false);
    }
    
    // Рассчитываем прогресс загрузки
    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const duration = video.duration;
      const progress = (bufferedEnd / duration) * 100;
      setLoadProgress(progress);
    }
  }, []);
  
  // Функция для определения скорости соединения
  const measureConnectionSpeed = useCallback((progressEvent) => {
    if (!downloadStartTime.current) {
      downloadStartTime.current = Date.now();
      downloadedBytes.current = 0;
      return;
    }
    
    // Получаем количество загруженных байт и затраченное время
    const currentBytes = progressEvent.loaded;
    const bytesDelta = currentBytes - downloadedBytes.current;
    downloadedBytes.current = currentBytes;
    
    const currentTime = Date.now();
    const timeDelta = currentTime - downloadStartTime.current;
    
    // Если прошло достаточно времени для измерения
    if (timeDelta >= 1000) { // 1 секунда
      // Рассчитываем скорость в байтах в секунду
      const bytesPerSecond = (downloadedBytes.current / timeDelta) * 1000;
      const kilobytesPerSecond = bytesPerSecond / 1024;
      
      // Определяем качество соединения
      let newSpeed;
      if (kilobytesPerSecond < 200) {
        newSpeed = 'low';
      } else if (kilobytesPerSecond < 1000) {
        newSpeed = 'medium';
      } else {
        newSpeed = 'high';
      }
      
      if (newSpeed !== connectionSpeed) {
        setConnectionSpeed(newSpeed);
        adjustVideoQuality(newSpeed);
      }
      
      // Сбрасываем для нового измерения
      downloadStartTime.current = currentTime;
      downloadedBytes.current = 0;
    }
  }, [connectionSpeed]);
  
  // Функция для адаптации качества видео
  const adjustVideoQuality = useCallback((speed) => {
    const video = videoRef.current;
    if (!video) return;
    
    console.log(`Adjusting video quality based on connection speed: ${speed}`);
    
    switch (speed) {
      case 'low':
        // Для слабого соединения
        video.playbackQuality = 'low';
        video.preload = 'metadata'; // Только метаданные
        break;
      case 'medium':
        // Для среднего соединения
        video.playbackQuality = 'medium';
        video.preload = 'auto';
        break;
      case 'high':
        // Для хорошего соединения
        video.playbackQuality = 'high';
        video.preload = 'auto';
        break;
      default:
        break;
    }
  }, []);
  
  // Функция отслеживания загрузки чанков видео
  const handleProgress = useCallback((e) => {
    const video = e.target;
    if (!video || !video.buffered || video.buffered.length === 0) return;
    
    // Собираем информацию о буферизации
    const bufferInfo = [];
    for (let i = 0; i < video.buffered.length; i++) {
      const start = Math.floor(video.buffered.start(i));
      const end = Math.floor(video.buffered.end(i));
      bufferInfo.push(`${start}с-${end}с`);
    }
    
    // Вычисляем сколько чанков загружено (примерно)
    const lastEnd = Math.floor(video.buffered.end(video.buffered.length - 1));
    const approxChunks = Math.ceil(lastEnd / 5); // Примерно 5 секунд на чанк
    
    setCurrentBuffer(bufferInfo.join(', '));
    setChunksLoaded(approxChunks);
    
    // Если загрузили хотя бы 2 секунды и видео ещё не играет - автоматически запускаем
    if (lastEnd >= 2 && video.paused && video.readyState >= 3) {
      try {
        video.play().catch(err => console.log("Автозапуск не сработал:", err));
      } catch (err) {
        console.log("Ошибка при автозапуске:", err);
      }
    }
    
    console.log(`ЧАНКИ: Загружено ~${approxChunks} чанков, буферы: ${bufferInfo.join(', ')}`);
  }, []);

  // Добавляем обработчик для тестового ограничения в 10 секунд
  const handleVideoEnded = useCallback((e) => {
    console.log('Video playback ended or stalled');
    
    // Проверяем, не закончился ли тестовый чанк
    if (videoRef.current && videoRef.current.currentTime > 0) {
      setTestLimitReached(true);
      console.log('Тестовое ограничение: 10-секундный чанк воспроизведен');
    }
  }, []);

  // Добавляем обработчик для ошибок загрузки после начала воспроизведения
  const handleVideoStalled = useCallback((e) => {
    console.log('Video stalled or buffering event');
    
    // Если видео уже что-то воспроизвело и затем остановилось, предполагаем что достигли конца тестового чанка
    if (videoRef.current && videoRef.current.currentTime > 5) { // если проиграли хотя бы 5 секунд
      setTestLimitReached(true);
      console.log('Тестовое ограничение: воспроизведение прервано после частичной загрузки');
    }
  }, []);

  // Установка слушателей для видео
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const events = ['loadeddata', 'waiting', 'canplay', 'canplaythrough', 'playing', 'timeupdate'];
    
    events.forEach(event => {
      video.addEventListener(event, handleBuffering);
    });
    
    // Добавляем слушатели для тестового режима
    video.addEventListener('ended', handleVideoEnded);
    video.addEventListener('stalled', handleVideoStalled);
    video.addEventListener('error', handleVideoEnded);
    
    // Добавляем слушатель для события progress
    video.addEventListener('progress', handleProgress);
    
    return () => {
      events.forEach(event => {
        video.removeEventListener(event, handleBuffering);
      });
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('ended', handleVideoEnded);
      video.removeEventListener('stalled', handleVideoStalled);
      video.removeEventListener('error', handleVideoEnded);
    };
  }, [handleBuffering, handleProgress, handleVideoEnded, handleVideoStalled]);

  if (!video) {
    return <div className={styles.selectVideo}>{t('selectVideo')}</div>;
  }

  // Общий компонент для информации о видео
  const VideoInfo = () => (
    <div className={styles.videoInfo}>
      <div className={styles.videoHeader}>
        <h2 className={styles.videoTitle}>{video.title}</h2>
        <div className={styles.videoActions}>
          {(videoType === VIDEO_TYPES.STORAGE || videoType === VIDEO_TYPES.LOCAL) && (
            <button className={styles.downloadButton} onClick={handleDownload}>
              {t('course.download')}
            </button>
          )}
        </div>
      </div>
      <div className={styles.videoDescription}>{video.description}</div>
      <button 
        className={`${styles.markButton} ${completed ? styles.completed : ''}`}
        onClick={handleComplete}
      >
        {completed ? t('course.completed') : t('course.markCompleted')}
      </button>
    </div>
  );


  // Если мы в режиме текстового урока (по умолчанию или после ошибок)
  if (videoType === VIDEO_TYPES.TEXT || fallbackToText) {
    return (
      <div className={styles.videoPlayer}>
        <div className={styles.textLesson}>
          <h2 className={styles.videoTitle}>{video.title}</h2>
          <div className={styles.videoDescription}>
            {error && <div className={styles.errorBlock}>{error}</div>}
            {video.description}
          </div>
          <div className={styles.videoActions}>
            <button 
              className={`${styles.markButton} ${completed ? styles.completed : ''}`}
              onClick={handleComplete}
            >
              {completed ? t('course.completed') : t('course.markCompleted')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.videoPlayer}>
      {/* Видео из веб-хранилища */}
      {videoType === VIDEO_TYPES.STORAGE && video.storagePath && STORAGE_CONFIG.USE_REMOTE_STORAGE && (
        <>
          <div className={styles.videoContainer}>
            <video 
              controls
              className={styles.videoElement}
              playsInline
              preload="metadata"
              onError={handleVideoError}
              onCanPlay={() => setError(null)}
              onProgress={handleProgress}
            >
              <source 
                src={`${getStorageVideoUrl(video.storagePath)}&_force_chunks=1&_t=${Date.now()}`} 
                type="video/mp4"
              />
              {t('course.browserNotSupportVideo')}
            </video>
            
            {/* Индикатор тестового ограничения */}
            {testLimitReached && (
              <div className={styles.testLimitMessage || 'test-limit-message'} style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '10px',
                borderRadius: '5px',
                zIndex: 100
              }}>
                <strong>Тест успешен!</strong> Воспроизведен 10-секундный чанк видео.
              </div>
            )}
          </div>
          
          {error && !testLimitReached && (
            <div className={styles.errorMessage}>
              {error}
              <button 
                className={styles.retryButton}
                onClick={() => {
                  setRetryCount(prev => prev + 1);
                  loadVideoWithAlternativeMethods(video.storagePath);
                }}
              >
                {t('course.retryLoading')}
              </button>
              <button 
                className={styles.fallbackButton}
                onClick={() => setFallbackToText(true)}
              >
                Открыть как текст
              </button>
            </div>
          )}
          
          <VideoInfo />
        </>
      )}

      {/* Локальное видео */}
      {(videoType === VIDEO_TYPES.LOCAL && video.localVideo) || 
       (videoType === VIDEO_TYPES.STORAGE && video.storagePath && !STORAGE_CONFIG.USE_REMOTE_STORAGE) ? (
        <>
          {/* Проверка YouTube перенесена выше контейнера видео */}
          <div className={styles.videoContainer}>
            <video 
              ref={videoRef}
              controls
              className={styles.videoElement}
              playsInline
              preload="metadata"
              onError={handleVideoError}
              onCanPlay={() => setError(null)}
              controlsList="nodownload"
              autoPlay={false}
              key={`video-${video.id}-${Date.now()}`}
              onProgress={handleProgress}
            >
              <source 
                src={`${SERVER_URL}/videos/${(video.localVideo || video.storagePath).replace(/^\/videos\//, '')}?_force_chunks=1&_t=${Date.now()}`} 
                type="video/mp4"
              />
              {t('course.browserNotSupportVideo')}
            </video>
            
            {/* Индикатор загрузки перед началом воспроизведения */}
            {isBuffering && !testLimitReached && <div className={styles.loadingIndicator}></div>}
            
            {/* Прогресс загрузки */}
            <div 
              className={styles.loadProgress} 
              style={{ width: `${loadProgress}%` }}
              aria-hidden="true"
            ></div>
            
            {/* Индикатор тестового ограничения */}
            {testLimitReached && (
              <div className={styles.testLimitMessage || 'test-limit-message'} style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '10px',
                borderRadius: '5px',
                zIndex: 100
              }}>
                <strong>Тест успешен!</strong> Воспроизведен 10-секундный чанк видео.
              </div>
            )}
          </div>
          {error && !testLimitReached && (
            <div className={styles.errorMessage}>
              {error}
              <button 
                className={styles.fallbackButton}
                onClick={() => setFallbackToText(true)}
              >
                Открыть как текст
              </button>
            </div>
          )}
          <VideoInfo />
        </>
      ) : null}

      {/* Внешнее видео (YouTube) */}
      {videoType === VIDEO_TYPES.EXTERNAL && video.videoUrl && (
        <>
          {/* Проверка для YouTube видео - вынесена над контейнером */}
          {video.videoUrl.includes('youtube.com') || video.videoUrl.includes('youtu.be') ? (
            <div className={styles.youtubeWarning}>
              <p>Внимание! Для просмотра видео с YouTube может потребоваться VPN.</p>
            </div>
          ) : null}
          
          <div className={styles.videoContainer}>
            {/* Проверка, что мы не находимся во вложенном iframe */}
            {window.self === window.top ? (
              <iframe 
                src={getEmbedUrl(video.videoUrl)}
                title={video.title}
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
                className={styles.videoElement}
              ></iframe>
            ) : (
              <div className={styles.youtubeError}>
                <p>Для просмотра YouTube видео, пожалуйста, перейдите на главную страницу и запустите видео заново.</p>
              </div>
            )}
          </div>
          <VideoInfo />
        </>
      )}
    </div>
  );
};

export default VideoPlayer;
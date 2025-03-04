// client/src/components/Cources/CourceList.jsx - исправление проблемы с дублированием галочки
const CourseItem = ({ course, currentVideo }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [progress, setProgress] = useState({});
  const navigate = useNavigate(); // Добавляем навигацию

  useEffect(() => {
    if (currentUser && course) {
      const userProgress = getCourseProgress(currentUser, course.id);
      setProgress(userProgress || {});
    }
  }, [currentUser, course]);

  if (!course) return null;

  const completionPercentage = calculateCourseCompletion(currentUser, course);

  const handleCheckboxChange = async (videoId, isChecked, e) => {
    e.stopPropagation(); // Предотвращаем срабатывание клика на ссылке
    e.preventDefault(); // Предотвращаем переход по ссылке
    
    if (!currentUser) {
      // Если пользователь не авторизован, перенаправляем на страницу входа
      alert('Необходимо авторизоваться для отметки просмотра');
      navigate('/auth');
      return;
    }
    
    if (currentUser && course?.id) {
      try {
        await markVideoAsCompleted(currentUser.id, course.id, videoId, isChecked);
        // Обновляем состояние прогресса
        setProgress(prev => ({
          ...prev,
          [videoId]: isChecked
        }));
      } catch (error) {
        console.error('Error updating video status:', error);
        
        // Проверяем наличие ошибки авторизации
        if (error.response && error.response.status === 401) {
          alert('Сессия истекла. Пожалуйста, войдите снова.');
          navigate('/auth');
        }
      }
    }
  };

  return (
    <div className={styles.videosList}>
      <h3 className={styles.sidebarTitle}>{course.title}</h3>
      
      {completionPercentage > 0 && (
        <div className={styles.progressContainer}>
          <div 
            className={styles.progressBar}
            style={{ width: `${completionPercentage}%` }}
          ></div>
          <span className={styles.progressText}>
            {completionPercentage}% {t('course.completed')}
          </span>
        </div>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        {course.videos.map((video, index) => {
          const isCompleted = progress[video.id];
          const isActive = currentVideo && currentVideo.id === video.id;

          return (
            <Link
              key={video.id}
              to={`/course/${course.id}?video=${video.id}`}
              className={`${styles.videoCard} ${isActive ? styles.videoCardActive : ''} ${
                isCompleted ? styles.videoCardCompleted : ''
              }`}
            >
              <div className={styles.videoNumber}>
                {index + 1}
              </div>
              <div className={styles.videoCardInfo}>
                <div className={styles.videoCardHeader}>
                  <h4 className={styles.videoCardTitle}>{video.title}</h4>
                  <span className={styles.videoDuration}>{video.duration}</span>
                </div>
                <div className={styles.videoCardMeta}>
                  {isCompleted && (
                    <span className={styles.videoCardStatus}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5"></path>
                      </svg>
                      {t('course.completed')}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
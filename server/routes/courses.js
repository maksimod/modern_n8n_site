const express = require('express');
const router = express.Router(); // Создаем роутер


// routes/courses.js
const coursesData = {
  ru: [
    {
      id: 'n8n-basics',
      title: 'Основы n8n',
      description: 'Изучите основы n8n',
      videos: [
        {
          id: 'n8n-interface',
          title: 'Интерфейс',
          description: '',
          duration: '12:25',
          videoUrl: 'https://www.youtube.com/watch?v=ypJT_r_GSSM',
          isPrivate: false
        },
        {
          id: 'n8n-triggers',
          title: 'Триггеры',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-action-in-app',
          title: 'Узлы «Action in app»',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-credentials',
          title: 'Credentials',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-data-transformation',
          title: 'Узлы «Data transformation»',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-flow',
          title: 'Узлы «Flow»',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-core',
          title: 'Узлы "Core"',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-json',
          title: 'JSON',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-work-with-data',
          title: 'Работа с данными',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-postgres',
          title: 'Postgres',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-google-cloud-console',
          title: 'Google cloud console',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-google-sheets',
          title: 'Google sheets',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-google-drive',
          title: 'Google drive',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-practice-easy',
          title: 'Практика: простой workflow',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-telegram-trigger',
          title: 'Практика: Telegram Trigger',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-telegram-bot',
          title: 'Практика: телеграм бот',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-practice-hard',
          title: 'Практика: сложный workflow',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
      ]
    },
  ],
  en: [
    {
      id: 'n8n-basics',
      title: 'The basics of n8n',
      description: 'Learn the basics of n8n',
      videos: [
        {
          id: 'n8n-interface',
          title: 'Интерфейс',
          description: '',
          duration: '12:25',
          videoUrl: 'https://www.youtube.com/watch?v=ypJT_r_GSSM',
          isPrivate: false
        },
        {
          id: 'n8n-triggers',
          title: 'Триггеры',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-action-in-app',
          title: 'Узлы «Action in app»',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-credentials',
          title: 'Credentials',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-data-transformation',
          title: 'Узлы «Data transformation»',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-flow',
          title: 'Узлы «Flow»',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-core',
          title: 'Узлы "Core"',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-json',
          title: 'JSON',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-work-with-data',
          title: 'Работа с данными',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-postgres',
          title: 'Postgres',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-google-cloud-console',
          title: 'Google cloud console',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-google-sheets',
          title: 'Google sheets',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-google-drive',
          title: 'Google drive',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-practice-easy',
          title: 'Практика: простой workflow',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-telegram-trigger',
          title: 'Практика: Telegram Trigger',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-telegram-bot',
          title: 'Практика: телеграм бот',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'n8n-practice-hard',
          title: 'Практика: сложный workflow',
          description: '',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
      ]
    },
  ]
};

// Получить все курсы
const getCourses = (language = 'ru') => {
  return Promise.resolve(coursesData[language] || coursesData.ru);
};

// Получить курс по ID
const getCourseById = (courseId, language = 'ru') => {
  const courses = coursesData[language] || coursesData.ru;
  const course = courses.find(c => c.id === courseId);
  return Promise.resolve(course || null);
};

// Получить видео по ID
const getVideoById = (courseId, videoId, language = 'ru') => {
  const course = (coursesData[language] || coursesData.ru).find(c => c.id === courseId);
  if (!course) return Promise.resolve(null);
  
  const video = course.videos.find(v => v.id === videoId);
  return Promise.resolve(video || null);
};

const markVideoAsCompleted = async (userId, courseId, videoId, completed = true) => {
  // В локальной версии здесь обновляем прогресс в localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (!user.id) return null;
  
  if (!user.progress) {
    user.progress = {};
  }
  
  if (!user.progress[courseId]) {
    user.progress[courseId] = {};
  }
  
  user.progress[courseId][videoId] = completed;
  
  localStorage.setItem('user', JSON.stringify(user));
  
  return user.progress;
};

const getCourseProgress = (user, courseId) => {
  if (!user || !user.progress || !user.progress[courseId]) {
    return {};
  }
  return user.progress[courseId];
};

const calculateCourseCompletion = (user, course) => {
  if (!user || !course || !user.progress || !user.progress[course.id]) {
    return 0;
  }
  
  const progress = user.progress[course.id];
  const totalVideos = course.videos.length;
  const completedVideos = Object.values(progress).filter(completed => completed).length;
  
  return totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
};

// Роуты
router.get('/', async (req, res) => {
  const language = req.query.language || 'ru';
  const courses = await getCourses(language);
  res.json(courses);
});

router.get('/:courseId', async (req, res) => {
  const { courseId } = req.params;
  const language = req.query.language || 'ru';
  const course = await getCourseById(courseId, language);
  if (course) {
    res.json(course);
  } else {
    res.status(404).json({ message: 'Course not found' });
  }
});

router.get('/:courseId/videos/:videoId', async (req, res) => {
  const { courseId, videoId } = req.params;
  const language = req.query.language || 'ru';
  const video = await getVideoById(courseId, videoId, language);
  if (video) {
    res.json(video);
  } else {
    res.status(404).json({ message: 'Video not found' });
  }
});

module.exports = router;
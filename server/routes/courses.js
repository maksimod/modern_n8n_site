const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Sample course data (in a real app, this would come from a database)
const coursesData = {
  ru: [
    {
      id: 'frontend-basics',
      title: 'Основы фронтенд-разработки',
      description: 'Изучите основы HTML, CSS и JavaScript',
      videos: [
        {
          id: 'html-intro',
          title: 'Введение в HTML',
          description: 'Основы HTML и структура документа',
          duration: '10:15',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'css-basics',
          title: 'Основы CSS',
          description: 'Стилизация веб-страниц с помощью CSS',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'js-fundamentals',
          title: 'Основы JavaScript',
          description: 'Введение в JavaScript и основные концепции',
          duration: '15:45',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: true
        }
      ]
    },
    {
      id: 'react-basics',
      title: 'Основы React',
      description: 'Изучите основы библиотеки React',
      videos: [
        {
          id: 'react-intro',
          title: 'Введение в React',
          description: 'Что такое React и зачем он нужен',
          duration: '8:20',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'react-components',
          title: 'Компоненты в React',
          description: 'Создание и использование компонентов',
          duration: '14:10',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: true
        },
        {
          id: 'react-hooks',
          title: 'Хуки в React',
          description: 'Использование хуков для управления состоянием',
          duration: '18:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: true
        }
      ]
    },
    {
      id: 'nodejs-basics',
      title: 'Основы Node.js',
      description: 'Изучите основы серверной разработки на Node.js',
      videos: [
        {
          id: 'nodejs-intro',
          title: 'Введение в Node.js',
          description: 'Что такое Node.js и как он работает',
          duration: '9:45',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'express-basics',
          title: 'Основы Express',
          description: 'Создание серверных приложений с Express',
          duration: '16:20',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: true
        }
      ]
    }
  ],
  en: [
    {
      id: 'frontend-basics',
      title: 'Frontend Development Basics',
      description: 'Learn the fundamentals of HTML, CSS, and JavaScript',
      videos: [
        {
          id: 'html-intro',
          title: 'Introduction to HTML',
          description: 'HTML basics and document structure',
          duration: '10:15',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'css-basics',
          title: 'CSS Basics',
          description: 'Styling web pages with CSS',
          duration: '12:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'js-fundamentals',
          title: 'JavaScript Fundamentals',
          description: 'Introduction to JavaScript and core concepts',
          duration: '15:45',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: true
        }
      ]
    },
    {
      id: 'react-basics',
      title: 'React Basics',
      description: 'Learn the fundamentals of React library',
      videos: [
        {
          id: 'react-intro',
          title: 'Introduction to React',
          description: 'What is React and why use it',
          duration: '8:20',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'react-components',
          title: 'React Components',
          description: 'Creating and using components',
          duration: '14:10',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: true
        },
        {
          id: 'react-hooks',
          title: 'React Hooks',
          description: 'Using hooks for state management',
          duration: '18:30',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: true
        }
      ]
    },
    {
      id: 'nodejs-basics',
      title: 'Node.js Basics',
      description: 'Learn the fundamentals of server-side development with Node.js',
      videos: [
        {
          id: 'nodejs-intro',
          title: 'Introduction to Node.js',
          description: 'What is Node.js and how it works',
          duration: '9:45',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: false
        },
        {
          id: 'express-basics',
          title: 'Express Basics',
          description: 'Building server applications with Express',
          duration: '16:20',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isPrivate: true
        }
      ]
    }
  ]
};

// @route   GET api/courses
// @desc    Get all courses
// @access  Private
router.get('/', auth, (req, res) => {
  try {
    const language = req.query.language || 'ru';
    const courses = coursesData[language] || coursesData.ru;
    res.json(courses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/courses/:id
// @desc    Get course by ID
// @access  Private
router.get('/:id', auth, (req, res) => {
  try {
    const language = req.query.language || 'ru';
    const courses = coursesData[language] || coursesData.ru;
    const course = courses.find(c => c.id === req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    res.json(course);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/courses/:courseId/videos/:videoId
// @desc    Get video by ID
// @access  Private
router.get('/:courseId/videos/:videoId', auth, (req, res) => {
  try {
    const { courseId, videoId } = req.params;
    const language = req.query.language || 'ru';
    const courses = coursesData[language] || coursesData.ru;
    
    const course = courses.find(c => c.id === courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    const video = course.videos.find(v => v.id === videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    res.json(video);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
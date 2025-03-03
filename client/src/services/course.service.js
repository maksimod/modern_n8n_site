// Данные о курсах (в реальном приложении получались бы с сервера)
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
        }
      ]
    }
  ]
};

// Получить все курсы
export const getCourses = (language = 'ru') => {
  return Promise.resolve(coursesData[language] || coursesData.ru);
};

// Получить курс по ID
export const getCourseById = (courseId, language = 'ru') => {
  const courses = coursesData[language] || coursesData.ru;
  const course = courses.find(c => c.id === courseId);
  return Promise.resolve(course || null);
};

// Получить видео по ID
export const getVideoById = (courseId, videoId, language = 'ru') => {
  const course = (coursesData[language] || coursesData.ru).find(c => c.id === courseId);
  if (!course) return Promise.resolve(null);
  
  const video = course.videos.find(v => v.id === videoId);
  return Promise.resolve(video || null);
};
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Переводы
const resources = {
  en: {
    translation: {
      // Общие
      "videoCourses": "Video Courses",
      "loading": "Loading...",
      "videos": "videos",
      "logout": "Logout",
      "course.markCompleted": "Mark as completed",
      "course.completed": "Completed",
      "course.courses": "Courses",
      "course.continueCourse": "Continue course",
      "course.startCourse": "Start course",
      // Авторизация
      "login": "Login",
      "register": "Register",
      "username": "Username",
      "password": "Password",
      "confirmPassword": "Confirm Password",
      "enterYourData": "Enter your credentials",
      "createAccount": "Create a new account",
      "noAccount": "Don't have an account?",
      "hasAccount": "Already have an account?",
      "enterAllFields": "Please fill in all fields",
      "passwordsDontMatch": "Passwords don't match",
      "userExists": "User with this username already exists",
      "wrongCredentials": "Invalid username or password",
      
      // Курсы
      "courseContents": "Course Content",
      "duration": "Duration",
      "selectVideo": "Select a video from the list",
      "backToCourses": "← Back to courses",
      "previous": "Previous",
      "next": "Next"
    }
  },
  ru: {
    translation: {
      // Общие
      "videoCourses": "Видеокурсы",
      "loading": "Загрузка...",
      "videos": "видео",
      "logout": "Выход",
      "course.markCompleted": "Отметить как просмотренное",
      "course.completed": "Просмотрено",
      "course.courses": "Курсы",
      "course.continueCourse": "Продолжить курс",
      "course.startCourse": "Начать курс",
      // Авторизация
      "login": "Вход",
      "register": "Регистрация",
      "username": "Имя пользователя",
      "password": "Пароль",
      "confirmPassword": "Подтвердите пароль",
      "enterYourData": "Введите свои данные для входа",
      "createAccount": "Создайте новую учетную запись",
      "noAccount": "Нет учетной записи?",
      "hasAccount": "Уже есть учетная запись?",
      "enterAllFields": "Заполните все поля",
      "passwordsDontMatch": "Пароли не совпадают",
      "userExists": "Пользователь с таким именем уже существует",
      "wrongCredentials": "Неверное имя пользователя или пароль",
      
      // Курсы
      "courseContents": "Содержание курса",
      "duration": "Продолжительность",
      "selectVideo": "Выберите видео из списка",
      "backToCourses": "← Назад к курсам",
      "previous": "Предыдущее",
      "next": "Следующее"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'ru', // Язык по умолчанию
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
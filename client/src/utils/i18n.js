import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          // Auth
          'auth.welcome': 'Welcome to Video Learning Platform',
          'auth.login': 'Log In',
          'auth.register': 'Register',
          'auth.username': 'Username',
          'auth.password': 'Password',
          'auth.confirmPassword': 'Confirm Password',
          'auth.noAccount': 'Don\'t have an account?',
          'auth.haveAccount': 'Already have an account?',
          'auth.usernameRequired': 'Username is required',
          'auth.passwordRequired': 'Password is required',
          'auth.passwordMatch': 'Passwords must match',
          'auth.usernameExists': 'Username already exists',
          'auth.invalidCredentials': 'Invalid username or password',
          
          // Navigation
          'nav.home': 'Home',
          'nav.profile': 'Profile',
          'nav.logout': 'Log Out',
          'nav.language': 'Language',
          
          // Course
          'course.courses': 'Courses',
          'course.progress': 'Your Progress',
          'course.markCompleted': 'Mark as completed',
          'course.completed': 'Completed',
          'course.watchNext': 'Watch Next',
          'course.startCourse': 'Start Course',
          'course.continueCourse': 'Continue Course',
          
          // Common
          'common.loading': 'Loading...',
          'common.error': 'An error occurred',
          'common.save': 'Save',
          'common.cancel': 'Cancel',
          'common.search': 'Search',
          'common.back': 'Back',
          'common.next': 'Next'
        }
      },
      ru: {
        translation: {
          // Auth
          'auth.welcome': 'Добро пожаловать на платформу видеообучения',
          'auth.login': 'Войти',
          'auth.register': 'Зарегистрироваться',
          'auth.username': 'Имя пользователя',
          'auth.password': 'Пароль',
          'auth.confirmPassword': 'Подтвердите пароль',
          'auth.noAccount': 'Нет аккаунта?',
          'auth.haveAccount': 'Уже есть аккаунт?',
          'auth.usernameRequired': 'Имя пользователя обязательно',
          'auth.passwordRequired': 'Пароль обязателен',
          'auth.passwordMatch': 'Пароли должны совпадать',
          'auth.usernameExists': 'Имя пользователя уже занято',
          'auth.invalidCredentials': 'Неверное имя пользователя или пароль',
          
          // Navigation
          'nav.home': 'Главная',
          'nav.profile': 'Профиль',
          'nav.logout': 'Выйти',
          'nav.language': 'Язык',
          
          // Course
          'course.courses': 'Курсы',
          'course.progress': 'Ваш прогресс',
          'course.markCompleted': 'Отметить как выполненное',
          'course.completed': 'Выполнено',
          'course.watchNext': 'Смотреть далее',
          'course.startCourse': 'Начать курс',
          'course.continueCourse': 'Продолжить курс',
          
          // Common
          'common.loading': 'Загрузка...',
          'common.error': 'Произошла ошибка',
          'common.save': 'Сохранить',
          'common.cancel': 'Отмена',
          'common.search': 'Поиск',
          'common.back': 'Назад',
          'common.next': 'Далее'
        }
      }
    },
    fallbackLng: 'ru',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    }
  });

export default i18n;
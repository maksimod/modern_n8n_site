// client/src/utils/i18n.js
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
      "view": "View",
      "showCourseContents": "Show Contents",
      "hideCourseContents": "Hide Contents",
      "course.markCompleted": "Mark as completed",
      "course.completed": "Completed",
      "course.download": "Download",
      "course.courses": "Courses",
      "course.continueCourse": "Continue course",
      "course.startCourse": "Start course",
      "duration": "Duration",
      "selectVideo": "Select a video from the list",
      "backToCourses": "Back to courses",
      "previous": "Previous",
      "next": "Next",
      "private": "Private",
      
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
      
      // Администрирование
      "admin.dashboard": "Admin Dashboard",
      "admin.courses": "Manage Courses",
      "admin.createCourse": "Create New Course",
      "admin.editCourse": "Edit Course",
      "admin.deleteCourse": "Delete Course",
      "admin.addVideo": "Add Video",
      "admin.editVideo": "Edit Video",
      "admin.deleteVideo": "Delete Video",
      "admin.title": "Title",
      "admin.description": "Description",
      "admin.language": "Language",
      "admin.duration": "Duration",
      "admin.isPrivate": "Private",
      "admin.videoType": "Video Type",
      "admin.externalUrl": "External URL",
      "admin.localFile": "Local File",
      "admin.textLesson": "Text Only",
      "admin.remoteStorage": "Remote Storage",
      "admin.save": "Save",
      "admin.cancel": "Cancel",
      "admin.confirm": "Confirm",
      "admin.moveUp": "Move Up",
      "admin.moveDown": "Move Down",
      "admin.uploadVideo": "Upload Video",
      "admin.confirmDeleteCourse": "Are you sure you want to delete this course?",
      "admin.confirmDeleteVideo": "Are you sure you want to delete this video?"
    }
  },
  ru: {
    translation: {
      // Общие
      "videoCourses": "Видеокурсы",
      "loading": "Загрузка...",
      "videos": "видео",
      "logout": "Выход",
      "view": "Просмотр",
      "showCourseContents": "Показать содержание",
      "hideCourseContents": "Скрыть содержание",
      "course.markCompleted": "Отметить как просмотренное",
      "course.completed": "Просмотрено",
      "course.download": "Скачать",
      "course.courses": "Курсы",
      "course.continueCourse": "Продолжить курс",
      "course.startCourse": "Начать курс",
      "duration": "Длительность",
      "selectVideo": "Выберите видео из списка",
      "backToCourses": "Назад к курсам",
      "previous": "Предыдущее",
      "next": "Следующее",
      "private": "Приватный",
      
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
      
      // Администрирование
      "admin.dashboard": "Панель администратора",
      "admin.courses": "Управление курсами",
      "admin.createCourse": "Создать новый курс",
      "admin.editCourse": "Редактировать курс",
      "admin.deleteCourse": "Удалить курс",
      "admin.addVideo": "Добавить видео",
      "admin.editVideo": "Редактировать видео",
      "admin.deleteVideo": "Удалить видео",
      "admin.title": "Заголовок",
      "admin.description": "Описание",
      "admin.language": "Язык",
      "admin.duration": "Длительность",
      "admin.isPrivate": "Приватный",
      "admin.videoType": "Тип видео",
      "admin.externalUrl": "Внешняя ссылка",
      "admin.localFile": "Локальный файл",
      "admin.textLesson": "Только текст",
      "admin.remoteStorage": "Удаленное хранилище",
      "admin.save": "Сохранить",
      "admin.cancel": "Отмена",
      "admin.confirm": "Подтвердить",
      "admin.moveUp": "Переместить вверх",
      "admin.moveDown": "Переместить вниз",
      "admin.uploadVideo": "Загрузить видео",
      "admin.confirmDeleteCourse": "Вы уверены, что хотите удалить этот курс?",
      "admin.confirmDeleteVideo": "Вы уверены, что хотите удалить это видео?"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'ru',
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
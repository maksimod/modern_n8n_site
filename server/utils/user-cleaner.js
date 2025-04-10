// server/utils/user-cleaner.js
const fs = require('fs');
const path = require('path');
const { userModel } = require('../models/data-model');
const { isUserTrusted } = require('../trusted-users');

// Константа для интервала проверки (1 час по умолчанию)
const CHECK_INTERVAL = process.env.TRUST_CHECK_INTERVAL || 60 * 60 * 1000;

// Функция для проверки и очистки отозванных пользователей
const cleanRevokedUsers = async () => {
  try {
    console.log('Запуск проверки доверенных пользователей...');
    
    // Получаем всех пользователей
    const users = userModel.getAll();
    
    if (!users.length) {
      console.log('Нет пользователей для проверки.');
      return;
    }
    
    // Счетчик удаленных пользователей
    let deletedCount = 0;
    
    // Проверяем каждого пользователя
    const filteredUsers = users.filter(user => {
      // Пропускаем удаленных пользователей
      if (!user) return false;
      
      // Проверяем, находится ли пользователь в списке доверенных
      const trusted = isUserTrusted(user.username);
      
      if (!trusted) {
        console.log(`Отзыв доступа пользователя: ${user.username} (ID: ${user.id})`);
        deletedCount++;
        return false; // Исключаем из массива
      }
      
      return true; // Оставляем в массиве
    });
    
    // Если были удалены пользователи, сохраняем обновленный список
    if (deletedCount > 0) {
      // Сохраняем обновленный массив пользователей
      fs.writeFileSync(
        userModel.USERS_FILE, 
        JSON.stringify(filteredUsers, null, 2)
      );
      
      console.log(`Удалено ${deletedCount} отозванных пользователей.`);
    } else {
      console.log('Отозванные пользователи не обнаружены.');
    }
  } catch (error) {
    console.error('Ошибка при проверке и удалении отозванных пользователей:', error);
  }
};

// Функция для запуска регулярных проверок
const startCleanupJob = () => {
  console.log(`Запуск планировщика очистки отозванных пользователей, интервал: ${CHECK_INTERVAL}ms`);
  
  // Выполняем первую проверку сразу после запуска
  cleanRevokedUsers();
  
  // Настраиваем регулярные проверки
  setInterval(cleanRevokedUsers, CHECK_INTERVAL);
};

module.exports = {
  cleanRevokedUsers,
  startCleanupJob
};
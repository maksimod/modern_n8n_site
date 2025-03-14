// server/routes/trusted-users.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const { 
  getAllTrustedUsers, 
  getActiveTrustedUsers, 
  addTrustedUser, 
  disableTrustedUser
} = require('../trusted-users');
const { cleanRevokedUsers } = require('../utils/user-cleaner');

// @route   GET /api/admin/trusted-users
// @desc    Получить список всех доверенных пользователей
// @access  Admin only
router.get('/', [auth, isAdmin], async (req, res) => {
  try {
    const showDisabled = req.query.showDisabled === 'true';
    
    // В зависимости от параметра возвращаем всех пользователей или только активных
    const users = showDisabled ? getAllTrustedUsers() : getActiveTrustedUsers();
    
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Ошибка при получении доверенных пользователей:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error'
    });
  }
});

// @route   POST /api/admin/trusted-users
// @desc    Добавить нового доверенного пользователя
// @access  Admin only
router.post('/', [auth, isAdmin], async (req, res) => {
  try {
    const { username, notes } = req.body;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }
    
    // Добавляем пользователя в список доверенных
    const result = addTrustedUser(username, notes || '');
    
    if (result) {
      res.json({
        success: true,
        message: 'Trusted user added successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to add trusted user'
      });
    }
  } catch (error) {
    console.error('Ошибка при добавлении доверенного пользователя:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/admin/trusted-users/:username
// @desc    Отозвать доступ пользователя
// @access  Admin only
router.delete('/:username', [auth, isAdmin], async (req, res) => {
  try {
    const { username } = req.params;
    
    // Отключаем пользователя в списке доверенных
    const result = disableTrustedUser(username);
    
    if (result) {
      // Запускаем очистку пользователей после отзыва доступа
      setTimeout(() => {
        cleanRevokedUsers();
      }, 1000);
      
      res.json({
        success: true,
        message: 'User access revoked successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found in trusted list'
      });
    }
  } catch (error) {
    console.error('Ошибка при отзыве доступа пользователя:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error'
    });
  }
});

// @route   POST /api/admin/trusted-users/cleanup
// @desc    Запустить очистку отозванных пользователей
// @access  Admin only
router.post('/cleanup', [auth, isAdmin], async (req, res) => {
  try {
    // Запускаем очистку пользователей
    await cleanRevokedUsers();
    
    res.json({
      success: true,
      message: 'User cleanup completed'
    });
  } catch (error) {
    console.error('Ошибка при очистке пользователей:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error'
    });
  }
});

module.exports = router;
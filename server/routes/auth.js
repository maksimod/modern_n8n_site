// server/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const { userModel } = require('../models/data-model');
const auth = require('../middleware/auth');

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
router.post(
  '/register',
  [
    check('username', 'Username is required').not().isEmpty(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error: ' + errors.array().map(e => e.msg).join(', ') });
    }

    const { username, password } = req.body;

    try {
      console.log('Регистрация пользователя:', username);
      
      // Проверяем существование пользователя
      const existingUser = userModel.findByUsername(username);
      
      if (existingUser) {
        console.log('Пользователь уже существует');
        return res.status(400).json({ message: 'User already exists' });
      }

      // Создаем нового пользователя
      const user = await userModel.create(username, password);
      
      console.log('Пользователь создан:', user);
      
      // Создаем и отправляем JWT токен
      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET || 'fallbacksecretkey', // Запасной ключ
        { expiresIn: '7d' },
        (err, token) => {
          if (err) {
            console.error('Ошибка при создании токена:', err);
            throw err;
          }
          console.log('Токен создан, отправляем ответ');
          res.json({
            token,
            user: {
              id: user.id,
              username: user.username,
            }
          });
        }
      );
    } catch (err) {
      console.error('Ошибка при регистрации:', err);
      res.status(500).json({ message: 'Server error: ' + err.message });
    }
  }
);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  [
    check('username', 'Username is required').exists(),
    check('password', 'Password is required').exists()
  ],
  async (req, res) => {
    console.log('Login attempt, body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      // Аутентификация пользователя
      const user = await userModel.authenticate(username, password);
      
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
      console.log('User authenticated:', { id: user.id, username: user.username });
      
      // Создаем и возвращаем JWT токен
      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET || 'fallbacksecretkey',
        { expiresIn: '7d' },
        (err, token) => {
          if (err) throw err;
          res.json({
            token,
            user: {
              id: user.id,
              username: user.username,
            }
          });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/auth/user
// @desc    Get user data
// @access  Private
router.get('/user', auth, async (req, res) => {
  try {
    const user = userModel.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Не возвращаем пароль
    const { password, ...userWithoutPassword } = user;
    
    res.json({
      ...userWithoutPassword,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/auth/check-username/:username
// @desc    Check if username is available
// @access  Public
router.get('/check-username/:username', async (req, res) => {
  const { username } = req.params;
  
  try {
    const user = userModel.findByUsername(username);
    res.json({ available: !user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
// server/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const db = require('../db/db');
const auth = require('../middleware/auth');

// Создаем тестового пользователя при запуске сервера
(async () => {
  try {
    // Генерируем хеш пароля
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    // Проверяем, существует ли пользователь
    const userCheck = await db.query('SELECT * FROM users WHERE username = $1', ['admin2']);
    
    if (userCheck.rows.length === 0) {
      // Если пользователя нет, создаем нового
      const newUser = await db.query(
        'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
        ['admin2', hashedPassword]
      );
      
      console.log('Created test user admin2 with password admin123');
    } else {
      console.log('Test user admin2 already exists');
    }
  } catch (err) {
    console.error('Error creating test user:', err);
  }
})();

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
      // Добавим отладочную информацию
      console.log('Регистрация пользователя:', username);
      
      // Проверяем существование пользователя
      const userCheck = await db.query('SELECT * FROM users WHERE username = $1', [username]);
      console.log('Результат проверки пользователя:', userCheck.rows.length);
      
      if (userCheck.rows.length > 0) {
        console.log('Пользователь уже существует');
        return res.status(400).json({ message: 'User already exists' });
      }

      // Создаем нового пользователя
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = await db.query(
        'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
        [username, hashedPassword]
      );
      
      console.log('Пользователь создан:', newUser.rows[0]);
      
      if (!newUser.rows[0]) {
        console.log('Ошибка при создании пользователя: пустой результат');
        return res.status(500).json({ message: 'Error creating user' });
      }
      
      const user = newUser.rows[0];

      // Создаем и отправляем JWT токен
      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET || 'fallbacksecretkey', // Добавляем запасной ключ
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
              progress: {} // Добавляем пустой объект прогресса
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
      // Find user
      const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
      console.log('User query result:', result.rows.length > 0 ? 'User found' : 'User NOT found');
      
      if (result.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const user = result.rows[0];
      console.log('User found:', { id: user.id, username: user.username });

      // Check password
      console.log('Comparing passwords...');
      const isMatch = await bcrypt.compare(password, user.password);
      console.log('Password match result:', isMatch);
      
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Get user progress
      const progressResult = await db.query(
        `SELECT course_id, video_id, is_completed
         FROM user_progress
         WHERE user_id = $1`,
        [user.id]
      );
      
      const progress = {};
      
      progressResult.rows.forEach(row => {
        if (!progress[row.course_id]) {
          progress[row.course_id] = {};
        }
        progress[row.course_id][row.video_id] = row.is_completed;
      });

      // Create and return JWT token
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
              progress
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
    const userResult = await db.query('SELECT id, username FROM users WHERE id = $1', [req.user.id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Get user progress
    const progressResult = await db.query(
      `SELECT course_id, video_id, is_completed
       FROM user_progress
       WHERE user_id = $1`,
      [user.id]
    );
    
    const progress = {};
    
    progressResult.rows.forEach(row => {
      if (!progress[row.course_id]) {
        progress[row.course_id] = {};
      }
      progress[row.course_id][row.video_id] = row.is_completed;
    });
    
    res.json({
      id: user.id,
      username: user.username,
      progress
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
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    res.json({ available: result.rows.length === 0 });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
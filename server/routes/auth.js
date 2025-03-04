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
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      // Check if user already exists
      const userCheck = await db.query('SELECT * FROM users WHERE username = $1', [username]);
      
      if (userCheck.rows.length > 0) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Create new user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = await db.query(
        'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
        [username, hashedPassword]
      );
      
      const user = newUser.rows[0];

      // Create and return JWT token
      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '7d' },
        (err, token) => {
          if (err) throw err;
          res.json({
            token,
            user: {
              id: user.id,
              username: user.username
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
        process.env.JWT_SECRET,
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
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Simple in-memory user storage for demo purposes
// In a real app, this would be a database
// Get users from auth.js (this is just for demo)
let users = [];

// @route   POST api/progress/:courseId/:videoId
// @desc    Update video progress
// @access  Private
router.post('/:courseId/:videoId', auth, (req, res) => {
  try {
    const { courseId, videoId } = req.params;
    const { completed } = req.body;
    
    // Find user
    const userIndex = users.findIndex(user => user.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Initialize course progress if it doesn't exist
    if (!users[userIndex].progress) {
      users[userIndex].progress = {};
    }
    
    if (!users[userIndex].progress[courseId]) {
      users[userIndex].progress[courseId] = {};
    }
    
    // Update video progress
    users[userIndex].progress[courseId][videoId] = completed;
    
    res.json(users[userIndex].progress);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/progress/:courseId
// @desc    Get course progress
// @access  Private
router.get('/:courseId', auth, (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Find user
    const user = users.find(user => user.id === req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return course progress
    const progress = user.progress && user.progress[courseId] ? user.progress[courseId] : {};
    
    res.json(progress);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
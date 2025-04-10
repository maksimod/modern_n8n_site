// server/middleware/isAdmin.js
const { userModel } = require('../models/data-model');

module.exports = function(req, res, next) {
  try {
    // Check if user exists
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not found, authorization denied' });
    }
    
    // Get the user from the data model
    const user = userModel.findById(req.user.id);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found, authorization denied' });
    }
    
    // Check if user is admin (username === 'admin')
    if (user.username !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    next();
  } catch (err) {
    console.error('Admin middleware error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
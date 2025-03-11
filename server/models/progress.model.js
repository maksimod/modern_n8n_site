// server/models/progress.model.js
const fs = require('fs');
const path = require('path');

const PROGRESS_FILE = path.join(__dirname, '../data/db/progress.json');

const ensureProgressFileExists = () => {
  if (!fs.existsSync(PROGRESS_FILE)) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({}));
  }
};

const getProgress = () => {
  ensureProgressFileExists();
  try {
    const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading progress file:', error);
    return {};
  }
};

const saveProgress = (progress) => {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (error) {
    console.error('Error saving progress file:', error);
  }
};

const progressModel = {
  getUserCourseProgress: (userId, courseId) => {
    const progress = getProgress();
    return progress[userId]?.[courseId] || {};
  },

  markVideoAsCompleted: (userId, courseId, videoId, isCompleted) => {
    const progress = getProgress();
    
    if (!progress[userId]) {
      progress[userId] = {};
    }
    
    if (!progress[userId][courseId]) {
      progress[userId][courseId] = {};
    }
    
    progress[userId][courseId][videoId] = isCompleted;
    
    saveProgress(progress);
    return true;
  },

  isVideoCompleted: (userId, courseId, videoId) => {
    const progress = getProgress();
    return progress[userId]?.[courseId]?.[videoId] || false;
  },

  getCourseCompletionStatus: (userId, courseId) => {
    const progress = getProgress();
    const courseProgress = progress[userId]?.[courseId] || {};
    
    return {
      completedVideos: Object.keys(courseProgress).filter(videoId => courseProgress[videoId]),
      totalVideos: Object.keys(courseProgress).length
    };
  }
};

module.exports = progressModel;
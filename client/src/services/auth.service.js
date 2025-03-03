import api from './api';

// For demo purposes, we'll use localStorage to store users
// In a real application, this would be handled by the server
const USERS_KEY = 'video_platform_users';

// Helper to get users from localStorage
const getUsers = () => {
  const usersJson = localStorage.getItem(USERS_KEY);
  return usersJson ? JSON.parse(usersJson) : [];
};

// Helper to save users to localStorage
const saveUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const checkUsername = async (username) => {
  // For demo purposes, we're checking locally
  // In a real app, this would be an API call
  try {
    const users = getUsers();
    const isUsernameTaken = users.some(user => user.username === username);
    return !isUsernameTaken;
  } catch (error) {
    console.error('Error checking username:', error);
    throw error;
  }
};

export const register = async (username, password) => {
  // For demo, we'll store in localStorage
  // In a real app, this would be an API call
  try {
    const users = getUsers();
    const isUsernameTaken = users.some(user => user.username === username);
    
    if (isUsernameTaken) {
      throw new Error('Username is already taken');
    }
    
    const newUser = {
      id: Date.now().toString(),
      username,
      password, // In a real app, NEVER store plaintext passwords
      progress: {}
    };
    
    users.push(newUser);
    saveUsers(users);
    
    // Return user data without sensitive information
    const { password: _, ...userData } = newUser;
    return userData;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const login = async (username, password) => {
  // For demo, we'll check localStorage
  // In a real app, this would be an API call
  try {
    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
      throw new Error('Invalid username or password');
    }
    
    // Return user data without sensitive information
    const { password: _, ...userData } = user;
    return userData;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logout = async () => {
  // For demo, just remove from localStorage
  // In a real app, this would invalidate the token on the server
  try {
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

export const updateUserProgress = async (userId, courseId, videoId, completed) => {
  try {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    // Initialize course progress if not exists
    if (!users[userIndex].progress[courseId]) {
      users[userIndex].progress[courseId] = {};
    }
    
    // Update video progress
    users[userIndex].progress[courseId][videoId] = completed;
    
    saveUsers(users);
    
    // Update current user in localStorage if it's the logged-in user
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (currentUser.id === userId) {
      currentUser.progress = users[userIndex].progress;
      localStorage.setItem('user', JSON.stringify(currentUser));
    }
    
    return users[userIndex].progress;
  } catch (error) {
    console.error('Error updating progress:', error);
    throw error;
  }
};
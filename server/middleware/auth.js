// server/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Получаем токен из заголовка
  const token = req.header('Authorization');
  
  // Проверяем наличие токена
  if (!token || !token.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  
  const tokenValue = token.replace('Bearer ', '');
  
  try {
    // Верифицируем токен
    const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET || 'fallbacksecretkey');
    
    // Проверяем наличие информации о пользователе в токене
    if (!decoded || !decoded.user) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }
    
    // Добавляем информацию о пользователе в request
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error('Ошибка при верификации токена:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};
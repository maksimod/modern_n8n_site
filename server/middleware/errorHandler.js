const errorHandler = (err, req, res, next) => {
    // Log error for debugging
    console.error(err.stack);
    
    // Set default error status and message
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Server Error';
    
    // Send error response
    res.status(statusCode).json({
      message,
      stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
    });
  };
  
  module.exports = errorHandler;
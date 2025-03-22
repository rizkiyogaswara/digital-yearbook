// backend/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    
    // Handle multer errors
    if (err.name === 'MulterError') {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          message: 'File too large. Maximum size is 5MB.' 
        });
      }
      return res.status(400).json({ message: err.message });
    }
    
    // Handle other errors
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
  };
  
  module.exports = errorHandler;
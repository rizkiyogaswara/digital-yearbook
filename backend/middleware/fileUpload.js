// backend/middleware/fileUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage for file uploads with automatic renaming
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Use absolute path for uploads directory
    const uploadsDir = path.join(__dirname, '../../uploads');
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    cb(null, uploadsDir);
  },
  filename: function(req, file, cb) {
    // Get the album ID if provided in the request
    const albumId = req.body.albumId || 'noalbum';
    
    // Create a timestamp in YYYYMMDDHHMM format
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0');
    
    // Get the file extension from the original filename
    const extension = path.extname(file.originalname).toLowerCase();
    
    // Create the new filename: albumId-timestamp-randomstring.extension
    const randomString = Math.random().toString(36).substring(2, 8); // 6-character random string
    const newFilename = `${albumId}-${timestamp}-${randomString}${extension}`;
    
    cb(null, newFilename);
  }
});

// Add file filter to validate uploads
const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

module.exports = { upload };
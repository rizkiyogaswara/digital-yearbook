// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { admin } = require('./config/firebase'); // Import Firebase instead of MongoDB
const errorHandler = require('./middleware/errorHandler');

// Import routes
const albumRoutes = require('./routes/albumRoutes');
const photoRoutes = require('./routes/photoRoutes');
const userRoutes = require('./routes/userRoutes');
const seedRoutes = require('./routes/seedRoutes');

const app = express();
const PORT = 3001;

// Initialize Firebase (already done in the firebase.js module)
console.log('Firebase initialized for Digital Yearbook application');

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, '../public')));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/albums', albumRoutes);  
app.use('/api/photos', photoRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/users', userRoutes);

// 🔥 Added simple hello route for testing
app.get('/api/hello', (req, res) => {
  res.json({ message: "Hello World!" });
});

// Placeholder API for frontend development without real images
app.get('/api/placeholder/:width/:height', (req, res) => {
  const width = req.params.width || 300;
  const height = req.params.height || 200;
  const text = req.query.text || 'Placeholder';
  
  // Create a simple SVG placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text x="50%" y="50%" font-family="Arial" font-size="20" text-anchor="middle" dominant-baseline="middle" fill="#888">${text}</text>
    </svg>
  `;
  
  res.set('Content-Type', 'image/svg+xml');
  res.send(svg);
});

// Serve the main HTML file for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handler
app.use(errorHandler);

// Start the server only if running locally
if (process.env.FUNCTIONS_EMULATOR !== 'true' && !process.env.GCLOUD_PROJECT) {
  app.listen(PORT, () => {
    console.log(`Server running locally on http://localhost:${PORT}`);
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads');
    console.log('Uploads directory path:', uploadsDir);

    if (!fs.existsSync(uploadsDir)) {
      console.log('Creating uploads directory');
      fs.mkdirSync(uploadsDir, { recursive: true });
    } else {
      console.log('Uploads directory already exists');
    }
  });
}

module.exports = app;
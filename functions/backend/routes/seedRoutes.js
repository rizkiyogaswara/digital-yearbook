// backend/routes/seedRoutes.js
const express = require('express');
const router = express.Router();
const { 
  seedData, 
  seedPhotos, 
  seedFeaturedPhotos 
} = require('../controllers/seedController');

// Seed initial data (users and albums)
router.post('/', seedData);

// Seed photos
router.post('/photos', seedPhotos);

// Seed featured photos
router.post('/featured', seedFeaturedPhotos);

module.exports = router;
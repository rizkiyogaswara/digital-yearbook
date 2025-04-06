// backend/routes/albumRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getAlbums, 
  getAlbumById, 
  createAlbum, 
  getAlbumPhotos 
} = require('../controllers/albumController');

// Get all albums
router.get('/', getAlbums);

// Create a new album
router.post('/', createAlbum);

// Get a single album by ID
router.get('/:id', getAlbumById);

// Get photos in an album
router.get('/:id/photos', getAlbumPhotos);

module.exports = router;
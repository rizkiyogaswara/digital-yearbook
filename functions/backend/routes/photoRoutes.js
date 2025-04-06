// backend/routes/photoRoutes.js
const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/fileUpload');
const { 
  getPhotos,
  getPhotoById,
  uploadPhoto,
  likePhoto,
  unlikePhoto,
  featurePhoto,
  getRandomFeaturedPhoto,
  getPhotoFeed,
  addTagToPhoto,
  getFeaturedPhoto // 🔥 [ADDED] Import for featured memory of the day
} = require('../controllers/photoController');

// 🔥 [ADDED] Route for featured memory of the day (must be first)
router.get('/featured', getFeaturedPhoto);

// Get random featured photo (this route needs to come before /:id to avoid conflicts)
router.get('/featured/random', getRandomFeaturedPhoto);

// Get photos for memory feed
router.get('/feed', getPhotoFeed);

// Get all photos with optional filtering
router.get('/', getPhotos);

// Upload a new photo
router.post('/upload', upload.single('photo'), uploadPhoto);

// Get a single photo by ID
router.get('/:id', getPhotoById);

// Like a photo
router.patch('/:id/like', likePhoto);

// Unlike a photo
router.patch('/:id/unlike', unlikePhoto);

// Feature a photo for a specific date
router.post('/:id/feature', featurePhoto);

// Add a tag to a photo
router.post('/:id/tags', addTagToPhoto);

module.exports = router;
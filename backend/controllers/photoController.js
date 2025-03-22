// backend/controllers/photoController.js
const Photo = require('../models/Photo');
const Album = require('../models/Album');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const mongoose = require('mongoose');

// Get all photos with optional filtering
const getPhotos = async (req, res) => {
  try {
    let query = {};
    
    // Apply filters if provided
    if (req.query.albumId) {
      query.albumId = req.query.albumId;
    }
    
    if (req.query.featured === 'true') {
      // Get current date (at the beginning of the day in GMT+7)
      const now = new Date();
      const offset = 7 * 60; // GMT+7 in minutes
      const nowGMT7 = new Date(now.getTime() + offset * 60000);
      
      const year = nowGMT7.getUTCFullYear();
      const month = nowGMT7.getUTCMonth();
      const day = nowGMT7.getUTCDate();
      
      // Set the current date to the beginning of the day (00:00:00) in GMT+7
      const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0));
      
      // Set the end of the day (23:59:59) in GMT+7
      const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59));
      
      console.log(`Fetching featured photos for date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
      
      // Look for photos featured for today
      query['featured.isFeatured'] = true;
      query['featured.featuredDate'] = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }
    
    // Apply limit if provided
    const limit = req.query.limit ? parseInt(req.query.limit) : 0;
    
    // Get photos with optional limit
    let photosQuery = Photo.find(query).sort({uploadDate: -1});
    
    if (limit > 0) {
      photosQuery = photosQuery.limit(limit);
    }
    
    const photos = await photosQuery;
    return successResponse(res, photos);
  } catch (err) {
    console.error('Error fetching photos:', err);
    return errorResponse(res, err.message, 500);
  }
};

// Get a single photo by ID
const getPhotoById = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    
    if (!photo) {
      return errorResponse(res, 'Photo not found', 404);
    }
    
    return successResponse(res, photo);
  } catch (err) {
    console.error('Error fetching photo:', err);
    return errorResponse(res, err.message, 500);
  }
};

// Upload a new photo
const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No file uploaded', 400);
    }

    const photoData = {
      title: req.body.title || 'Untitled Photo',
      description: req.body.description || '',
      filename: req.file.filename,
      uploadedBy: req.body.uploadedBy || 'Anonymous'
    };

    // Only add albumId if it's a valid MongoDB ObjectId
    if (req.body.albumId && mongoose.Types.ObjectId.isValid(req.body.albumId)) {
      photoData.albumId = req.body.albumId;
    }

    const photo = new Photo(photoData);
    const newPhoto = await photo.save();
    
    // If this is the first photo in an album, make it the cover photo
    if (photoData.albumId) {
      const album = await Album.findById(photoData.albumId);
      if (album && !album.coverPhoto) {
        album.coverPhoto = photoData.filename;
        await album.save();
        console.log(`Set cover photo for album "${album.name}"`);
      }
    }
    
    return successResponse(res, newPhoto, 201);
  } catch (err) {
    console.error('Error saving photo:', err);
    return errorResponse(res, err.message, 400);
  }
};

// Like a photo
const likePhoto = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    
    if (!photo) {
      return errorResponse(res, 'Photo not found', 404);
    }
    
    photo.likes += 1;
    const updatedPhoto = await photo.save();
    return successResponse(res, updatedPhoto);
  } catch (err) {
    console.error('Error liking photo:', err);
    return errorResponse(res, err.message, 400);
  }
};

// Unlike a photo
const unlikePhoto = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    
    if (!photo) {
      return errorResponse(res, 'Photo not found', 404);
    }
    
    // Prevent negative likes
    if (photo.likes > 0) {
      photo.likes -= 1;
    }
    
    const updatedPhoto = await photo.save();
    return successResponse(res, updatedPhoto);
  } catch (err) {
    console.error('Error unliking photo:', err);
    return errorResponse(res, err.message, 400);
  }
};

// Feature a photo for a specific date
const featurePhoto = async (req, res) => {
  try {
    // Validate the date (default to current date if not provided)
    let featuredDate = req.body.date ? new Date(req.body.date) : new Date();
    
    // Validate that the date is valid
    if (isNaN(featuredDate.getTime())) {
      return errorResponse(res, 'Invalid date format', 400);
    }
    
    // Set the time to 5:00 AM GMT+7
    const offset = 7 * 60; // GMT+7 in minutes
    
    // Extract date components using UTC methods after adjusting for GMT+7
    const adjustedDate = new Date(featuredDate.getTime() + offset * 60000);
    const year = adjustedDate.getUTCFullYear();
    const month = adjustedDate.getUTCMonth();
    const day = adjustedDate.getUTCDate();
    
    // Create a new date at 5:00 AM GMT+7 (which is 22:00 UTC of the previous day)
    featuredDate = new Date(Date.UTC(year, month, day, -2, 0, 0));
    
    // Find the photo
    const photo = await Photo.findById(req.params.id);
    
    if (!photo) {
      return errorResponse(res, 'Photo not found', 404);
    }
    
    // Update the photo to be featured
    photo.featured = {
      isFeatured: true,
      featuredDate: featuredDate
    };
    
    const updatedPhoto = await photo.save();
    return successResponse(res, updatedPhoto);
  } catch (err) {
    console.error('Error featuring photo:', err);
    return errorResponse(res, err.message, 400);
  }
};

// Get a random featured photo for a specific date
const getRandomFeaturedPhoto = async (req, res) => {
  try {
    // Get the date (default to current date if not provided)
    let targetDate = req.query.date ? new Date(req.query.date) : new Date();
    
    // Validate that the date is valid
    if (isNaN(targetDate.getTime())) {
      return errorResponse(res, 'Invalid date format', 400);
    }
    
    // Adjust for GMT+7
    const offset = 7 * 60; // GMT+7 in minutes
    const dateGMT7 = new Date(targetDate.getTime() + offset * 60000);
    
    const year = dateGMT7.getUTCFullYear();
    const month = dateGMT7.getUTCMonth();
    const day = dateGMT7.getUTCDate();
    
    // Set the beginning and end of the day in GMT+7
    const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59));
    
    console.log(`Looking for featured photos on: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
    
    // First, try to find photos that are explicitly featured for this date
    let featuredPhotos = await Photo.find({
      'featured.isFeatured': true,
      'featured.featuredDate': {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
    
    // If no featured photos found for this date, get a random photo
    if (!featuredPhotos || featuredPhotos.length === 0) {
      // Get the total count of photos
      const count = await Photo.countDocuments();
      
      if (count === 0) {
        return errorResponse(res, 'No photos available', 404);
      }
      
      // Generate a random index
      const random = Math.floor(Math.random() * count);
      
      // Fetch one random photo
      featuredPhotos = await Photo.find().skip(random).limit(1);
      
      if (featuredPhotos.length === 0) {
        return errorResponse(res, 'No photos available', 404);
      }
    }
    
    // Return the featured photo
    return successResponse(res, featuredPhotos[0]);
  } catch (err) {
    console.error('Error fetching random featured photo:', err);
    return errorResponse(res, err.message, 500);
  }
};

// Get photos for the memory feed (3 static photos)
const getPhotoFeed = async (req, res) => {
  try {
    // Get 3 photos sorted by likes (most liked first)
    const feedPhotos = await Photo.find()
      .sort({ likes: -1 })
      .limit(3);
      
    // Get album info for each photo
    const enhancedPhotos = await Promise.all(feedPhotos.map(async (photo) => {
      const photoObj = photo.toObject();
      
      if (photo.albumId) {
        const album = await Album.findById(photo.albumId);
        if (album) {
          photoObj.albumName = album.name;
        }
      }
      
      return photoObj;
    }));
    
    return successResponse(res, enhancedPhotos);
  } catch (err) {
    console.error('Error fetching feed photos:', err);
    return errorResponse(res, err.message, 500);
  }
};

// Add a tag to a photo
const addTagToPhoto = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    
    if (!photo) {
      return errorResponse(res, 'Photo not found', 404);
    }
    
    // Validate that userId is a valid ObjectId if provided
    if (req.body.userId && !mongoose.Types.ObjectId.isValid(req.body.userId)) {
      return errorResponse(res, 'Invalid user ID format', 400);
    }
    
    photo.tags.push({
      userId: req.body.userId || null,
      name: req.body.name,
      position: {
        x: req.body.position.x,
        y: req.body.position.y
      }
    });
    
    const updatedPhoto = await photo.save();
    return successResponse(res, updatedPhoto, 201);
  } catch (err) {
    console.error('Error adding tag:', err);
    return errorResponse(res, err.message, 400);
  }
};

module.exports = {
  getPhotos,
  getPhotoById,
  uploadPhoto,
  likePhoto,
  unlikePhoto,
  featurePhoto,
  getRandomFeaturedPhoto,
  getPhotoFeed,
  addTagToPhoto
};
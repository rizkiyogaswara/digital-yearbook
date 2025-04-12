// backend/controllers/photoController.js
const Photo = require('../models/firestore/Photo');
const Album = require('../models/firestore/Album');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { Timestamp } = require('../config/firebase');

// Get all photos with optional filtering
const getPhotos = async (req, res) => {
  try {
    let query = {};
    let options = {};
    
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
        $gte: Timestamp.fromDate(startOfDay),
        $lte: Timestamp.fromDate(endOfDay)
      };
    }
    
    // Apply limit if provided
    if (req.query.limit) {
      options.limit = parseInt(req.query.limit);
    }
    
    // Get photos with options
    const photos = await Photo.findWithOptions(query, options);
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
    
    // Get tags from subcollection
    const tags = await Photo.getTags(req.params.id);
    
    // Add tags to the photo object
    const photoWithTags = {
      ...photo,
      tags
    };
    
    return successResponse(res, photoWithTags);
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
      downloadURL: req.file.downloadURL || req.file.filename, // <-- add this line to get full download url
      uploadedBy: req.body.uploadedBy || 'Anonymous',
      albumId: req.body.albumId || null
    };

    const newPhoto = await Photo.create(photoData);
    
    // If this is the first photo in an album, make it the cover photo
    if (photoData.albumId) {
      const album = await Album.findById(photoData.albumId);
      if (album && !album.coverPhoto) {
        await Album.setCoverPhoto(photoData.albumId, photoData.filename);
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
    const updatedPhoto = await Photo.likePhoto(req.params.id);
    
    if (!updatedPhoto) {
      return errorResponse(res, 'Photo not found', 404);
    }
    
    return successResponse(res, updatedPhoto);
  } catch (err) {
    console.error('Error liking photo:', err);
    return errorResponse(res, err.message, 400);
  }
};

// Unlike a photo
const unlikePhoto = async (req, res) => {
  try {
    const updatedPhoto = await Photo.unlikePhoto(req.params.id);
    
    if (!updatedPhoto) {
      return errorResponse(res, 'Photo not found', 404);
    }
    
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
    
    // Convert to Firestore Timestamp
    const timestampDate = Timestamp.fromDate(featuredDate);
    
    // Feature the photo
    const updatedPhoto = await Photo.featurePhoto(req.params.id, timestampDate);
    
    if (!updatedPhoto) {
      return errorResponse(res, 'Photo not found', 404);
    }
    
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
    const query = {
      'featured.isFeatured': true,
      'featured.featuredDate': {
        $gte: Timestamp.fromDate(startOfDay),
        $lte: Timestamp.fromDate(endOfDay)
      }
    };
    
    let featuredPhotos = await Photo.find(query);
    
    // If no featured photos found for this date, get a random photo
    if (!featuredPhotos || featuredPhotos.length === 0) {
      // Get the total count of photos
      const count = await Photo.countDocuments();
      
      if (count === 0) {
        return errorResponse(res, 'No photos available', 404);
      }
      
      // Generate a random index
      const random = Math.floor(Math.random() * count);
      
      // Get all photos (limited approach for Firestore)
      const allPhotos = await Photo.find();
      
      if (allPhotos.length === 0) {
        return errorResponse(res, 'No photos available', 404);
      }
      
      // Get a random photo
      featuredPhotos = [allPhotos[random % allPhotos.length]];
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
    const options = {
      sort: 'likes:desc',
      limit: 3
    };
    
    const feedPhotos = await Photo.findWithOptions({}, options);
      
    // Get album info for each photo
    const enhancedPhotos = await Promise.all(feedPhotos.map(async (photo) => {
      if (photo.albumId) {
        const album = await Album.findById(photo.albumId);
        if (album) {
          return {
            ...photo,
            albumName: album.name
          };
        }
      }
      return photo;
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
    
    const tagData = {
      userId: req.body.userId || null,
      name: req.body.name,
      position: {
        x: req.body.position.x,
        y: req.body.position.y
      }
    };
    
    const newTag = await Photo.addTag(req.params.id, tagData);
    
    return successResponse(res, {
      photoId: req.params.id,
      tag: newTag
    }, 201);
  } catch (err) {
    console.error('Error adding tag:', err);
    return errorResponse(res, err.message, 400);
  }
};

// 🔥 [ADDED] Get featured memory of the day
const getFeaturedPhoto = async (req, res) => {
  console.log('✅ Entered getFeaturedPhoto');

  try {
    const now = new Date();
    const offset = 7 * 60; // GMT+7 in minutes
    const nowGMT7 = new Date(now.getTime() + offset * 60000);

    const year = nowGMT7.getUTCFullYear();
    const month = nowGMT7.getUTCMonth();
    const day = nowGMT7.getUTCDate();

    const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59));

    console.log(`📅 Searching for featured photos between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`);

    const query = {
      'featured.isFeatured': true,
      'featured.featuredDate': {
        $gte: Timestamp.fromDate(startOfDay),
        $lte: Timestamp.fromDate(endOfDay)
      }
    };

    console.log('🔍 Executing Photo.find(query)...');

    const featuredPhotos = await Photo.find(query);

    console.log('✅ Photo.find(query) completed');

    if (featuredPhotos.length > 0) {
      console.log('✅ Featured photo found:', featuredPhotos[0].id || '[no id]');
      return successResponse(res, featuredPhotos[0]);
    }

    console.log('⚠️ No featured photo found. Fetching random fallback...');

    const allPhotos = await Photo.find();

    console.log(`📸 Total photos available: ${allPhotos.length}`);

    if (allPhotos.length === 0) {
      console.log('❌ No photos found at all');
      return errorResponse(res, 'No photos available', 404);
    }

    const randomIndex = Math.floor(Math.random() * allPhotos.length);
    console.log(`🎯 Returning random photo at index ${randomIndex}`);

    return successResponse(res, allPhotos[randomIndex]);
  } catch (err) {
    console.error('❌ Error inside getFeaturedPhoto:', err);
    return errorResponse(res, err.message, 500);
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
  addTagToPhoto,
  getFeaturedPhoto // 🔥 added here
};
// backend/controllers/albumController.js
const Album = require('../models/Album');
const Photo = require('../models/Photo');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Get all albums with photo count
const getAlbums = async (req, res) => {
  try {
    const albums = await Album.find();
    
    // Add photo count to each album
    const albumsWithCount = await Promise.all(albums.map(async (album) => {
      const photoCount = await Photo.countDocuments({ albumId: album._id });
      const albumObj = album.toObject();
      albumObj.photoCount = photoCount;
      return albumObj;
    }));
    
    return successResponse(res, albumsWithCount);
  } catch (err) {
    console.error('Error fetching albums:', err);
    return errorResponse(res, err.message, 500);
  }
};

// Get a single album by ID with photo count
const getAlbumById = async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);
    
    if (!album) {
      return errorResponse(res, 'Album not found', 404);
    }
    
    // Count photos in this album
    const photoCount = await Photo.countDocuments({ albumId: req.params.id });
    
    // Add the count to the album object
    const albumWithCount = album.toObject();
    albumWithCount.photoCount = photoCount;
    
    return successResponse(res, albumWithCount);
  } catch (err) {
    console.error('Error fetching album:', err);
    return errorResponse(res, err.message, 500);
  }
};

// Create a new album
const createAlbum = async (req, res) => {
  try {
    const album = new Album({
      name: req.body.name,
      description: req.body.description,
      createdBy: req.body.createdBy,
      coverPhoto: req.body.coverPhoto
    });

    const newAlbum = await album.save();
    return successResponse(res, newAlbum, 201);
  } catch (err) {
    console.error('Error creating album:', err);
    return errorResponse(res, err.message, 400);
  }
};

// Get photos in an album
const getAlbumPhotos = async (req, res) => {
  try {
    const photos = await Photo.find({ albumId: req.params.id });
    return successResponse(res, photos);
  } catch (err) {
    console.error('Error fetching album photos:', err);
    return errorResponse(res, err.message, 500);
  }
};

module.exports = {
  getAlbums,
  getAlbumById,
  createAlbum,
  getAlbumPhotos
};
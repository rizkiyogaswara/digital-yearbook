// backend/controllers/albumController.js
const Album = require('../models/firestore/Album');
const Photo = require('../models/firestore/Photo');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Get all albums with photo count
const getAlbums = async (req, res) => {
  try {
    const albums = await Album.find();
    return successResponse(res, albums);
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
    
    return successResponse(res, album);
  } catch (err) {
    console.error('Error fetching album:', err);
    return errorResponse(res, err.message, 500);
  }
};

// Create a new album
const createAlbum = async (req, res) => {
  try {
    const album = {
      name: req.body.name,
      description: req.body.description,
      createdBy: req.body.createdBy,
      coverPhoto: req.body.coverPhoto
    };

    const newAlbum = await Album.create(album);
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
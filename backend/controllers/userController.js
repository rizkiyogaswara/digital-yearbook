// backend/controllers/userController.js
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Get all users
const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    return successResponse(res, users);
  } catch (err) {
    console.error('Error fetching users:', err);
    return errorResponse(res, err.message, 500);
  }
};

// Get a single user by ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }
    
    return successResponse(res, user);
  } catch (err) {
    console.error('Error fetching user:', err);
    return errorResponse(res, err.message, 500);
  }
};

// Create a new user
const createUser = async (req, res) => {
  try {
    const user = new User({
      name: req.body.name,
      initials: req.body.initials,
      graduation_year: req.body.graduation_year,
      class: req.body.class,
      location: req.body.location,
      bio: req.body.bio,
      photoCount: req.body.photoCount || 0
    });

    const newUser = await user.save();
    return successResponse(res, newUser, 201);
  } catch (err) {
    console.error('Error creating user:', err);
    return errorResponse(res, err.message, 400);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser
};
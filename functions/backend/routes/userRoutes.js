// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getUsers, 
  getUserById, 
  createUser 
} = require('../controllers/userController');

// Get all users
router.get('/', getUsers);

// Create a new user
router.post('/', createUser);

// Get a single user by ID
router.get('/:id', getUserById);

module.exports = router;
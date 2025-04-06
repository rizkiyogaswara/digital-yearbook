// backend/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  initials: String,
  graduation_year: String,
  class: [String],
  location: String,
  bio: String,
  photoCount: Number
});

module.exports = mongoose.model('User', userSchema);
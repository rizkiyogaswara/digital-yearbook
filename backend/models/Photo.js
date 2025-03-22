// backend/models/Photo.js
const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  title: String,
  description: String,
  filename: String,
  albumId: mongoose.Schema.Types.ObjectId,
  uploadedBy: String,
  uploadDate: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  featured: {
    isFeatured: { type: Boolean, default: false },
    featuredDate: Date
  },
  tags: [{
    userId: mongoose.Schema.Types.ObjectId,
    name: String,
    position: {
      x: Number,
      y: Number
    }
  }]
});

module.exports = mongoose.model('Photo', photoSchema);
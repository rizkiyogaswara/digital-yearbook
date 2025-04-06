// backend/models/Album.js
const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema({
  name: String,
  description: String,
  createdBy: String,
  createdDate: { type: Date, default: Date.now },
  coverPhoto: String
});

module.exports = mongoose.model('Album', albumSchema);
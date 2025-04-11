// backend/models/Album.js
const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema({
  name: String,
  description: String,
  createdBy: String,
  createdDate: { type: Date, default: Date.now },
  coverPhoto: String
});

// Add this method to your albumSchema in Album.js
albumSchema.statics.setCoverPhoto = function(albumId, filename) {
  return this.findByIdAndUpdate(albumId, { coverPhoto: filename }, { new: true });
};

module.exports = mongoose.model('Album', albumSchema);
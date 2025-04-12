// backend/models/firestore/Album.js
const BaseModel = require('./BaseModel');
const { db, FieldValue, Timestamp } = require('../../config/firebase');

class Album extends BaseModel {
  constructor() {
    super('albums');
  }

  // Create a new album with photoCount initialized to 0
  async create(data) {
    try {
      const albumData = {
        ...data,
        photoCount: 0,
        createdDate: data.createdDate || Timestamp.now()
      };
      
      return await super.create(albumData);
    } catch (error) {
      console.error('Error creating album:', error);
      throw error;
    }
  }

  // Update album photo count (increment/decrement)
  async updatePhotoCount(albumId, increment = true) {
    try {
      const delta = increment ? 1 : -1;
      await this.collection.doc(albumId).update({
        photoCount: FieldValue.increment(delta)
      });
      
      const updatedAlbum = await this.findById(albumId);
      return updatedAlbum;
    } catch (error) {
      console.error('Error updating album photo count:', error);
      throw error;
    }
  }

  // Set cover photo for an album
  async setCoverPhoto(albumId, relativePath) {
    try {
      await this.collection.doc(albumId).update({
        coverPhoto: relativePath  // <-- now save relative path instead of full URL
      });
      
      const updatedAlbum = await this.findById(albumId);
      return updatedAlbum;
    } catch (error) {
      console.error('Error setting album cover photo:', error);
      throw error;
    }
  }
}

module.exports = new Album();
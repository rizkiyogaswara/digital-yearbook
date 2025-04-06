// backend/models/firestore/Photo.js
const BaseModel = require('./BaseModel');
const { db, FieldValue, Timestamp } = require('../../config/firebase');

class Photo extends BaseModel {
  constructor() {
    super('photos');
  }

  // Create a new photo and increment album's photoCount if albumId is provided
  async create(data) {
    const photoData = {
      ...data,
      likes: 0,
      uploadDate: data.uploadDate || Timestamp.now(),
      featured: {
        isFeatured: data.featured?.isFeatured || false,
        featuredDate: data.featured?.featuredDate || null
      },
      tags: [] // Tags will be stored in a subcollection, this array is kept for backward compatibility
    };

    try {
      // Start a transaction to ensure atomicity
      return await db.runTransaction(async (transaction) => {
        // Add the photo document
        const photoRef = this.collection.doc();
        transaction.set(photoRef, photoData);
        
        // If albumId is provided, increment the album's photoCount
        if (data.albumId) {
          const albumRef = db.collection('albums').doc(data.albumId);
          transaction.update(albumRef, {
            photoCount: FieldValue.increment(1)
          });
        }
        
        return {
          id: photoRef.id,
          ...photoData
        };
      });
    } catch (error) {
      console.error('Error creating photo:', error);
      throw error;
    }
  }

  // Get photos with pagination and sorting
  async findWithOptions(queryObj = {}, options = {}) {
    try {
      let query = this.collection;
      
      // Apply filters
      Object.entries(queryObj).forEach(([field, value]) => {
        if (field === 'featured.isFeatured' && value === true) {
          query = query.where('featured.isFeatured', '==', true);
        } else if (field === 'featured.featuredDate' && typeof value === 'object') {
          if (value.$gte) query = query.where('featured.featuredDate', '>=', value.$gte);
          if (value.$lte) query = query.where('featured.featuredDate', '<=', value.$lte);
        } else if (typeof value !== 'object') {
          query = query.where(field, '==', value);
        }
      });
      
      // Apply sorting
      if (options.sort) {
        const [field, direction] = options.sort.split(':');
        query = query.orderBy(field, direction === 'desc' ? 'desc' : 'asc');
      } else {
        // Default sort by uploadDate descending
        query = query.orderBy('uploadDate', 'desc');
      }
      
      // Apply limit
      if (options.limit && options.limit > 0) {
        query = query.limit(options.limit);
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        _id: doc.id,
        ...this.convertTimestamps(doc.data())
      }));
    } catch (error) {
      console.error('Error finding photos with options:', error);
      throw error;
    }
  }
  
  // Like a photo
  async likePhoto(photoId) {
    try {
      await this.collection.doc(photoId).update({
        likes: FieldValue.increment(1)
      });
      
      return await this.findById(photoId);
    } catch (error) {
      console.error('Error liking photo:', error);
      throw error;
    }
  }
  
  // Unlike a photo
  async unlikePhoto(photoId) {
    try {
      const photoRef = this.collection.doc(photoId);
      const photoDoc = await photoRef.get();
      
      if (!photoDoc.exists) {
        throw new Error('Photo not found');
      }
      
      const currentLikes = photoDoc.data().likes || 0;
      
      // Prevent negative likes
      if (currentLikes > 0) {
        await photoRef.update({
          likes: FieldValue.increment(-1)
        });
      }
      
      return await this.findById(photoId);
    } catch (error) {
      console.error('Error unliking photo:', error);
      throw error;
    }
  }
  
  // Feature a photo for a specific date
  async featurePhoto(photoId, featuredDate) {
    try {
      await this.collection.doc(photoId).update({
        'featured.isFeatured': true,
        'featured.featuredDate': featuredDate || Timestamp.now()
      });
      
      return await this.findById(photoId);
    } catch (error) {
      console.error('Error featuring photo:', error);
      throw error;
    }
  }
  
  // Add a tag to a photo
  async addTag(photoId, tagData) {
    try {
      const tagsRef = this.collection.doc(photoId).collection('tags');
      const tagDoc = await tagsRef.add(tagData);
      
      // Get the newly created tag
      const tag = await tagDoc.get();
      
      return {
        id: tag.id,
        ...tag.data()
      };
    } catch (error) {
      console.error('Error adding tag to photo:', error);
      throw error;
    }
  }
  
  // Get tags for a photo
  async getTags(photoId) {
    try {
      const tagsRef = this.collection.doc(photoId).collection('tags');
      const snapshot = await tagsRef.get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting photo tags:', error);
      throw error;
    }
  }
}

module.exports = new Photo();
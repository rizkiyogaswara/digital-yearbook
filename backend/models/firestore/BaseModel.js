// backend/models/firestore/BaseModel.js
const { db } = require('../../config/firebase');

class BaseModel {
  constructor(collectionName) {
    this.collection = db.collection(collectionName);
  }

  // Create a document with auto-generated ID
  async create(data) {
    try {
      const docRef = await this.collection.add(data);
      const doc = await docRef.get();
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error(`Error creating document in ${this.collection.id}:`, error);
      throw error;
    }
  }

  // Create a document with a specific ID
  async createWithId(id, data) {
    try {
      await this.collection.doc(id).set(data);
      return {
        id,
        ...data
      };
    } catch (error) {
      console.error(`Error creating document with ID in ${this.collection.id}:`, error);
      throw error;
    }
  }

  // Find a document by ID
  async findById(id) {
    try {
      const doc = await this.collection.doc(id).get();
      if (!doc.exists) {
        return null;
      }
      return {
        _id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error(`Error finding document by ID in ${this.collection.id}:`, error);
      throw error;
    }
  }

  // Find documents based on a query
  async find(queryObj = {}) {
    try {
      let query = this.collection;
      
      // Apply filters if provided
      Object.entries(queryObj).forEach(([field, value]) => {
        if (typeof value === 'object' && value !== null) {
          // Handle range queries ($gt, $lt, etc.)
          if (value.$gt) query = query.where(field, '>', value.$gt);
          if (value.$gte) query = query.where(field, '>=', value.$gte);
          if (value.$lt) query = query.where(field, '<', value.$lt);
          if (value.$lte) query = query.where(field, '<=', value.$lte);
          if (value.$eq) query = query.where(field, '==', value.$eq);
        } else {
          // Simple equality query
          query = query.where(field, '==', value);
        }
      });

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        _id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error finding documents in ${this.collection.id}:`, error);
      throw error;
    }
  }

  // Update a document
  async findByIdAndUpdate(id, updateData) {
    try {
      const docRef = this.collection.doc(id);
      await docRef.update(updateData);
      const updatedDoc = await docRef.get();
      return {
        id: updatedDoc.id,
        ...updatedDoc.data()
      };
    } catch (error) {
      console.error(`Error updating document in ${this.collection.id}:`, error);
      throw error;
    }
  }

  // Delete a document
  async findByIdAndDelete(id) {
    try {
      const docRef = this.collection.doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        return null;
      }
      const data = {
        id: doc.id,
        ...doc.data()
      };
      await docRef.delete();
      return data;
    } catch (error) {
      console.error(`Error deleting document in ${this.collection.id}:`, error);
      throw error;
    }
  }

  // Count documents matching a query
  async countDocuments(queryObj = {}) {
    try {
      const docs = await this.find(queryObj);
      return docs.length;
    } catch (error) {
      console.error(`Error counting documents in ${this.collection.id}:`, error);
      throw error;
    }
  }

  // Delete multiple documents
  async deleteMany(queryObj = {}) {
    try {
      const batch = db.batch();
      const docs = await this.find(queryObj);
      
      if (docs.length === 0) {
        return { deletedCount: 0 };
      }

      docs.forEach(doc => {
        const docRef = this.collection.doc(doc.id);
        batch.delete(docRef);
      });

      await batch.commit();
      return { deletedCount: docs.length };
    } catch (error) {
      console.error(`Error deleting multiple documents in ${this.collection.id}:`, error);
      throw error;
    }
  }

  // Insert multiple documents
  async insertMany(documents) {
    try {
      const batch = db.batch();
      const results = [];
      
      for (const doc of documents) {
        const docRef = this.collection.doc();
        batch.set(docRef, doc);
        results.push({
          id: docRef.id,
          ...doc
        });
      }

      await batch.commit();
      return results;
    } catch (error) {
      console.error(`Error inserting multiple documents in ${this.collection.id}:`, error);
      throw error;
    }
  }
}

module.exports = BaseModel;
// backend/models/firestore/User.js
const BaseModel = require('./BaseModel');

class User extends BaseModel {
  constructor() {
    super('users');
  }

  // Additional user-specific methods can be added here
  
  // Example: Find a user by name
  async findByName(name) {
    try {
      const snapshot = await this.collection.where('name', '==', name).get();
      if (snapshot.empty) {
        return null;
      }
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error finding user by name:', error);
      throw error;
    }
  }
}

module.exports = new User();
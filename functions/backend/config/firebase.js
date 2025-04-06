// backend/config/firebase.js
const admin = require('firebase-admin');

// 🔥 REMOVE: fs and path modules
// const fs = require('fs');
// const path = require('path');

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    if (admin.apps.length > 0) {
      console.log('Firebase Admin SDK already initialized');
      return admin;
    }

    // 🔥 REMOVE: all manual service account file loading

    // ✅ SIMPLIFIED: initialize directly
    admin.initializeApp({
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'digital-yearbook-storage.appspot.com'
      // If you need to reference a storage bucket, keep this
    });

    console.log('Firebase Admin SDK initialized successfully');
    return admin;
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw error;
  }
};

// Initialize Firebase on module load
const firebase = initializeFirebase();

// Add this log message after initialization
console.log(`Firebase Admin SDK initialized successfully for project: ${firebase.app().options.projectId}`);

// Export the Firebase Admin SDK and Firestore database
module.exports = {
  admin: firebase,
  db: firebase.firestore(),
  storage: firebase.storage(),
  FieldValue: admin.firestore.FieldValue,
  Timestamp: admin.firestore.Timestamp
};

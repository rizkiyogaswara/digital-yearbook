// backend/config/firebase.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    // Check if the app has already been initialized
    if (admin.apps.length > 0) {
      console.log('Firebase Admin SDK already initialized');
      return admin;
    }

    // Path to service account credentials file
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
      path.join(__dirname, '../../service-account-key.json');
    
    // Check if the service account file exists
    if (!fs.existsSync(serviceAccountPath) && !process.env.FIREBASE_SERVICE_ACCOUNT) {
      throw new Error('Firebase service account file not found and environment variable not set');
    }

    // Initialize with credentials from file or environment variable
    let credential;
    if (fs.existsSync(serviceAccountPath)) {
      console.log(`Initializing Firebase Admin SDK with service account file: ${serviceAccountPath}`);
      credential = admin.credential.cert(serviceAccountPath);
    } else {
      console.log('Initializing Firebase Admin SDK with environment variable');
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = admin.credential.cert(serviceAccount);
    }

    admin.initializeApp({
      credential,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'digital-yearbook-storage.appspot.com'
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

// Export the Firebase Admin SDK and Firestore database
module.exports = {
  admin: firebase,
  db: firebase.firestore(),
  storage: firebase.storage(),
  FieldValue: admin.firestore.FieldValue,
  Timestamp: admin.firestore.Timestamp
};
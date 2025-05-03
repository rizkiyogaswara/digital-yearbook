// functions/backend/controllers/featuredController.js

const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Scheduled function to rotate the featured photo weekly.
 * Will be implemented in the next step.
 */
const rotateFeaturedPhoto = async () => {
  console.log("🌀 Starting weekly featured photo rotation...");

  // Logic will be added in Step 2
};

module.exports = {
  rotateFeaturedPhoto,
};

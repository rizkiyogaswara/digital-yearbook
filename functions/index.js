// /functions/index.js
const functions = require('firebase-functions');
const app = require('./backend/server');
const { incrementPhotoCountOnCreate, decrementPhotoCountOnDelete } = require('./triggers/photoTriggers');
const { rotateFeaturedPhoto } = require('./backend/controllers/featuredController');


exports.app = functions.https.onRequest(app);
exports.incrementPhotoCountOnCreate = incrementPhotoCountOnCreate;
exports.decrementPhotoCountOnDelete = decrementPhotoCountOnDelete;
exports.rotateFeaturedPhoto = functions.pubsub
  .schedule('1 17 * * 5') // Every Saturday at 00:01 AM Jakarta time (UTC+7)
  .timeZone('Asia/Jakarta')
  .onRun(rotateFeaturedPhoto);
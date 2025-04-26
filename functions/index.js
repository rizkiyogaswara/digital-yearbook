// /functions/index.js
const functions = require('firebase-functions');
const app = require('./backend/server');
const { incrementPhotoCountOnCreate, decrementPhotoCountOnDelete } = require('./triggers/photoTriggers');

exports.app = functions.https.onRequest(app);
exports.incrementPhotoCountOnCreate = incrementPhotoCountOnCreate;
exports.decrementPhotoCountOnDelete = decrementPhotoCountOnDelete;
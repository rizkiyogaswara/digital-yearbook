// /functions/index.js
const functions = require('firebase-functions');
const app = require('./backend/server');

exports.app = functions.https.onRequest(app);

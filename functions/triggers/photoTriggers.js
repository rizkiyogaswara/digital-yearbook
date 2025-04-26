// functions/triggers/photoTriggers.js

const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

// Trigger when a new photo is created
const incrementPhotoCountOnCreate = functions.firestore
  .document('photos/{photoId}')
  .onCreate(async (snap, context) => {
    const newPhoto = snap.data();
    const albumId = newPhoto.albumId;

    if (!albumId) {
      console.warn('[Photo Create] No albumId found in new photo document. Skipping photoCount update.');
      return;
    }

    const albumRef = db.collection('albums').doc(albumId);
    try {
      await albumRef.update({
        photoCount: admin.firestore.FieldValue.increment(1)
      });
      console.log(`[Photo Create] Successfully incremented photoCount for albumId: ${albumId}`);
    } catch (error) {
      console.error(`[Photo Create] Failed to increment photoCount for albumId: ${albumId}`, error);
    }
  });

// Trigger when a photo is deleted
const decrementPhotoCountOnDelete = functions.firestore
  .document('photos/{photoId}')
  .onDelete(async (snap, context) => {
    const deletedPhoto = snap.data();
    const albumId = deletedPhoto.albumId;

    if (!albumId) {
      console.warn('[Photo Delete] No albumId found in deleted photo document. Skipping photoCount update.');
      return;
    }

    const albumRef = db.collection('albums').doc(albumId);
    try {
      await albumRef.update({
        photoCount: admin.firestore.FieldValue.increment(-1)
      });
      console.log(`[Photo Delete] Successfully decremented photoCount for albumId: ${albumId}`);
    } catch (error) {
      console.error(`[Photo Delete] Failed to decrement photoCount for albumId: ${albumId}`, error);
    }
  });

module.exports = {
  incrementPhotoCountOnCreate,
  decrementPhotoCountOnDelete
};

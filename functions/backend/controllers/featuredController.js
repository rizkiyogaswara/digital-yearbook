// functions/backend/controllers/featuredController.js

const admin = require('firebase-admin');
const db = admin.firestore();

const rotateFeaturedPhoto = async () => {
  console.log("🌀 Starting weekly featured photo rotation...");

  const photosRef = db.collection('photos');

  // Step 1: Demote current featured photo
  const currentFeaturedSnap = await photosRef
    .where('featured.isFeatured', '==', true)
    .limit(1)
    .get();

  if (!currentFeaturedSnap.empty) {
    const currentDoc = currentFeaturedSnap.docs[0];
    console.log(`🔻 Demoting current featured photo: ${currentDoc.id}`);
    await currentDoc.ref.update({
      'featured.isFeatured': false,
      'featured.wasFeatured': true,
      // do not update featuredDate
    });
  } else {
    console.log('ℹ️ No currently featured photo to demote.');
  }

  // Step 2: Get all photos and filter those that have never been featured
  const allSnap = await photosRef.get();
  const candidates = allSnap.docs.filter(doc => {
    const f = doc.data().featured || {};
    return f.wasFeatured !== true;
  });


  if (candidates.length === 0) {
    console.warn('⚠️ No unfeatured photos available for rotation.');
    return;
  }
  
  // Step 3: Pick a random candidate from filtered docs
  const randomIndex = Math.floor(Math.random() * candidates.length);
  const selectedDoc = candidates[randomIndex];

  console.log(`🌟 Promoting new featured photo: ${selectedDoc.id}`);

  await selectedDoc.ref.update({
    'featured.isFeatured': true,
    'featured.wasFeatured': true,
    'featured.featuredDate': admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('✅ Weekly featured photo rotation complete.');
};

module.exports = {
  rotateFeaturedPhoto,
};

// /js/firebase-config.js
console.log("Loading firebase-config.js - updated version without imports");

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDJ2Dh10bTrIXRZss5s1W4v8ncrjosnChY",
  authDomain: "yearbook-smu8102.firebaseapp.com",
  projectId: "yearbook-smu8102",
  storageBucket: "yearbook-smu8102.appspot.com",  // ✅ fixed storage bucket URL
  messagingSenderId: "19715964087",
  appId: "1:19715964087:web:2cdc5b1ca6a59249e9a132",
  measurementId: "G-DVHTYRC4FT"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

// Only initialize analytics if SDK is loaded
let analytics;
if (firebase.analytics) {
  analytics = firebase.analytics();
} else {
  console.warn('⚠️ Firebase Analytics SDK not loaded. Analytics disabled.');
}

const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Set persistence to local (survives page refreshes)
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// Export for use in other scripts
window.yearBookApp = {
  app,
  analytics,
  auth,
  googleProvider
};
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDJ2Dh10bTrIXRZss5s1W4v8ncrjosnChY",
  authDomain: "yearbook-smu8102.firebaseapp.com",
  projectId: "yearbook-smu8102",
  storageBucket: "yearbook-smu8102.firebasestorage.app",
  messagingSenderId: "19715964087",
  appId: "1:19715964087:web:2cdc5b1ca6a59249e9a132",
  measurementId: "G-DVHTYRC4FT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
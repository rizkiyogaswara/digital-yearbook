// public/js/auth.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase and Auth
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Set persistence to local (survives page refreshes)
auth.setPersistence('LOCAL');

/**
 * Sign in with Google using popup
 * @returns {Promise} Promise resolving to the auth result
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
}

/**
 * Signs out the current user
 * @returns {Promise} Promise that resolves when sign out is complete
 */
export async function logOut() {
  try {
    await signOut(auth);
    console.log("User signed out successfully");
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}

/**
 * Check if a user is currently authenticated
 * @returns {boolean} True if user is authenticated
 */
export function isAuthenticated() {
  return !!auth.currentUser;
}

/**
 * Get the current authenticated user
 * @returns {Object|null} The current user or null if not authenticated
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Get user profile data in a clean format
 * @returns {Object|null} User profile data or null
 */
export function getUserProfile() {
  const user = auth.currentUser;
  if (!user) return null;
  
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };
}

/**
 * Redirects to login if user is not authenticated
 * @param {string} loginPath - Path to the login page
 */
export function requireAuth(loginPath = '/login.html') {
  if (!isAuthenticated()) {
    window.location.href = loginPath;
  }
}

/**
 * Redirects to home if user is already authenticated
 * @param {string} homePath - Path to redirect to if authenticated
 */
export function redirectIfAuthenticated(homePath = '/index.html') {
  if (isAuthenticated()) {
    window.location.href = homePath;
  }
}

/**
 * Listen for authentication state changes
 * @param {Function} callback - Function to call on auth state change
 * @returns {Function} Unsubscribe function
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}

// Check protected pages and redirect if needed
const isLoginPage = window.location.pathname.includes('login.html');

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
  // For login page, redirect to index if already logged in
  if (isLoginPage && user) {
    window.location.href = '/index.html';
  }
  
  // For other pages that need auth, redirect to login if not authenticated
  // Add more protected paths as needed
  const protectedPaths = ['/profile.html'];
  const currentPath = window.location.pathname;
  
  if (!user && protectedPaths.some(path => currentPath.includes(path))) {
    window.location.href = '/login.html';
  }
});
console.log("auth.js is loaded");

// Get the Firebase objects from global scope
const authn = window.yearBookApp.auth;
const googleProviders = window.yearBookApp.googleProvider;

console.log("auth:", authn);

/**
 * Sign in with Google using popup
 * @returns {Promise} Promise resolving to the auth result
 */
function signInWithGoogle() {
  return authn.signInWithPopup(googleProviders)
    .then(result => result.user)
    .catch(error => {
      console.error("Error signing in with Google:", error);
      throw error;
    });
}

/**
 * Signs out the current user
 * @returns {Promise} Promise that resolves when sign out is complete
 */
function logOut() {
  return authn.signOut()
    .then(() => {
      console.log("User signed out successfully");
      window.location.href = '/login.html';
    })
    .catch(error => {
      console.error("Error signing out:", error);
      throw error;
    });
}

/**
 * Check if a user is currently authenticated
 * @returns {boolean} True if user is authenticated
 */
function isAuthenticated() {
  return !!authn.currentUser;
}

/**
 * Get the current authenticated user
 * @returns {Object|null} The current user or null if not authenticated
 */
function getCurrentUser() {
  return authn.currentUser;
}

/**
 * Get user profile data in a clean format
 * @returns {Object|null} User profile data or null
 */
function getUserProfile() {
  const user = authn.currentUser;
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
function requireAuth(loginPath = '/login.html') {
  if (!isAuthenticated()) {
    window.location.href = loginPath;
  }
}

/**
 * Redirects to home if user is already authenticated
 * @param {string} homePath - Path to redirect to if authenticated
 */
function redirectIfAuthenticated(homePath = '/index.html') {
  if (isAuthenticated()) {
    window.location.href = homePath;
  }
}

/**
 * Listen for authentication state changes
 * @param {Function} callback - Function to call on auth state change
 * @returns {Function} Unsubscribe function
 */
function onAuthChange(callback) {
  return authn.onAuthStateChanged(callback);
}

// Check protected pages and redirect if needed
document.addEventListener('DOMContentLoaded', function() {
  const isLoginPage = window.location.pathname.includes('login.html');

  let redirectTimeout;

  // Listen for auth state changes
  authn.onAuthStateChanged(user => {
      console.log("Auth state changed. User:", user ? `Logged in as ${user.displayName || user.email}` : "Not logged in");
      
      // Clear any existing timeout
      clearTimeout(redirectTimeout);
      
      // Set a new timeout for redirection
      redirectTimeout = setTimeout(() => {
          // For login page, redirect to index if already logged in
          if (isLoginPage && user) {
              console.log("Redirecting to index.html from login page.");
              window.location.href = '/index.html';
          }
          
          // For other pages that need auth, redirect to login if not authenticated
          const currentPath = window.location.pathname;
          
          // Redirect to login if on index or any page other than login and not authenticated
          if (!user && !isLoginPage && (currentPath === '/' || currentPath.includes('/index.html') || 
              currentPath.includes('/photos-section.html') || currentPath.includes('/profile.html'))) {
              console.log("Redirecting to login.html from protected page.");
              window.location.href = '/login.html';
          }
      }, 1000); // Wait for 1 second before redirecting
  });
});

// Make functions globally available
window.signInWithGoogle = signInWithGoogle;
window.logOut = logOut;
// console.log("logOut function is attached to window");
window.isAuthenticated = isAuthenticated;
window.getCurrentUser = getCurrentUser;
window.getUserProfile = getUserProfile;
window.requireAuth = requireAuth;
window.redirectIfAuthenticated = redirectIfAuthenticated;
window.onAuthChange = onAuthChange;
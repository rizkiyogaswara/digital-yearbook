// public/js/auth.js
console.log("auth.js is loaded");

// Track auth state initialization
let authInitialized = false;
let pendingRedirect = false;

// Get the Firebase objects from global scope
const authn = window.yearBookApp?.auth;
const googleProviders = window.yearBookApp?.googleProvider;

if (!authn) {
  console.error("Firebase auth not found! Make sure firebase-config.js is loaded properly.");
} else {
  console.log("Firebase auth loaded successfully.");
}

/**
 * Sign in with Google using popup
 * @returns {Promise} Promise resolving to the auth result
 */
function signInWithGoogle() {
  if (!authn || !googleProviders) {
    console.error("Auth not initialized properly for Google sign-in");
    return Promise.reject(new Error("Auth not initialized"));
  }
  
  console.log("Starting Google sign-in process...");
  return authn.signInWithPopup(googleProviders)
    .then(result => {
      console.log("Google sign-in successful:", result.user.displayName);
      // Create a cookie to help with auth persistence
      document.cookie = "authState=authenticated; path=/; max-age=3600";
      return result.user;
    })
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
  if (!authn) {
    console.error("Auth not initialized properly for logout");
    window.location.href = '/login.html';
    return Promise.resolve();
  }
  
  console.log("Starting sign out process...");
  return authn.signOut()
    .then(() => {
      console.log("User signed out successfully");
      // Clear auth cookie
      document.cookie = "authState=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      // Redirect with a small delay
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 100);
    })
    .catch(error => {
      console.error("Error signing out:", error);
      // Still redirect on error
      window.location.href = '/login.html';
    });
}

/**
 * Check if a user is currently authenticated
 * @returns {boolean} True if user is authenticated
 */
function isAuthenticated() {
  return !!authn?.currentUser;
}

/**
 * Get the current authenticated user
 * @returns {Object|null} The current user or null if not authenticated
 */
function getCurrentUser() {
  return authn?.currentUser;
}

/**
 * Get user profile data in a clean format
 * @returns {Object|null} User profile data or null
 */
function getUserProfile() {
  const user = authn?.currentUser;
  if (!user) return null;
  
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };
}

/**
 * Helper to determine if we're on the login page
 */
function isLoginPage() {
  return window.location.pathname.includes('login.html');
}

/**
 * Redirects to login if user is not authenticated
 * @param {string} loginPath - Path to the login page
 */
function requireAuth(loginPath = '/login.html') {
  console.log("requireAuth called, checking auth state...");
  
  if (pendingRedirect) {
    console.log("Redirect already pending, skipping check");
    return;
  }
  
  // If auth isn't initialized yet, wait before checking
  if (!authInitialized) {
    console.log("Auth not yet initialized, setting up check for later");
    // Set up a listener for auth state and check again
    const unsubscribe = onAuthChange(user => {
      console.log("Auth state now initialized, user:", user ? "logged in" : "not logged in");
      unsubscribe(); // Remove the listener
      
      if (!user && !isLoginPage()) {
        console.log("User not authenticated after init, redirecting to login");
        pendingRedirect = true;
        window.location.href = loginPath;
      }
    });
    return;
  }
  
  // Auth is initialized, check directly
  if (!isAuthenticated() && !isLoginPage()) {
    console.log("User not authenticated, redirecting to login");
    pendingRedirect = true;
    window.location.href = loginPath;
  } else {
    console.log("User is authenticated, no redirect needed");
  }
}

/**
 * Redirects to home if user is already authenticated
 * @param {string} homePath - Path to redirect to if authenticated
 */
function redirectIfAuthenticated(homePath = '/index.html') {
  console.log("redirectIfAuthenticated called, checking auth state...");
  
  if (pendingRedirect) {
    console.log("Redirect already pending, skipping check");
    return;
  }
  
  // If auth isn't initialized yet, wait before checking
  if (!authInitialized) {
    console.log("Auth not yet initialized, setting up check for later");
    // Set up a listener for auth state and check again
    const unsubscribe = onAuthChange(user => {
      console.log("Auth state now initialized, user:", user ? "logged in" : "not logged in");
      unsubscribe(); // Remove the listener
      
      if (user && isLoginPage()) {
        console.log("User authenticated after init, redirecting to home");
        pendingRedirect = true;
        window.location.href = homePath;
      }
    });
    return;
  }
  
  // Auth is initialized, check directly
  if (isAuthenticated() && isLoginPage()) {
    console.log("User is authenticated on login page, redirecting to home");
    pendingRedirect = true;
    window.location.href = homePath;
  } else {
    console.log("No redirect needed for current auth state");
  }
}

/**
 * Listen for authentication state changes
 * @param {Function} callback - Function to call on auth state change
 * @returns {Function} Unsubscribe function
 */
function onAuthChange(callback) {
  if (!authn) {
    console.error("Auth not initialized for onAuthChange");
    return () => {}; // No-op unsubscribe
  }
  
  return authn.onAuthStateChanged(user => {
    authInitialized = true;
    callback(user);
  });
}

// Initialize auth state listener only once
if (authn) {
  console.log("Setting up main auth state listener");
  
  // Listen for auth state changes
  authn.onAuthStateChanged(user => {
    authInitialized = true;
    console.log("Auth initialized. User:", user ? `Logged in as ${user.displayName || user.email}` : "Not logged in");
    
    // Only handle page redirects if we're not already doing so
    if (pendingRedirect) {
      console.log("Skipping auth redirect - redirect already in progress");
      return;
    }
    
    // Check if we're on the login page
    const onLoginPage = isLoginPage();
    
    // For login page, redirect to index if already logged in
    if (onLoginPage && user) {
      console.log("On login page with authenticated user, redirecting to index");
      pendingRedirect = true;
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 100);
    }
    
    // For other pages that need auth, redirect to login if not authenticated
    if (!user && !onLoginPage) {
      const currentPath = window.location.pathname;
      
      // Redirect to login if on a protected page
      if (currentPath === '/' || 
          currentPath.includes('/index.html') || 
          currentPath.includes('/photos-section.html') || 
          currentPath.includes('/profile.html')) {
        console.log("On protected page without auth, redirecting to login");
        pendingRedirect = true;
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 100);
      }
    }
  });
}

// Check authentication and uploader privilege
async function checkUploaderAccess() {
  const auth = firebase.auth();

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      alert('You must be logged in to access this page.');
      window.location.href = '/login.html';
      return;
    }

    try {
      const idTokenResult = await user.getIdTokenResult();
      const claims = idTokenResult.claims;

      if (!claims.uploader) {
        alert('You do not have uploader privileges.');
        window.location.href = '/profile.html'; // or any fallback page
        return;
      }

      console.log('✅ User has uploader privilege. Access granted.');

    } catch (error) {
      console.error('Error checking uploader privilege:', error);
      alert('Error verifying permissions.');
      window.location.href = '/profile.html';
    }
  });
}

// Make functions globally available
window.signInWithGoogle = signInWithGoogle;
window.logOut = logOut;
window.isAuthenticated = isAuthenticated;
window.getCurrentUser = getCurrentUser;
window.getUserProfile = getUserProfile;
window.requireAuth = requireAuth;
window.redirectIfAuthenticated = redirectIfAuthenticated;
window.onAuthChange = onAuthChange;
window.checkUploaderAccess = checkUploaderAccess;
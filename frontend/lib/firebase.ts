// Firebase configuration and initialization
// Lazy loading to prevent webpack issues in Next.js

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCQX98YK78I8hwiIOBasyzE-BRZpV_HJos",
  authDomain: "olxapp-71912.firebaseapp.com",
  projectId: "olxapp-71912",
  storageBucket: "olxapp-71912.firebasestorage.app",
  messagingSenderId: "22269004924",
  appId: "1:22269004924:web:4705756637cf64b86b8df9",
  measurementId: "G-KR9D8ESZCX"
};

// Lazy initialization functions
let app: any = null;
let analytics: any = null;
let messaging: any = null;

// Initialize Firebase app (lazy)
export async function getFirebaseApp() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!app) {
    try {
      const firebaseApp = await import('firebase/app');
      const { initializeApp, getApps } = firebaseApp;
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }
    } catch (error) {
      console.error('Error initializing Firebase app:', error);
      return null;
    }
  }
  return app;
}

// Initialize Analytics (lazy)
export async function getFirebaseAnalytics() {
  if (typeof window === 'undefined') {
    return null;
  }

  const firebaseApp = await getFirebaseApp();
  if (!firebaseApp) return null;

  if (!analytics) {
    try {
      const firebaseAnalytics = await import('firebase/analytics');
      const { getAnalytics } = firebaseAnalytics;
      analytics = getAnalytics(firebaseApp);
    } catch (error) {
      console.warn('Firebase Analytics initialization failed:', error);
      return null;
    }
  }
  return analytics;
}

// Initialize Messaging (lazy)
export async function getFirebaseMessaging() {
  if (typeof window === 'undefined') {
    return null;
  }

  const firebaseApp = await getFirebaseApp();
  if (!firebaseApp) return null;

  if (!messaging && 'serviceWorker' in navigator) {
    try {
      const firebaseMessaging = await import('firebase/messaging');
      const { getMessaging } = firebaseMessaging;
      messaging = getMessaging(firebaseApp);
    } catch (error) {
      console.warn('Firebase Messaging initialization failed:', error);
      return null;
    }
  }
  return messaging;
}

// Initialize everything (call this on client side)
export async function initializeFirebase() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    await getFirebaseApp();
    await getFirebaseAnalytics();
    await getFirebaseMessaging();
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
}

// Export for backward compatibility
export { app, analytics, messaging };
export default getFirebaseApp;


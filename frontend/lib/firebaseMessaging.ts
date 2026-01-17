// Firebase Cloud Messaging service
import { getFirebaseMessaging } from './firebase';
import api from './api';

// VAPID key for Firebase Cloud Messaging
// This should match the one in your Firebase Console > Project Settings > Cloud Messaging
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // Dynamically import Firebase messaging
    const { getToken } = await import('firebase/messaging');
    const { getFirebaseMessaging } = await import('./firebase');
    const firebaseMessaging = await getFirebaseMessaging();
    
    if (!firebaseMessaging) {
      console.warn('Firebase Messaging not available');
      return null;
    }

    // Register service worker first
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('Firebase service worker registered:', registration);

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    // Get FCM token
    const token = await getToken(firebaseMessaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('FCM Token:', token);
      // Send token to backend
      await saveFCMTokenToBackend(token);
      return token;
    } else {
      console.warn('No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Save FCM token to backend
 */
async function saveFCMTokenToBackend(token: string): Promise<void> {
  try {
    await api.post('/push/mobile/subscribe', {
      fcmToken: token,
      deviceType: 'web',
      userAgent: navigator.userAgent
    });
    console.log('FCM token saved to backend');
  } catch (error) {
    console.error('Error saving FCM token to backend:', error);
  }
}

/**
 * Get current FCM token
 */
export async function getFCMToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // Dynamically import Firebase messaging
    const { getToken } = await import('firebase/messaging');
    const { getFirebaseMessaging } = await import('./firebase');
    const firebaseMessaging = await getFirebaseMessaging();
    
    if (!firebaseMessaging) {
      return null;
    }

    // Ensure service worker is registered
    const registration = await navigator.serviceWorker.ready;
    
    const token = await getToken(firebaseMessaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });
    return token || null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Listen for foreground messages (when app is open)
 */
export async function onMessageListener(): Promise<any> {
  if (typeof window === 'undefined') {
    return new Promise(() => {});
  }

  try {
    // Dynamically import Firebase messaging
    const { onMessage } = await import('firebase/messaging');
    const { getFirebaseMessaging } = await import('./firebase');
    const firebaseMessaging = await getFirebaseMessaging();
    
    if (!firebaseMessaging) {
      return new Promise(() => {});
    }

    return new Promise((resolve) => {
      onMessage(firebaseMessaging, (payload) => {
        console.log('Message received in foreground:', payload);
        resolve(payload);
      });
    });
  } catch (error) {
    console.error('Error setting up message listener:', error);
    return new Promise(() => {});
  }
}

/**
 * Delete FCM token (unsubscribe)
 */
export async function deleteFCMToken(): Promise<boolean> {
  if (typeof window === 'undefined' || !firebaseMessaging) {
    return false;
  }

  try {
    const token = await getFCMToken();
    if (token) {
      // Delete token from backend
      try {
        await api.post('/push/unsubscribe', {
          endpoint: token
        });
      } catch (error) {
        console.error('Error removing token from backend:', error);
      }
    }
    return true;
  } catch (error) {
    console.error('Error deleting FCM token:', error);
    return false;
  }
}

/**
 * Check if Firebase Messaging is supported
 */
export async function isFirebaseMessagingSupported(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }
  
  try {
    const { getFirebaseMessaging } = await import('./firebase');
    const messaging = await getFirebaseMessaging();
    return messaging !== null;
  } catch (error) {
    return false;
  }
}

// Export messaging getter for use in components
export async function getMessaging() {
  const { getFirebaseMessaging } = await import('./firebase');
  return await getFirebaseMessaging();
}


'use client';

import { useEffect } from 'react';
import toast from 'react-hot-toast';

/**
 * Firebase Provider Component
 * Initializes Firebase and handles foreground messages
 */
export default function FirebaseProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize Firebase and set up message listener
    const setupFirebase = async () => {
      try {
        // Dynamically import Firebase modules to avoid webpack issues
        const [{ initializeFirebase }, { isFirebaseMessagingSupported, onMessageListener }] = await Promise.all([
          import('@/lib/firebase'),
          import('@/lib/firebaseMessaging')
        ]);

        // Initialize Firebase (lazy)
        await initializeFirebase();

        // Check if Firebase Messaging is supported
        const supported = await isFirebaseMessagingSupported();
        if (!supported) {
          return;
        }

        // Listen for foreground messages (when app is open)
        onMessageListener()
          .then((payload) => {
            if (!payload) return;
            
            console.log('Foreground message received:', payload);
            
            // Show notification using toast or browser notification
            const notification = payload.notification;
            if (notification) {
              const title = notification.title || 'SellIt';
              const body = notification.body || 'You have a new notification';
              
              // Show toast notification
              toast.success(body, {
                duration: 5000,
                icon: '🔔',
              });

              // Optionally show browser notification if permission is granted
              if (Notification.permission === 'granted') {
                new Notification(title, {
                  body: body,
                  icon: notification.icon || '/logo.png',
                  badge: notification.badge || '/logo.png',
                  data: payload.data,
                });
              }
            }
          })
          .catch((error) => {
            console.error('Error listening to foreground messages:', error);
          });

        console.log('Firebase Messaging initialized');
      } catch (error) {
        // Silently fail - Firebase is optional
        if (process.env.NODE_ENV === 'development') {
          console.warn('Firebase setup failed (this is optional):', error);
        }
      }
    };

    setupFirebase();
  }, []);

  return <>{children}</>;
}


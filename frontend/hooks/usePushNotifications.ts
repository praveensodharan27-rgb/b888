'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  useEffect(() => {
    // Check if browser supports push notifications
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      
      // Get VAPID public key
      api.get('/push/vapid-key')
        .then((response) => {
          if (response.data.success) {
            setVapidPublicKey(response.data.publicKey);
          }
        })
        .catch((error) => {
          // Silently handle 503 (push notifications not configured)
          // Only log in development mode
          if (error.response?.status !== 503) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Push notifications not configured. Add VAPID keys to backend .env file.');
            }
          }
        })
        .finally(() => {
          setIsLoading(false);
        });

      // Check if already subscribed
      checkSubscriptionStatus();
    } else {
      setIsLoading(false);
    }
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const subscribe = async (): Promise<boolean> => {
    if (!isSupported || !vapidPublicKey) {
      console.error('Push notifications not supported or VAPID key not available');
      return false;
    }

    try {
      setIsLoading(true);

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        setIsLoading(false);
        return false;
      }

      // Subscribe to push notifications
      const keyArray = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyArray as any
      });

      // Send subscription to server
      const response = await api.post('/push/subscribe', {
        subscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: arrayBufferToBase64(subscription.getKey('auth')!)
          }
        },
        userAgent: navigator.userAgent
      });

      if (response.data.success) {
        setIsSubscribed(true);
        console.log('Successfully subscribed to push notifications');
        return true;
      } else {
        console.error('Failed to save subscription:', response.data.message);
        return false;
      }
    } catch (error: any) {
      console.error('Error subscribing to push notifications:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    try {
      setIsLoading(true);

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Get endpoint to send to server
        const endpoint = subscription.endpoint;

        // Unsubscribe from push service
        await subscription.unsubscribe();

        // Remove subscription from server
        await api.post('/push/unsubscribe', { endpoint });

        setIsSubscribed(false);
        console.log('Successfully unsubscribed from push notifications');
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    checkSubscriptionStatus
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}


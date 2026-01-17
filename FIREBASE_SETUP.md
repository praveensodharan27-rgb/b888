# Firebase Push Notifications Setup Guide

This guide explains how to set up Firebase Cloud Messaging (FCM) for push notifications in your SellIt application.

## 📋 Prerequisites

1. Firebase project created at [Firebase Console](https://console.firebase.google.com/)
2. Web app registered in Firebase project
3. Firebase configuration credentials

## 🔧 Setup Steps

### 1. Get VAPID Key from Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **olxapp-71912**
3. Go to **Project Settings** (gear icon)
4. Click on **Cloud Messaging** tab
5. Under **Web Push certificates**, you'll find your **Web Push certificates** or **Key pair**
6. Copy the **Key pair** (this is your VAPID key)

### 2. Add Environment Variable

Create or update `.env.local` in the `frontend` directory:

```env
NEXT_PUBLIC_FIREBASE_VAPID_KEY=YOUR_VAPID_KEY_HERE
```

**Note:** If you don't have a VAPID key yet, you can generate one:
- Go to Firebase Console > Project Settings > Cloud Messaging
- Click "Generate key pair" under Web Push certificates
- Copy the generated key

### 3. Firebase Configuration

The Firebase configuration is already set up in `frontend/lib/firebase.ts` with your project credentials:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyCQX98YK78I8hwiIOBasyzE-BRZpV_HJos",
  authDomain: "olxapp-71912.firebaseapp.com",
  projectId: "olxapp-71912",
  storageBucket: "olxapp-71912.firebasestorage.app",
  messagingSenderId: "22269004924",
  appId: "1:22269004924:web:4705756637cf64b86b8df9",
  measurementId: "G-KR9D8ESZCX"
};
```

### 4. Service Worker Setup

Two service workers are configured:

1. **`/public/sw.js`** - Handles both VAPID and FCM push notifications
2. **`/public/firebase-messaging-sw.js`** - Firebase-specific service worker for background messages

Both are automatically registered when Firebase Messaging is initialized.

## 🚀 Usage

### Automatic Initialization

Firebase is automatically initialized when the app loads through the `FirebaseProvider` component.

### Manual Subscription

Use the `usePushNotifications` hook to subscribe/unsubscribe:

```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';

function MyComponent() {
  const { 
    isSupported, 
    isSubscribed, 
    subscribe, 
    unsubscribe,
    useFirebase,
    fcmToken 
  } = usePushNotifications();

  return (
    <div>
      {isSupported && (
        <button onClick={isSubscribed ? unsubscribe : subscribe}>
          {isSubscribed ? 'Disable' : 'Enable'} Notifications
        </button>
      )}
      {useFirebase && fcmToken && (
        <p>FCM Token: {fcmToken.substring(0, 20)}...</p>
      )}
    </div>
  );
}
```

### Sending Notifications from Backend

The backend should send notifications to the FCM token. The token is automatically saved to the backend when the user subscribes.

**Backend endpoint:** `POST /api/push/mobile/subscribe`

**Request body:**
```json
{
  "fcmToken": "firebase-cloud-messaging-token",
  "deviceType": "web",
  "userAgent": "Mozilla/5.0..."
}
```

## 📱 How It Works

1. **User subscribes** → Firebase generates FCM token
2. **Token is saved** → Sent to backend via `/api/push/mobile/subscribe`
3. **Backend sends notification** → Uses FCM token to send push notification
4. **Service worker receives** → Shows notification even when app is closed
5. **User clicks notification** → App opens to relevant page

## 🔄 Fallback to VAPID

If Firebase Messaging is not available or not configured, the app automatically falls back to VAPID-based push notifications using the existing backend endpoints.

## 🧪 Testing

### Test Notification from Firebase Console

1. Go to Firebase Console > Cloud Messaging
2. Click "Send test message"
3. Enter your FCM token (get it from browser console after subscribing)
4. Send test notification

### Test from Backend

Use the test endpoint:

```bash
POST /api/push/mobile/test
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "title": "Test Notification",
  "message": "This is a test notification",
  "data": {
    "type": "test",
    "url": "/notifications"
  }
}
```

## 🔍 Troubleshooting

### Notifications not working?

1. **Check browser console** for errors
2. **Verify VAPID key** is set in `.env.local`
3. **Check service worker** is registered (Application tab in DevTools)
4. **Verify permissions** - User must grant notification permission
5. **Check FCM token** - Should be logged in console after subscription

### Service Worker not registering?

1. **Check HTTPS** - Service workers require HTTPS (or localhost)
2. **Clear cache** - Hard refresh (Ctrl+Shift+R)
3. **Check browser support** - Chrome, Firefox, Edge support FCM

### Token not saving to backend?

1. **Check authentication** - User must be logged in
2. **Check API endpoint** - `/api/push/mobile/subscribe` should be accessible
3. **Check network tab** - Verify request is successful

## 📚 Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Notifications Guide](https://web.dev/push-notifications-overview/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

## 🔒 Security Notes

1. **VAPID Key** - Safe to expose in frontend (it's public)
2. **FCM Token** - Should be stored securely on backend
3. **HTTPS Required** - Push notifications require HTTPS in production
4. **User Consent** - Always request permission before subscribing

---

**Last Updated:** 2024-01-15


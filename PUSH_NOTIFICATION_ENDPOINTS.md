# Push Notification API Endpoints

**Base URL:** `http://localhost:5000/api/push`

Complete documentation for all push notification endpoints.

---

## 📋 Overview

Push notifications allow your application to send real-time notifications to users even when they're not actively using the app. This API supports both web (browser) and mobile (iOS/Android) push notifications.

### Supported Platforms
- ✅ **Web Browsers** (Chrome, Firefox, Edge, Safari)
- ✅ **Android** (via Firebase Cloud Messaging - FCM)
- ✅ **iOS** (via Apple Push Notification Service - APNS)

---

## 🔑 Authentication

Most endpoints require JWT Bearer token authentication:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

**Exception:** `/vapid-key` endpoint is public (no authentication required).

---

## 📡 Endpoints

### 1. Get VAPID Public Key
**`GET /api/push/vapid-key`** (Public)

Get the VAPID public key required for web push notifications.

**Request:**
```http
GET /api/push/vapid-key
```

**Response:**
```json
{
  "success": true,
  "publicKey": "BEl62iUYgUivxIkv69yViEuiBIa40HI..."
}
```

**Error Response (if not configured):**
```json
{
  "success": false,
  "message": "Push notifications not configured"
}
```

**Example (JavaScript):**
```javascript
const response = await fetch('http://localhost:5000/api/push/vapid-key');
const { publicKey } = await response.json();
console.log('VAPID Public Key:', publicKey);
```

---

### 2. Subscribe to Push Notifications (Web)
**`POST /api/push/subscribe`** (Auth Required)

Subscribe to web push notifications using browser's Push API.

**Request:**
```http
POST /api/push/subscribe
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "BGhK7tL9fYfbghJUgha7K6JtF7YfbghJUgha7K6JtF7YfbghJUgha7K6JtF7YfbghJUgha7K6JtF7Y=",
      "auth": "6JtF7YfbghJUgha7K6JtF7YfbghJUgha7K6JtF7Y="
    }
  },
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription saved"
}
```

**Error Response:**
```json
{
  "success": false,
  "errors": [
    {
      "msg": "Valid endpoint URL required",
      "param": "subscription.endpoint"
    }
  ]
}
```

**Example (JavaScript - Browser):**
```javascript
// Get VAPID public key
const response = await fetch('/api/push/vapid-key');
const { publicKey } = await response.json();

// Convert VAPID key to Uint8Array
const applicationServerKey = urlBase64ToUint8Array(publicKey);

// Subscribe to push notifications
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: applicationServerKey
});

// Send subscription to server
await fetch('/api/push/subscribe', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    subscription: {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
        auth: arrayBufferToBase64(subscription.getKey('auth'))
      }
    }
  })
});
```

---

### 3. Unsubscribe from Push Notifications
**`POST /api/push/unsubscribe`** (Auth Required)

Remove push notification subscription.

**Request:**
```http
POST /api/push/unsubscribe
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription removed"
}
```

**Example (JavaScript):**
```javascript
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.getSubscription();

if (subscription) {
  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      endpoint: subscription.endpoint
    })
  });
  
  await subscription.unsubscribe();
}
```

---

### 4. Subscribe (Mobile)
**`POST /api/push/mobile/subscribe`** (Auth Required)

Subscribe to push notifications with mobile device information. This endpoint also registers/updates the device record.

**Request:**
```http
POST /api/push/mobile/subscribe
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "BGhK7tL9fYfbghJUgha7K6JtF7YfbghJUgha7K6JtF7YfbghJUgha7K6JtF7Y=",
      "auth": "6JtF7YfbghJUgha7K6JtF7YfbghJUgha7K6JtF7Y="
    }
  },
  "deviceId": "unique-device-id-123",
  "deviceType": "android",
  "fcmToken": "firebase-cloud-messaging-token",
  "apnsToken": "apple-push-notification-token",
  "userAgent": "Mozilla/5.0..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscribed successfully",
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/..."
  }
}
```

**Field Descriptions:**
- `subscription` - Push subscription object (required)
- `deviceId` - Unique device identifier (optional but recommended)
- `deviceType` - Device type: `"ios"`, `"android"`, or `"web"` (optional)
- `fcmToken` - Firebase Cloud Messaging token for Android (optional)
- `apnsToken` - Apple Push Notification Service token for iOS (optional)

**Example (React Native / Mobile):**
```javascript
// Android example
import messaging from '@react-native-firebase/messaging';

async function subscribeToPushNotifications() {
  // Request permission
  const authStatus = await messaging().requestPermission();
  
  if (authStatus === messaging.AuthorizationStatus.AUTHORIZED) {
    // Get FCM token
    const fcmToken = await messaging().getToken();
    
    // Get push subscription (if using web push)
    const subscription = await getPushSubscription();
    
    // Subscribe
    await fetch('http://localhost:5000/api/push/mobile/subscribe', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscription: subscription,
        deviceId: getDeviceId(),
        deviceType: 'android',
        fcmToken: fcmToken
      })
    });
  }
}
```

---

### 5. Get Notification Settings
**`GET /api/push/mobile/settings`** (Auth Required)

Get user's push notification subscription settings.

**Request:**
```http
GET /api/push/mobile/settings
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "enabled": true,
    "subscriptionsCount": 2,
    "subscriptions": [
      {
        "id": "subscription-id-1",
        "endpoint": "https://fcm.googleapis.com/fcm/send/...",
        "createdAt": "2024-01-15T10:30:00Z"
      },
      {
        "id": "subscription-id-2",
        "endpoint": "https://fcm.googleapis.com/fcm/send/...",
        "createdAt": "2024-01-15T11:00:00Z"
      }
    ]
  }
}
```

**Example:**
```javascript
const response = await fetch('http://localhost:5000/api/push/mobile/settings', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { settings } = await response.json();
console.log('Push notifications enabled:', settings.enabled);
console.log('Active subscriptions:', settings.subscriptionsCount);
```

---

### 6. Test Push Notification
**`POST /api/push/mobile/test`** (Auth Required)

Send a test push notification to the current user.

**Request:**
```http
POST /api/push/mobile/test
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Test Notification",
  "message": "This is a test notification",
  "data": {
    "customField": "customValue",
    "link": "/notifications",
    "type": "test"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test notification sent",
  "sent": 2,
  "total": 2
}
```

**Field Descriptions:**
- `title` - Notification title (required)
- `message` - Notification message/body (required)
- `data` - Custom data object (optional)

**Example:**
```javascript
await fetch('http://localhost:5000/api/push/mobile/test', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Hello!',
    message: 'This is a test notification',
    data: {
      type: 'test',
      link: '/notifications'
    }
  })
});
```

---

## 🔧 Setup & Configuration

### 1. Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

This will output:
```
Public Key: BEl62iUYgUivxIkv69yViEuiBIa40HI...
Private Key: 8K1vWfdyLbhezLJzghJUgha7K6JtF7YfbghJUgha7K6JtF7Y=
```

### 2. Add to Environment Variables

Add to your `.env` file:
```env
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa40HI...
VAPID_PRIVATE_KEY=8K1vWfdyLbhezLJzghJUgha7K6JtF7YfbghJUgha7K6JtF7Y=
VAPID_SUBJECT=mailto:support@sellit.com
```

### 3. Service Worker (Web)

Create a service worker file (`/sw.js`) to handle push notifications:

```javascript
// sw.js
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  
  const title = data.title || 'New Notification';
  const options = {
    body: data.message || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: data.data || {}
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const data = event.notification.data;
  const urlToOpen = data.link || '/';
  
  event.waitUntil(
    clients.openWindow(urlToOpen)
  );
});
```

---

## 📱 Mobile Setup

### Android (Firebase Cloud Messaging)

1. **Setup Firebase Project**
   - Create Firebase project
   - Add Android app
   - Download `google-services.json`

2. **Install Firebase SDK**
   ```bash
   npm install @react-native-firebase/app @react-native-firebase/messaging
   ```

3. **Request Permission & Get Token**
   ```javascript
   import messaging from '@react-native-firebase/messaging';
   
   const fcmToken = await messaging().getToken();
   ```

### iOS (Apple Push Notification Service)

1. **Setup Apple Developer Account**
   - Enable Push Notifications capability
   - Generate APNs certificate/key

2. **Install Firebase SDK**
   ```bash
   npm install @react-native-firebase/app @react-native-firebase/messaging
   ```

3. **Request Permission**
   ```javascript
   import messaging from '@react-native-firebase/messaging';
   
   const authStatus = await messaging().requestPermission();
   ```

---

## 🚀 Usage Examples

### Complete Web Push Setup

```javascript
// 1. Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      console.log('Service Worker registered');
      return registration;
    })
    .then(registration => {
      // 2. Request Notification Permission
      return Notification.requestPermission();
    })
    .then(permission => {
      if (permission === 'granted') {
        // 3. Get VAPID Key
        return fetch('/api/push/vapid-key');
      }
    })
    .then(response => response.json())
    .then(({ publicKey }) => {
      // 4. Subscribe
      return navigator.serviceWorker.ready.then(registration => {
        return registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
      });
    })
    .then(subscription => {
      // 5. Send Subscription to Server
      return fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
              auth: arrayBufferToBase64(subscription.getKey('auth'))
            }
          }
        })
      });
    })
    .then(() => {
      console.log('Subscribed to push notifications!');
    });
}
```

---

## 🔍 Error Handling

### Common Errors

**1. Push notifications not configured**
```json
{
  "success": false,
  "message": "Push notifications not configured"
}
```
**Solution:** Add VAPID keys to environment variables.

**2. Invalid subscription**
```json
{
  "success": false,
  "errors": [
    {
      "msg": "Valid endpoint URL required",
      "param": "subscription.endpoint"
    }
  ]
}
```
**Solution:** Ensure subscription object is properly formatted.

**3. Unauthorized**
```json
{
  "success": false,
  "message": "Authentication required"
}
```
**Solution:** Include valid JWT token in Authorization header.

---

## 📊 Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 500 | Internal Server Error |
| 503 | Service Unavailable (not configured) |

---

## 🔒 Security Notes

1. **VAPID Private Key** - Must be kept secret, never expose to client
2. **VAPID Public Key** - Safe to expose, used by client for subscription
3. **Subscriptions** - Tied to user accounts, require authentication
4. **HTTPS Required** - Push notifications require HTTPS in production
5. **Invalid Subscriptions** - Automatically removed when detected

---

## 📚 Additional Resources

- **Web Push Protocol:** https://web.dev/push-notifications-overview/
- **Firebase Cloud Messaging:** https://firebase.google.com/docs/cloud-messaging
- **Apple Push Notifications:** https://developer.apple.com/notifications/

---

## 🧪 Testing

### Test Subscription
```bash
curl -X POST http://localhost:5000/api/push/subscribe \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subscription": {
      "endpoint": "https://fcm.googleapis.com/fcm/send/...",
      "keys": {
        "p256dh": "...",
        "auth": "..."
      }
    }
  }'
```

### Test Notification
```bash
curl -X POST http://localhost:5000/api/push/mobile/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "message": "This is a test"
  }'
```

---

**Last Updated:** 2024-01-15  
**API Version:** 1.0


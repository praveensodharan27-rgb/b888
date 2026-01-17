# Mobile API Documentation

**Base URL:** `http://localhost:5000/api`

This document describes all mobile-specific APIs for the SellIt mobile application.

---

## 📱 Mobile Device Management (`/api/mobile`)

### 1. Register Device
**`POST /api/mobile/device/register`** (Auth Required)

Register a mobile device for push notifications and tracking.

**Request Body:**
```json
{
  "deviceId": "unique-device-id-123",
  "deviceType": "android", // or "ios"
  "deviceName": "Samsung Galaxy S21",
  "osVersion": "Android 12",
  "appVersion": "1.0.0",
  "fcmToken": "firebase-cloud-messaging-token",
  "apnsToken": "apple-push-notification-token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device registered successfully",
  "device": {
    "id": "device-id",
    "deviceId": "unique-device-id-123",
    "deviceType": "android",
    "deviceName": "Samsung Galaxy S21",
    "osVersion": "Android 12",
    "appVersion": "1.0.0",
    "fcmToken": "firebase-cloud-messaging-token",
    "isActive": true,
    "lastActiveAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### 2. Get User Devices
**`GET /api/mobile/device/list`** (Auth Required)

Get all registered devices for the current user.

**Response:**
```json
{
  "success": true,
  "devices": [
    {
      "id": "device-id",
      "deviceId": "unique-device-id-123",
      "deviceType": "android",
      "deviceName": "Samsung Galaxy S21",
      "lastActiveAt": "2024-01-15T10:30:00Z",
      "isActive": true
    }
  ]
}
```

---

### 3. Unregister Device
**`DELETE /api/mobile/device/:deviceId`** (Auth Required)

Unregister a device.

**Response:**
```json
{
  "success": true,
  "message": "Device unregistered successfully"
}
```

---

### 4. Update Device Location
**`PUT /api/mobile/device/:deviceId/update-location`** (Auth Required)

Update device's current location.

**Request Body:**
```json
{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "accuracy": 10.5,
  "address": "New Delhi, India"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Location updated successfully",
  "device": {
    "id": "device-id",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "locationAccuracy": 10.5,
    "locationAddress": "New Delhi, India",
    "lastLocationUpdate": "2024-01-15T10:30:00Z"
  }
}
```

---

### 5. Get App Info
**`GET /api/mobile/app-info`** (Public)

Get mobile app information and configuration.

**Response:**
```json
{
  "success": true,
  "appInfo": {
    "appName": "SellIt",
    "appVersion": "1.0.0",
    "minSupportedVersion": "1.0.0",
    "apiVersion": "1.0",
    "features": {
      "pushNotifications": true,
      "locationTracking": true,
      "paymentGateway": true,
      "chat": true,
      "offers": true
    },
    "config": {
      "maxImageSize": 5242880,
      "allowedImageTypes": ["image/jpeg", "image/png", "image/webp"],
      "maxImagesPerAd": 10
    }
  }
}
```

---

## 🎁 Offers (`/api/offers`)

### 1. Get All Offers
**`GET /api/offers`** (Public)

Get all active offers.

**Query Parameters:**
- `categoryId` (optional): Filter by category
- `type` (optional): Filter by offer type

**Response:**
```json
{
  "success": true,
  "offers": [
    {
      "id": "offer-id",
      "title": "50% Off Premium Ads",
      "description": "Get premium ad features at half price",
      "type": "premium",
      "discountPercent": 50,
      "categoryId": "category-id",
      "imageUrl": "https://example.com/offer.jpg",
      "expiresAt": "2024-12-31T23:59:59Z",
      "isActive": true,
      "priority": 10,
      "category": {
        "id": "category-id",
        "name": "Electronics",
        "slug": "electronics"
      }
    }
  ]
}
```

---

### 2. Get Single Offer
**`GET /api/offers/:id`** (Public)

Get details of a specific offer.

**Response:**
```json
{
  "success": true,
  "offer": {
    "id": "offer-id",
    "title": "50% Off Premium Ads",
    "description": "Get premium ad features at half price",
    "type": "premium",
    "discountPercent": 50,
    "expiresAt": "2024-12-31T23:59:59Z",
    "termsAndConditions": "Valid until December 31, 2024",
    "category": {
      "id": "category-id",
      "name": "Electronics"
    }
  }
}
```

---

### 3. Get User's Claimed Offers
**`GET /api/offers/user/my-offers`** (Auth Required)

Get all offers claimed by the current user.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "claimedOffers": [
    {
      "id": "claimed-offer-id",
      "offerId": "offer-id",
      "claimedAt": "2024-01-15T10:30:00Z",
      "offer": {
        "id": "offer-id",
        "title": "50% Off Premium Ads",
        "type": "premium"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

---

### 4. Claim Offer
**`POST /api/offers/:id/claim`** (Auth Required)

Claim an offer.

**Response:**
```json
{
  "success": true,
  "message": "Offer claimed successfully",
  "claimedOffer": {
    "id": "claimed-offer-id",
    "userId": "user-id",
    "offerId": "offer-id",
    "claimedAt": "2024-01-15T10:30:00Z",
    "offer": {
      "id": "offer-id",
      "title": "50% Off Premium Ads"
    }
  }
}
```

---

### 5. Check Claim Status
**`GET /api/offers/:id/check-claim`** (Auth Required)

Check if user has claimed a specific offer.

**Response:**
```json
{
  "success": true,
  "isClaimed": true,
  "claimedOffer": {
    "id": "claimed-offer-id",
    "claimedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## 📍 Location APIs - Mobile (`/api/locations`)

### 1. Get Nearby Locations
**`GET /api/locations/mobile/nearby`** (Public)

Get locations near specified coordinates.

**Query Parameters:**
- `latitude` (required): Latitude coordinate
- `longitude` (required): Longitude coordinate
- `radius` (optional): Search radius in km (default: 10)

**Response:**
```json
{
  "success": true,
  "locations": [
    {
      "id": "location-id",
      "name": "New Delhi",
      "slug": "new-delhi",
      "state": "Delhi",
      "city": "New Delhi",
      "latitude": 28.6139,
      "longitude": 77.2090,
      "distance": 2.5
    }
  ],
  "center": {
    "latitude": 28.6139,
    "longitude": 77.2090
  },
  "radius": 10
}
```

---

### 2. Search Locations
**`GET /api/locations/mobile/search`** (Public)

Search locations by query string.

**Query Parameters:**
- `q` (required): Search query (min 2 characters)
- `limit` (optional): Max results (default: 20)

**Response:**
```json
{
  "success": true,
  "locations": [
    {
      "id": "location-id",
      "name": "New Delhi",
      "slug": "new-delhi",
      "state": "Delhi",
      "city": "New Delhi"
    }
  ],
  "query": "delhi"
}
```

---

## 💬 Chat/Messages - Mobile (`/api/chat`)

### 1. Get Chat Summary
**`GET /api/chat/mobile/summary`** (Auth Required)

Get lightweight chat summary optimized for mobile.

**Response:**
```json
{
  "success": true,
  "summary": [
    {
      "roomId": "room-id",
      "otherUser": {
        "id": "user-id",
        "name": "John Doe",
        "avatar": "https://example.com/avatar.jpg"
      },
      "ad": {
        "id": "ad-id",
        "title": "iPhone 13 Pro",
        "images": ["https://example.com/image.jpg"],
        "price": 50000
      },
      "lastMessage": {
        "id": "message-id",
        "content": "Hello!",
        "type": "TEXT",
        "createdAt": "2024-01-15T10:30:00Z",
        "isRead": false,
        "isFromMe": false
      },
      "unreadCount": 3,
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "totalUnread": 5
}
```

---

### 2. Send Message (Mobile)
**`POST /api/chat/mobile/message`** (Auth Required)

Send a message from mobile app.

**Request Body:**
```json
{
  "roomId": "room-id",
  "content": "Hello!",
  "type": "TEXT", // or "IMAGE"
  "imageUrl": "https://example.com/image.jpg" // required if type is IMAGE
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "message-id",
    "content": "Hello!",
    "type": "TEXT",
    "senderId": "user-id",
    "receiverId": "receiver-id",
    "roomId": "room-id",
    "createdAt": "2024-01-15T10:30:00Z",
    "sender": {
      "id": "user-id",
      "name": "John Doe",
      "avatar": "https://example.com/avatar.jpg"
    }
  }
}
```

---

## 💳 Payment - Mobile (`/api/payment-gateway`)

### 1. Create Payment Order (Mobile)
**`POST /api/payment-gateway/mobile/order`** (Auth Required)

Create a payment order optimized for mobile.

**Request Body:**
```json
{
  "amount": 1000.00,
  "currency": "INR",
  "description": "Premium ad upgrade",
  "orderType": "premium" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment order created successfully",
  "orderId": "order-abc123",
  "amount": 1000.00,
  "currency": "INR",
  "razorpayOrderId": "order_xyz789",
  "razorpayKeyId": "rzp_test_1234567890",
  "mobile": {
    "orderId": "order-abc123",
    "amount": 1000.00,
    "currency": "INR",
    "razorpayOrderId": "order_xyz789",
    "razorpayKeyId": "rzp_test_1234567890"
  }
}
```

---

### 2. Verify Payment (Mobile)
**`POST /api/payment-gateway/mobile/verify`** (Auth Required)

Verify payment after successful checkout.

**Request Body:**
```json
{
  "orderId": "order-abc123",
  "paymentId": "pay_xyz789",
  "signature": "signature_hash_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "order": {
    "orderId": "order-abc123",
    "status": "paid",
    "amount": 1000.00,
    "currency": "INR",
    "paymentId": "pay_xyz789",
    "paidAt": "2024-01-15T10:35:00Z"
  }
}
```

---

### 3. Get Payment History (Mobile)
**`GET /api/payment-gateway/mobile/history`** (Auth Required)

Get user's payment history optimized for mobile.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "orderId": "order-abc123",
      "amount": 1000.00,
      "currency": "INR",
      "status": "paid",
      "createdAt": "2024-01-15T10:30:00Z",
      "paidAt": "2024-01-15T10:35:00Z",
      "paymentId": "pay_xyz789"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "pages": 1
  }
}
```

---

## 🔔 Push Notifications - Mobile (`/api/push`)

### 1. Subscribe (Mobile)
**`POST /api/push/mobile/subscribe`** (Auth Required)

Subscribe to push notifications with device info.

**Request Body:**
```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/...",
    "keys": {
      "p256dh": "key-here",
      "auth": "auth-key-here"
    }
  },
  "deviceId": "unique-device-id",
  "deviceType": "android", // or "ios"
  "fcmToken": "firebase-token",
  "apnsToken": "apple-token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscribed successfully",
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/..."
  }
}
```

---

### 2. Get Notification Settings
**`GET /api/push/mobile/settings`** (Auth Required)

Get user's push notification settings.

**Response:**
```json
{
  "success": true,
  "settings": {
    "enabled": true,
    "subscriptionsCount": 2,
    "subscriptions": [
      {
        "id": "subscription-id",
        "endpoint": "https://fcm.googleapis.com/...",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

---

### 3. Test Push Notification
**`POST /api/push/mobile/test`** (Auth Required)

Send a test push notification to the current user.

**Request Body:**
```json
{
  "title": "Test Notification",
  "message": "This is a test notification",
  "data": {
    "customField": "customValue"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test notification sent",
  "sent": 1
}
```

---

## 🔑 Authentication

All endpoints marked as "Auth Required" need a JWT token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📝 Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [ ... ] // optional validation errors
}
```

---

## 🚀 Quick Start Examples

### Register Device
```javascript
const response = await fetch('/api/mobile/device/register', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    deviceId: 'unique-device-id',
    deviceType: 'android',
    fcmToken: 'firebase-token'
  })
});
```

### Claim Offer
```javascript
const response = await fetch('/api/offers/offer-id/claim', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Send Message
```javascript
const response = await fetch('/api/chat/mobile/message', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    roomId: 'room-id',
    content: 'Hello!',
    type: 'TEXT'
  })
});
```

---

**Last Updated:** 2024-01-15


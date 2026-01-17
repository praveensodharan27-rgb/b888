# Complete Web API Documentation

**Base URL:** `http://localhost:5000/api`  
**Production URL:** `https://your-domain.com/api`

---

## 📊 API Overview

- **Total REST Endpoints:** 280+
- **Socket.IO Events:** 25+ real-time events
- **Public Endpoints:** ~50
- **Authenticated Endpoints:** ~200
- **Admin Endpoints:** ~45
- **Mobile Endpoints:** 20+

---

## 🔑 Authentication

Most endpoints require JWT Bearer token authentication:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Get Authentication Token

1. **Register/Login** via `/api/auth/register` or `/api/auth/login`
2. **Receive JWT token** in response
3. **Include token** in all authenticated requests

---

## 📋 Table of Contents

1. [Health Check](#health-check)
2. [Authentication](#authentication-api)
3. [User Management](#user-management)
4. [Ads](#ads)
5. [Categories](#categories)
6. [Locations](#locations)
7. [Chat/Messages](#chatmessages)
8. [Payment Gateway](#payment-gateway)
9. [Premium Features](#premium-features)
10. [Offers](#offers)
11. [Mobile APIs](#mobile-apis)
12. [Push Notifications](#push-notifications)
13. [Search](#search)
14. [Admin](#admin)
15. [Socket.IO](#socketio)

---

## 🏥 Health Check

### Get Server Status
**`GET /health`** (Public)

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 🔐 Authentication API

### Register User
**`POST /api/auth/register`** (Public)

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

### Login
**`POST /api/auth/login`** (Public)

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

### Send OTP
**`POST /api/auth/send-otp`** (Public)

**Request:**
```json
{
  "email": "john@example.com",
  "phone": "+1234567890"
}
```

---

### Verify OTP
**`POST /api/auth/verify-otp`** (Public)

**Request:**
```json
{
  "email": "john@example.com",
  "code": "123456"
}
```

---

### Get Current User
**`GET /api/auth/me`** (Auth Required)

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "avatar": "https://example.com/avatar.jpg"
  }
}
```

---

## 👤 User Management

### Get Public Profile
**`GET /api/user/public/:userId`** (Public)

### Get Own Profile
**`GET /api/user/profile`** (Auth Required)

### Update Profile
**`PUT /api/user/profile`** (Auth Required)

**Request:**
```json
{
  "name": "John Doe",
  "bio": "I love selling items",
  "locationId": "location-id"
}
```

### Upload Avatar
**`PUT /api/user/avatar`** (Auth Required)

**Request:** `multipart/form-data` with `avatar` file

### Change Password
**`PUT /api/user/password`** (Auth Required)

**Request:**
```json
{
  "currentPassword": "oldPassword",
  "newPassword": "newPassword123"
}
```

### Get User's Ads
**`GET /api/user/ads`** (Auth Required)

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `status` - Filter by status (PENDING, APPROVED, REJECTED, SOLD, EXPIRED)

---

## 📦 Ads

### Get All Ads
**`GET /api/ads`** (Public)

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `categoryId` - Filter by category
- `locationId` - Filter by location
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `search` - Search query
- `sort` - Sort order (newest, oldest, price_low, price_high)

**Response:**
```json
{
  "success": true,
  "ads": [
    {
      "id": "ad-id",
      "title": "iPhone 13 Pro",
      "description": "Brand new iPhone",
      "price": 50000,
      "images": ["https://example.com/image.jpg"],
      "category": {
        "id": "category-id",
        "name": "Electronics"
      },
      "location": {
        "id": "location-id",
        "name": "New Delhi"
      },
      "user": {
        "id": "user-id",
        "name": "John Doe",
        "avatar": "https://example.com/avatar.jpg"
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

### Get Single Ad
**`GET /api/ads/:id`** (Public)

### Create Ad
**`POST /api/ads`** (Auth Required)

**Request:** `multipart/form-data`
- `title` - Ad title
- `description` - Ad description
- `price` - Price
- `categoryId` - Category ID
- `locationId` - Location ID
- `images` - Image files (multiple)

### Update Ad
**`PUT /api/ads/:id`** (Auth Required)

### Delete Ad
**`DELETE /api/ads/:id`** (Auth Required)

### Favorite/Unfavorite Ad
**`POST /api/ads/:id/favorite`** (Auth Required)  
**`DELETE /api/ads/:id/favorite`** (Auth Required)

---

## 🏷️ Categories

### Get All Categories
**`GET /api/categories`** (Public)

**Response:**
```json
{
  "success": true,
  "categories": [
    {
      "id": "category-id",
      "name": "Electronics",
      "slug": "electronics",
      "icon": "https://example.com/icon.png",
      "image": "https://example.com/image.jpg",
      "description": "Electronic items"
    }
  ]
}
```

### Get Category by Slug
**`GET /api/categories/:slug`** (Public)

### Get Subcategories
**`GET /api/categories/:id/subcategories`** (Public)

---

## 📍 Locations

### Get All Locations
**`GET /api/locations`** (Public)

**Query Parameters:**
- `state` - Filter by state
- `city` - Filter by city

### Get Location by Slug
**`GET /api/locations/:slug`** (Public)

### Get Nearby Locations (Mobile)
**`GET /api/locations/mobile/nearby`** (Public)

**Query Parameters:**
- `latitude` - Latitude (required)
- `longitude` - Longitude (required)
- `radius` - Radius in km (default: 10)

### Search Locations (Mobile)
**`GET /api/locations/mobile/search`** (Public)

**Query Parameters:**
- `q` - Search query (required, min 2 chars)
- `limit` - Max results (default: 20)

---

## 💬 Chat/Messages

### Create Chat Room
**`POST /api/chat/room`** (Auth Required)

**Request:**
```json
{
  "adId": "ad-id",
  "receiverId": "user-id"
}
```

### Get Chat Rooms
**`GET /api/chat/rooms`** (Auth Required)

### Get Messages
**`GET /api/chat/rooms/:roomId/messages`** (Auth Required)

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page (default: 50)

### Send Message (REST)
**`POST /api/chat/rooms/:roomId/messages`** (Auth Required)

**Request:**
```json
{
  "content": "Hello!",
  "type": "TEXT",
  "imageUrl": "https://example.com/image.jpg"
}
```

### Get Chat Summary (Mobile)
**`GET /api/chat/mobile/summary`** (Auth Required)

### Send Message (Mobile)
**`POST /api/chat/mobile/message`** (Auth Required)

---

## 💳 Payment Gateway

### Create Payment Order
**`POST /api/payment-gateway/order`** (Auth Required)

**Request:**
```json
{
  "amount": 1000.00,
  "currency": "INR",
  "notes": {
    "order_type": "premium_ad",
    "ad_id": "ad-id"
  }
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "orderId": "order-abc123",
    "amount": 1000.00,
    "currency": "INR",
    "status": "created"
  },
  "razorpayOrder": {
    "id": "order_xyz789",
    "amount": 100000,
    "currency": "INR"
  },
  "razorpayKeyId": "rzp_test_1234567890"
}
```

---

### Verify Payment
**`POST /api/payment-gateway/verify`** (Auth Required)

**Request:**
```json
{
  "orderId": "order-abc123",
  "paymentId": "pay_xyz789",
  "signature": "signature_hash"
}
```

### Get Payment History
**`GET /api/payment-gateway/payments`** (Auth Required)

### Mobile Payment Order
**`POST /api/payment-gateway/mobile/order`** (Auth Required)

### Mobile Payment Verify
**`POST /api/payment-gateway/mobile/verify`** (Auth Required)

### Mobile Payment History
**`GET /api/payment-gateway/mobile/history`** (Auth Required)

---

## 💎 Premium Features

### Get Premium Offers
**`GET /api/premium/offers`** (Public)

### Create Premium Order
**`POST /api/premium/order`** (Auth Required)

**Request:**
```json
{
  "adId": "ad-id",
  "premiumType": "TOP",
  "duration": 7
}
```

### Verify Premium Payment
**`POST /api/premium/verify`** (Auth Required)

### Get Premium Orders
**`GET /api/premium/orders`** (Auth Required)

---

## 🎁 Offers

### Get All Offers
**`GET /api/offers`** (Public)

**Query Parameters:**
- `categoryId` - Filter by category
- `type` - Filter by offer type

**Response:**
```json
{
  "success": true,
  "offers": [
    {
      "id": "offer-id",
      "title": "50% Off Premium Ads",
      "description": "Get premium features at half price",
      "type": "premium",
      "discountPercent": 50,
      "expiresAt": "2024-12-31T23:59:59Z",
      "category": {
        "id": "category-id",
        "name": "Electronics"
      }
    }
  ]
}
```

### Get Single Offer
**`GET /api/offers/:id`** (Public)

### Claim Offer
**`POST /api/offers/:id/claim`** (Auth Required)

### Get User's Claimed Offers
**`GET /api/offers/user/my-offers`** (Auth Required)

### Check Claim Status
**`GET /api/offers/:id/check-claim`** (Auth Required)

---

## 📱 Mobile APIs

### Register Device
**`POST /api/mobile/device/register`** (Auth Required)

**Request:**
```json
{
  "deviceId": "unique-device-id",
  "deviceType": "android",
  "deviceName": "Samsung Galaxy S21",
  "fcmToken": "firebase-token",
  "apnsToken": "apple-token"
}
```

### Get User Devices
**`GET /api/mobile/device/list`** (Auth Required)

### Unregister Device
**`DELETE /api/mobile/device/:deviceId`** (Auth Required)

### Update Device Location
**`PUT /api/mobile/device/:deviceId/update-location`** (Auth Required)

**Request:**
```json
{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "accuracy": 10.5,
  "address": "New Delhi, India"
}
```

### Get App Info
**`GET /api/mobile/app-info`** (Public)

---

## 🔔 Push Notifications

### Get VAPID Key
**`GET /api/push/vapid-key`** (Public)

### Subscribe
**`POST /api/push/subscribe`** (Auth Required)

**Request:**
```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/...",
    "keys": {
      "p256dh": "key-here",
      "auth": "auth-key-here"
    }
  }
}
```

### Mobile Subscribe
**`POST /api/push/mobile/subscribe`** (Auth Required)

**Request:**
```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/...",
    "keys": {
      "p256dh": "key-here",
      "auth": "auth-key-here"
    }
  },
  "deviceId": "device-id",
  "deviceType": "android",
  "fcmToken": "firebase-token"
}
```

### Get Notification Settings
**`GET /api/push/mobile/settings`** (Auth Required)

### Test Notification
**`POST /api/push/mobile/test`** (Auth Required)

---

## 🔍 Search

### Search Ads
**`GET /api/search`** (Public)

**Query Parameters:**
- `q` - Search query
- `categoryId` - Filter by category
- `locationId` - Filter by location
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `page` - Page number
- `limit` - Items per page

### Search Autocomplete
**`GET /api/search/autocomplete`** (Public)

**Query Parameters:**
- `q` - Search query

---

## 👥 Social Features

### Follow User
**`POST /api/follow/:userId`** (Auth Required)

### Unfollow User
**`DELETE /api/follow/:userId`** (Auth Required)

### Get Followers
**`GET /api/follow/followers/:userId`** (Public)

### Get Following
**`GET /api/follow/following/:userId`** (Public)

### Block User
**`POST /api/block/:userId`** (Auth Required)

### Unblock User
**`DELETE /api/block/:userId`** (Auth Required)

### Send Contact Request
**`POST /api/contact-request`** (Auth Required)

**Request:**
```json
{
  "sellerId": "user-id",
  "adId": "ad-id",
  "message": "I'm interested in this item"
}
```

---

## 💰 Wallet

### Get Wallet Balance
**`GET /api/wallet/balance`** (Auth Required)

### Get Transactions
**`GET /api/wallet/transactions`** (Auth Required)

---

## 🎁 Referral

### Get Referral Info
**`GET /api/referral/my-referral`** (Auth Required)

### Get Referral History
**`GET /api/referral/history`** (Auth Required)

---

## 🤖 AI Services

### Generate Ad Description
**`POST /api/ai/generate-description`** (Auth Required)

**Request:**
```json
{
  "title": "iPhone 13 Pro",
  "category": "Electronics",
  "price": 50000
}
```

---

## 🗺️ Geocoding

### Detect Location
**`POST /api/geocoding/detect-location`** (Auth Required)

**Request:**
```json
{
  "latitude": 28.6139,
  "longitude": 77.2090
}
```

### Geocode Address
**`POST /api/geocoding/geocode-address`** (Auth Required)

**Request:**
```json
{
  "address": "New Delhi, India"
}
```

---

## 🔌 Socket.IO Real-Time API

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Client → Server Events

- `join_room` - Join chat room
- `leave_room` - Leave chat room
- `send_message` - Send message
- `typing` - User is typing
- `stop_typing` - User stopped typing

### Server → Client Events

- `new_message` - New message received
- `user_typing` - User is typing
- `user_stopped_typing` - User stopped typing
- `notification` - New notification
- `user_online` - User came online
- `user_offline` - User went offline

---

## 🛡️ Admin APIs

### Admin Authentication Required

All admin endpoints require:
1. JWT authentication
2. User role = `ADMIN`

### Admin Endpoints

- `GET /api/admin/users` - Get all users
- `GET /api/admin/ads` - Get all ads
- `PUT /api/admin/ads/:id/approve` - Approve ad
- `PUT /api/admin/ads/:id/reject` - Reject ad
- `GET /api/admin/categories` - Manage categories
- `POST /api/admin/categories` - Create category
- `GET /api/admin/locations` - Manage locations
- `POST /api/admin/locations` - Create location
- `GET /api/admin/stats` - Get statistics
- `GET /api/admin/orders` - Get all orders

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
  "errors": [ ... ]
}
```

### Pagination Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

## 🔒 Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## 🚀 Quick Start Examples

### JavaScript/Fetch

```javascript
// Get all ads
const response = await fetch('http://localhost:5000/api/ads', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);
```

### Authenticated Request

```javascript
const response = await fetch('http://localhost:5000/api/user/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Create Ad

```javascript
const formData = new FormData();
formData.append('title', 'iPhone 13 Pro');
formData.append('description', 'Brand new');
formData.append('price', '50000');
formData.append('categoryId', 'category-id');
formData.append('images', file);

const response = await fetch('http://localhost:5000/api/ads', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

---

## 📚 Additional Resources

- **Socket.IO Documentation:** See `SOCKET_IO_PAYMENT_ALL_ENDPOINTS.md`
- **Mobile API Documentation:** See `MOBILE_API_DOCUMENTATION.md`
- **Payment Gateway:** See `PAYMENT_GATEWAY_API.md`

---

**Last Updated:** 2024-01-15  
**API Version:** 1.0


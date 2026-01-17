# SellIt API - Complete Documentation

**Base URL:** `http://localhost:5000/api` (or your configured backend URL)  
**WebSocket URL:** `ws://localhost:5000` (or your configured socket URL)

## Table of Contents
1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Request/Response Format](#requestresponse-format)
4. [Error Handling](#error-handling)
5. [Data Models](#data-models)
6. [User Management](#user-management)
7. [Ads](#ads)
8. [Categories](#categories)
9. [Locations](#locations)
10. [Premium Features](#premium-features)
11. [Business Packages](#business-packages)
12. [Chat](#chat)
13. [WebSocket Events](#websocket-events)
14. [Banners](#banners)
15. [Interstitial Ads](#interstitial-ads)
16. [Wallet](#wallet)
17. [Referral](#referral)
18. [Search](#search)
19. [Search Alerts](#search-alerts)
20. [Follow System](#follow-system)
21. [Contact Requests](#contact-requests)
22. [Block System](#block-system)
23. [OAuth](#oauth)
24. [Geocoding](#geocoding)
25. [AI Features](#ai-features)
26. [Push Notifications](#push-notifications)
27. [Auth Settings](#auth-settings)
28. [Admin](#admin)
29. [Admin Premium](#admin-premium)
30. [Moderation](#moderation)
31. [Health Check](#health-check)
32. [Environment Variables](#environment-variables)

---

## Introduction

SellIt is a comprehensive marketplace API built with Node.js, Express.js, and MongoDB (via Prisma ORM). It supports real-time chat, premium ad features, business packages, payment processing (Razorpay), AI-powered content moderation, and advanced search capabilities.

### Key Features
- JWT-based authentication with OTP verification
- OAuth integration (Google, Facebook)
- Real-time chat and notifications via Socket.IO
- WebRTC support for voice/video calls
- Premium ad features (TOP, FEATURED, BUMP_UP, URGENT)
- Business packages for sellers
- Wallet system with transactions
- Referral program
- AI-powered content moderation
- Meilisearch integration for fast search
- Push notifications (VAPID)
- Location-based ad filtering

---

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

### Authentication Flow

1. **Register** → User receives OTP (or auto-verified in development)
2. **Verify OTP** → User receives JWT token
3. **Login** → User receives JWT token (if password-based)
4. **Use Token** → Include in `Authorization: Bearer <token>` header

### Token Details
- **Expiration:** 7 days (configurable via `JWT_EXPIRES_IN`)
- **Format:** JWT (JSON Web Token)
- **Payload:** Contains `userId`

### Authentication Endpoints

#### Register
- **POST** `/api/auth/register`
- **Auth:** None
- **Request Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "password": "password123",
    "referralCode": "REF123"
  }
  ```
  - `name` (required): User's full name
  - `email` (optional): Valid email address
  - `phone` (optional): Phone number (at least 10 digits)
  - `password` (optional): Minimum 6 characters
  - `referralCode` (optional): Referral code from another user
  - **Note:** Either `email` or `phone` is required

- **Success Response (OTP Sent):**
  ```json
  {
    "success": true,
    "message": "User registered. Please verify OTP.",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": null,
      "isVerified": false,
      "referralCode": "JOHN123A",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

- **Success Response (Development Mode - Auto-verified):**
  ```json
  {
    "success": true,
    "message": "User registered successfully (Development mode - OTP skipped)",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "isVerified": true
    }
  }
  ```

- **Error Response (Validation):**
  ```json
  {
    "success": false,
    "message": "Validation failed",
    "errors": [
      {
        "msg": "Name is required",
        "param": "name"
      }
    ]
  }
  ```

- **Error Response (User Exists):**
  ```json
  {
    "success": false,
    "message": "User with this email or phone already exists"
  }
  ```

#### Send OTP
- **POST** `/api/auth/send-otp`
- **Auth:** None
- **Request Body:**
  ```json
  {
    "email": "john@example.com"
  }
  ```
  or
  ```json
  {
    "phone": "+919876543210"
  }
  ```

- **Success Response:**
  ```json
  {
    "success": true,
    "message": "OTP sent successfully"
  }
  ```

- **Error Response:**
  ```json
  {
    "success": false,
    "message": "User not found"
  }
  ```

#### Verify OTP
- **POST** `/api/auth/verify-otp`
- **Auth:** None
- **Request Body:**
  ```json
  {
    "email": "john@example.com",
    "code": "123456"
  }
  ```

- **Success Response:**
  ```json
  {
    "success": true,
    "message": "OTP verified successfully",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": null,
      "avatar": null,
      "role": "USER",
      "isVerified": true
    }
  }
  ```

- **Error Response:**
  ```json
  {
    "success": false,
    "message": "Invalid or expired OTP"
  }
  ```

#### Login
- **POST** `/api/auth/login`
- **Auth:** None
- **Request Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```

- **Success Response:**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": null,
      "avatar": null,
      "role": "USER",
      "isVerified": true
    }
  }
  ```

- **Error Response:**
  ```json
  {
    "success": false,
    "message": "Invalid credentials"
  }
  ```

#### Login with OTP
- **POST** `/api/auth/login-otp`
- **Auth:** None
- **Request Body:**
  ```json
  {
    "email": "john@example.com"
  }
  ```
- **Description:** Request OTP for passwordless login

#### Forgot Password
- **POST** `/api/auth/forgot-password`
- **Auth:** None
- **Request Body:**
  ```json
  {
    "email": "john@example.com"
  }
  ```
- **Description:** Request OTP for password reset

#### Verify Reset OTP
- **POST** `/api/auth/verify-reset-otp`
- **Auth:** None
- **Request Body:**
  ```json
  {
    "email": "john@example.com",
    "code": "123456"
  }
  ```
- **Description:** Verify OTP for password reset

#### Reset Password
- **POST** `/api/auth/reset-password`
- **Auth:** None
- **Request Body:**
  ```json
  {
    "email": "john@example.com",
    "code": "123456",
    "newPassword": "newpassword123"
  }
  ```
- **Description:** Reset password after OTP verification

#### Get Current User
- **GET** `/api/auth/me`
- **Auth:** Required
- **Success Response:**
  ```json
  {
    "success": true,
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": null,
      "avatar": null,
      "role": "USER",
      "isVerified": true
    }
  }
  ```

---

## Request/Response Format

### Success Response
All successful API responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

Some endpoints may return data directly without a `data` wrapper:

```json
{
  "success": true,
  "ads": [ ... ],
  "pagination": { ... }
}
```

### Error Response
All error responses follow this format:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [ /* Optional array of validation errors */ ]
}
```

### Pagination
Paginated endpoints support:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

Response includes:
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### File Uploads
Endpoints that accept file uploads use `multipart/form-data`:
- Ad images: `/api/ads` (POST/PUT)
- Avatar: `/api/user/avatar` (PUT)
- Banner images: `/api/admin/banners` (POST/PUT)
- Interstitial ad images: `/api/admin/interstitial-ads` (POST/PUT)
- Auth page images: `/api/auth-settings/upload-image` (POST)
- Offer images: `/api/admin/premium/settings` (PUT)

---

## Error Handling

### HTTP Status Codes

- **200 OK** - Request successful
- **201 Created** - Resource created successfully
- **400 Bad Request** - Validation error, invalid input, or business logic error
- **401 Unauthorized** - Authentication required or token invalid/expired
- **403 Forbidden** - Access denied (insufficient permissions or deactivated account)
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Server error

### Common Error Messages

#### Authentication Errors (401)
- `"Authentication required"` - Missing token
- `"Invalid token"` - Token format is invalid
- `"Token expired"` - Token has expired
- `"User not found"` - User associated with token doesn't exist
- `"Token has been invalidated. Please login again."` - Token was invalidated (logout all devices)
- `"Account has been permanently deleted"` - Account is permanently deleted

#### Authorization Errors (403)
- `"Access denied"` - User doesn't have required role/permissions
- `"Account is deactivated. Please reactivate to continue."` - Account is deactivated

#### Validation Errors (400)
- `"Validation failed"` - Request validation failed
  ```json
  {
    "success": false,
    "message": "Validation failed",
    "errors": [
      {
        "msg": "Name is required",
        "param": "name",
        "location": "body"
      }
    ]
  }
  ```

#### Business Logic Errors (400)
- `"User with this email or phone already exists"` - Duplicate registration
- `"Invalid or expired OTP"` - OTP verification failed
- `"Invalid credentials"` - Login failed
- `"You have used all 2 free ads and all business package ads. Please purchase a Business Package or Premium Options to post more ads."` - Ad limit reached
- `"At least one image is required"` - Missing required images

#### Not Found Errors (404)
- `"Ad not found"` - Ad doesn't exist
- `"User not found"` - User doesn't exist
- `"Category not found"` - Category doesn't exist

---

## Data Models

### User
```typescript
{
  id: string;                    // MongoDB ObjectId
  email?: string;                 // Optional, unique
  phone?: string;                 // Optional, unique
  password?: string;               // Hashed, optional (OAuth users)
  name: string;                   // Required
  avatar?: string;                // Image URL
  bio?: string;                   // User bio
  tags: string[];                 // User tags/interests
  showPhone: boolean;             // Default: true
  isVerified: boolean;            // Default: false
  role: "USER" | "ADMIN";         // Default: "USER"
  freeAdsUsed: number;            // Default: 0
  referralCode?: string;          // Unique referral code
  referredBy?: string;            // User ID who referred
  isDeactivated: boolean;          // Default: false
  deactivatedAt?: Date;
  tokenInvalidatedAt?: Date;      // For logout all devices
  locationId?: string;            // Location reference
  provider?: string;               // OAuth provider
  providerId?: string;            // OAuth provider user ID
  createdAt: Date;
  updatedAt: Date;
}
```

### Ad
```typescript
{
  id: string;                     // MongoDB ObjectId
  title: string;                  // Required
  description: string;            // Required
  price: number;                  // Required
  originalPrice?: number;
  discount?: number;
  condition?: "NEW" | "USED" | "LIKE_NEW" | "REFURBISHED";
  images: string[];               // Array of image URLs
  status: "PENDING" | "APPROVED" | "REJECTED" | "SOLD" | "EXPIRED";
  isPremium: boolean;             // Default: false
  premiumType?: "TOP" | "FEATURED" | "BUMP_UP";
  premiumExpiresAt?: Date;
  views: number;                  // Default: 0
  featuredAt?: Date;
  bumpedAt?: Date;
  expiresAt?: Date;
  isUrgent: boolean;              // Default: false
  attributes?: object;            // JSON object for product specs
  state?: string;
  city?: string;
  neighbourhood?: string;
  exactLocation?: string;
  moderationStatus?: string;       // "pending" | "approved" | "rejected"
  moderationFlags?: object;       // JSON object
  rejectionReason?: string;
  autoRejected: boolean;           // Default: false
  userId: string;                 // User reference
  categoryId: string;              // Category reference
  subcategoryId?: string;         // Subcategory reference
  locationId?: string;            // Location reference
  createdAt: Date;
  updatedAt: Date;
}
```

### Category
```typescript
{
  id: string;
  name: string;
  slug: string;                   // Unique
  icon?: string;
  image?: string;
  description?: string;
  order: number;                  // Default: 0
  isActive: boolean;               // Default: true
  adPostingPrice?: number;        // Price to post ad in this category
  createdAt: Date;
  updatedAt: Date;
}
```

### Location
```typescript
{
  id: string;
  name: string;
  slug: string;                   // Unique
  state?: string;
  city?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  neighbourhood?: string;
  isActive: boolean;               // Default: true
  createdAt: Date;
  updatedAt: Date;
}
```

### ChatRoom
```typescript
{
  id: string;
  user1Id: string;                // First user
  user2Id: string;                // Second user
  adId: string;                   // Ad reference
  createdAt: Date;
  updatedAt: Date;
}
```

### ChatMessage
```typescript
{
  id: string;
  content: string;
  type: "TEXT" | "IMAGE" | "SYSTEM";
  imageUrl?: string;
  isRead: boolean;                 // Default: false
  senderId: string;
  receiverId: string;
  roomId: string;
  createdAt: Date;
}
```

### PremiumOrder
```typescript
{
  id: string;
  type: "TOP" | "FEATURED" | "BUMP_UP";
  amount: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: string;                 // "pending" | "completed" | "failed"
  expiresAt?: Date;
  userId: string;
  adId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### BusinessPackage
```typescript
{
  id: string;
  userId: string;
  packageType: "MAX_VISIBILITY" | "SELLER_PLUS" | "SELLER_PRIME";
  amount: number;
  duration: number;               // Days, default: 30
  maxAds: number;                 // Default: 0
  premiumSlotsTotal: number;      // Default: 0
  premiumSlotsUsed: number;       // Default: 0
  totalAdsAllowed: number;        // Default: 0
  adsUsed: number;                // Default: 0
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: string;                 // "pending" | "active" | "expired"
  startDate?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Wallet
```typescript
{
  id: string;
  balance: number;                // Default: 0
  userId: string;                 // Unique
  createdAt: Date;
  updatedAt: Date;
}
```

### WalletTransaction
```typescript
{
  id: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
  description?: string;
  referenceId?: string;
  metadata?: string;              // JSON string
  walletId: string;
  createdAt: Date;
}
```

### Notification
```typescript
{
  id: string;
  title: string;
  message: string;
  type: string;                   // e.g., "new_message", "ad_approved"
  isRead: boolean;                // Default: false
  link?: string;
  userId: string;
  createdAt: Date;
}
```

### Referral
```typescript
{
  id: string;
  referralCode: string;
  referredUserId: string;          // Unique
  rewardAmount: number;            // Default: 0
  status: string;                 // "pending" | "completed"
  referrerId: string;
  createdAt: Date;
  completedAt?: Date;
}
```

### Enums

**UserRole:**
- `USER`
- `ADMIN`

**AdStatus:**
- `PENDING`
- `APPROVED`
- `REJECTED`
- `SOLD`
- `EXPIRED`

**PremiumType:**
- `TOP`
- `FEATURED`
- `BUMP_UP`

**BusinessPackageType:**
- `MAX_VISIBILITY`
- `SELLER_PLUS`
- `SELLER_PRIME`

**ChatMessageType:**
- `TEXT`
- `IMAGE`
- `SYSTEM`

**WalletTransactionType:**
- `CREDIT`
- `DEBIT`

**WalletTransactionStatus:**
- `PENDING`
- `COMPLETED`
- `FAILED`
- `CANCELLED`

**ContactRequestStatus:**
- `PENDING`
- `APPROVED`
- `REJECTED`

---

## User Management

### Get Public Profile
- **GET** `/api/user/public/:userId`
- **Auth:** None
- **Description:** Get public user profile information

### Get Profile
- **GET** `/api/user/profile`
- **Auth:** Required
- **Description:** Get authenticated user's profile

### Update Profile
- **PUT** `/api/user/profile`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "bio": "I love selling items!",
    "showPhone": true,
    "tags": ["electronics", "furniture"]
  }
  ```
- **Description:** Update user profile

### Update Avatar
- **PUT** `/api/user/avatar`
- **Auth:** Required
- **Body:** FormData with `image` file
- **Description:** Update user avatar

### Change Password
- **PUT** `/api/user/password`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "currentPassword": "oldpassword123",
    "newPassword": "newpassword123"
  }
  ```
- **Description:** Change user password

### Get User's Ads
- **GET** `/api/user/ads`
- **Auth:** Required
- **Query Parameters:**
  - `page` (optional): Page number
  - `limit` (optional): Items per page
  - `status` (optional): Filter by status
- **Description:** Get authenticated user's ads

### Get Favorites
- **GET** `/api/user/favorites`
- **Auth:** Required
- **Query Parameters:**
  - `page` (optional): Page number
  - `limit` (optional): Items per page
- **Description:** Get user's favorite ads

### Get Notifications
- **GET** `/api/user/notifications`
- **Auth:** Required
- **Query Parameters:**
  - `page` (optional): Page number
  - `limit` (optional): Items per page
  - `unreadOnly` (optional): Filter unread only
- **Description:** Get user notifications

### Mark Notification as Read
- **PUT** `/api/user/notifications/:id/read`
- **Auth:** Required
- **Description:** Mark a notification as read

### Mark All Notifications as Read
- **PUT** `/api/user/notifications/read-all`
- **Auth:** Required
- **Description:** Mark all notifications as read

### Get Orders
- **GET** `/api/user/orders`
- **Auth:** Required
- **Query Parameters:**
  - `page` (optional): Page number
  - `limit` (optional): Items per page
  - `type` (optional): `'premium'` | `'ad-posting'`
- **Description:** Get user's orders (premium and ad posting)

### Generate Invoice
- **GET** `/api/user/orders/:orderId/invoice`
- **Auth:** Required
- **Query Parameters:**
  - `type` (optional): `'premium'` | `'ad-posting'`
- **Description:** Generate PDF invoice for an order
- **Response:** PDF file

### Get Free Ads Status
- **GET** `/api/user/free-ads-status`
- **Auth:** Required
- **Description:** Get free ads usage status

### Deactivate Account
- **POST** `/api/user/deactivate`
- **Auth:** Required
- **Description:** Deactivate user account

### Reactivate Account
- **POST** `/api/user/reactivate`
- **Auth:** Required
- **Description:** Reactivate deactivated account

### Get Deactivation Status
- **GET** `/api/user/deactivation-status`
- **Auth:** Required
- **Description:** Get account deactivation status

### Logout All Devices
- **POST** `/api/user/logout-all-devices`
- **Auth:** Required
- **Description:** Invalidate all user tokens (logs out from all devices)

---

## Ads

### Get All Ads
- **GET** `/api/ads`
- **Auth:** None
- **Query Parameters:**
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 20, max: 100)
  - `category` (optional): Category slug
  - `subcategory` (optional): Subcategory slug
  - `location` (optional): Location slug
  - `minPrice` (optional): Minimum price
  - `maxPrice` (optional): Maximum price
  - `search` (optional): Search keywords
  - `condition` (optional): `'NEW'` | `'USED'` | `'LIKE_NEW'` | `'REFURBISHED'`
  - `sort` (optional): `'newest'` | `'oldest'` | `'price_low'` | `'price_high'` | `'featured'` | `'bumped'` (default: `'newest'`)
  - `latitude` (optional): Latitude for distance calculation
  - `longitude` (optional): Longitude for distance calculation
  - `radius` (optional): Radius in kilometers (default: 50)
  - `userId` (optional): Filter by user ID
- **Description:** Get ads with filters, search, sorting, and location-based filtering. Premium ads are prioritized in results.
- **Example Request:**
  ```
  GET /api/ads?page=1&limit=10&category=electronics&search=phone&minPrice=1000&latitude=12.9716&longitude=77.5946&radius=50
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "ads": [
      {
        "id": "507f1f77bcf86cd799439011",
        "title": "iPhone 13 Pro Max",
        "description": "Mint condition, 256GB",
        "price": 75000,
        "originalPrice": 90000,
        "discount": 15000,
        "condition": "LIKE_NEW",
        "images": ["https://example.com/image1.jpg"],
        "status": "APPROVED",
        "isPremium": true,
        "premiumType": "FEATURED",
        "isUrgent": false,
        "views": 150,
        "expiresAt": "2024-12-31T23:59:59.000Z",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "category": {
          "id": "507f1f77bcf86cd799439012",
          "name": "Electronics",
          "slug": "electronics"
        },
        "subcategory": {
          "id": "507f1f77bcf86cd799439013",
          "name": "Mobile Phones",
          "slug": "mobile-phones"
        },
        "location": {
          "id": "507f1f77bcf86cd799439014",
          "name": "Bangalore",
          "slug": "bangalore",
          "latitude": 12.9716,
          "longitude": 77.5946
        },
        "user": {
          "id": "507f1f77bcf86cd799439015",
          "name": "John Doe",
          "avatar": null,
          "phone": "+919876543210",
          "showPhone": true,
          "isVerified": true
        },
        "distance": 10.5,
        "_count": {
          "favorites": 5
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10
    }
  }
  ```

### Get Single Ad
- **GET** `/api/ads/:id`
- **Auth:** None
- **Description:** Get single ad details (increments view count)
- **Success Response:**
  ```json
  {
    "success": true,
    "ad": {
      "id": "507f1f77bcf86cd799439011",
      "title": "iPhone 13 Pro Max",
      "description": "Mint condition, 256GB storage...",
      "price": 75000,
      "images": ["url1", "url2"],
      "status": "APPROVED",
      "isPremium": true,
      "premiumType": "FEATURED",
      "views": 151,
      "user": { ... },
      "category": { ... },
      "location": { ... }
    }
  }
  ```

### Create Ad
- **POST** `/api/ads`
- **Auth:** Required
- **Body:** FormData with the following fields:
  - `title` (required): Ad title
  - `description` (required): Ad description
  - `price` (required): Price (number)
  - `categoryId` (required): Category ID
  - `subcategoryId` (optional): Subcategory ID
  - `locationId` (optional): Location ID
  - `images[]` (required): Array of image files (at least 1)
  - `condition` (optional): `'NEW'` | `'USED'` | `'LIKE_NEW'` | `'REFURBISHED'`
  - `premiumType` (optional): `'TOP'` | `'FEATURED'` | `'BUMP_UP'`
  - `isUrgent` (optional): `'true'` | `'false'`
  - `paymentOrderId` (optional): Razorpay order ID if premium features purchased
  - `attributes` (optional): JSON string for product specifications
- **Description:** Create a new ad. Requires images. Ad status is initially `PENDING` for moderation. Handles free ad limits, business package ad slots, and premium feature payments.
- **Success Response:**
  ```json
  {
    "success": true,
    "ad": {
      "id": "507f1f77bcf86cd799439011",
      "title": "My New Phone",
      "status": "PENDING",
      "isPremium": true,
      "premiumType": "FEATURED",
      "images": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error Response (No Images):**
  ```json
  {
    "success": false,
    "message": "At least one image is required"
  }
  ```
- **Error Response (Limit Reached):**
  ```json
  {
    "success": false,
    "message": "You have used all 2 free ads and all business package ads. Please purchase a Business Package or Premium Options to post more ads.",
    "requiresPayment": true,
    "freeAdsUsed": 2,
    "freeAdsLimit": 2,
    "adsRemaining": 0,
    "options": {
      "businessPackage": "Purchase a Business Package for more ads",
      "premiumOptions": "Purchase Premium Options for this ad"
    }
  }
  ```

### Update Ad
- **PUT** `/api/ads/:id`
- **Auth:** Required (owner only)
- **Body:** FormData with updatable fields
- **Description:** Update an ad. Requires re-approval if images changed.

### Delete Ad
- **DELETE** `/api/ads/:id`
- **Auth:** Required (owner only)
- **Description:** Delete an ad

### Toggle Favorite
- **POST** `/api/ads/:id/favorite`
- **Auth:** Required
- **Description:** Toggle favorite status for an ad

### Check Favorite
- **GET** `/api/ads/:id/favorite`
- **Auth:** Required
- **Description:** Check if ad is favorited by user

### Check Ad Limit
- **GET** `/api/ads/check-limit`
- **Auth:** Required
- **Description:** Check user's ad posting limit status (free ads + business packages)
- **Success Response:**
  ```json
  {
    "success": true,
    "hasLimit": false,
    "canPost": true,
    "freeAdsUsed": 1,
    "freeAdsLimit": 2,
    "freeAdsRemaining": 1,
    "activePackagesCount": 0,
    "totalAdsRemaining": 0,
    "packages": []
  }
  ```

### Get Price Suggestion
- **GET** `/api/ads/price-suggestion`
- **Auth:** None
- **Query Parameters:**
  - `categoryId` (required): Category ID
  - `subcategoryId` (optional): Subcategory ID
  - `condition` (optional): Condition filter
- **Description:** Get price suggestions based on similar ads

### Live Location Feed
- **GET** `/api/ads/live-location`
- **Auth:** None
- **Query Parameters:**
  - `latitude` (required): Latitude
  - `longitude` (required): Longitude
  - `radius` (optional): Radius in kilometers
  - `page` (optional): Page number
  - `limit` (optional): Items per page
  - `category` (optional): Category slug
  - `subcategory` (optional): Subcategory slug
  - `minPrice` (optional): Minimum price
  - `maxPrice` (optional): Maximum price
  - `search` (optional): Search keywords
  - `condition` (optional): Condition filter
- **Description:** Get ads within specified radius from coordinates

---

## Categories

### Get All Categories
- **GET** `/api/categories`
- **Auth:** None
- **Description:** Get all active categories with subcategories

### Get Single Category
- **GET** `/api/categories/:slug`
- **Auth:** None
- **Description:** Get category by slug with subcategories

### Get Subcategories
- **GET** `/api/categories/:id/subcategories`
- **Auth:** None
- **Description:** Get subcategories for a category with ad counts

---

## Locations

### Get All Locations
- **GET** `/api/locations`
- **Auth:** None
- **Query Parameters:**
  - `state` (optional): Filter by state
  - `city` (optional): Filter by city
- **Description:** Get all active locations

### Get Single Location
- **GET** `/api/locations/:slug`
- **Auth:** None
- **Description:** Get location by slug

---

## Premium Features

### Get Premium Offers
- **GET** `/api/premium/offers`
- **Auth:** None
- **Description:** Get premium pricing and offer information

### Create Premium Order
- **POST** `/api/premium/order`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "adId": "507f1f77bcf86cd799439011",
    "type": "FEATURED"
  }
  ```
  - `type`: `'TOP'` | `'FEATURED'` | `'BUMP_UP'`
- **Description:** Create Razorpay order for premium features
- **Success Response:**
  ```json
  {
    "success": true,
    "order": {
      "id": "order_xyz123",
      "amount": 29900,
      "currency": "INR",
      "key": "rzp_test_xxxxx"
    }
  }
  ```

### Verify Premium Payment
- **POST** `/api/premium/verify`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "orderId": "order_xyz123",
    "paymentId": "pay_abc456",
    "signature": "signature_hash"
  }
  ```
- **Description:** Verify payment and activate premium features

### Get Premium Orders
- **GET** `/api/premium/orders`
- **Auth:** Required
- **Query Parameters:**
  - `page` (optional): Page number
  - `limit` (optional): Items per page
- **Description:** Get user's premium orders

### Create Ad Posting Payment Order
- **POST** `/api/premium/ad-posting/order`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "adData": {
      "title": "My Ad",
      "description": "Ad description",
      "price": 1000,
      "categoryId": "...",
      "premiumType": "FEATURED",
      "isUrgent": true
    }
  }
  ```
- **Description:** Create payment order for ad posting with premium features

### Verify Ad Posting Payment
- **POST** `/api/premium/ad-posting/verify`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "orderId": "order_xyz123",
    "paymentId": "pay_abc456",
    "signature": "signature_hash"
  }
  ```
- **Description:** Verify payment for ad posting

### Test Razorpay Configuration
- **GET** `/api/premium/test-razorpay`
- **Auth:** None
- **Description:** Test Razorpay API connection (debugging)

---

## Business Packages

### Get Package Info
- **GET** `/api/business-package/info`
- **Auth:** None
- **Description:** Get all business package types and pricing

### Get Package Status
- **GET** `/api/business-package/status`
- **Auth:** Required
- **Description:** Get user's active business packages and ad limits

### Create Package Order
- **POST** `/api/business-package/order`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "packageType": "SELLER_PLUS"
  }
  ```
  - `packageType`: `'MAX_VISIBILITY'` | `'SELLER_PLUS'` | `'SELLER_PRIME'`
- **Description:** Create Razorpay order for business package

### Verify Package Payment
- **POST** `/api/business-package/verify`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "orderId": "order_xyz123",
    "paymentId": "pay_abc456",
    "signature": "signature_hash"
  }
  ```
- **Description:** Verify payment and activate business package

### Get Package Orders
- **GET** `/api/business-package/orders`
- **Auth:** Required
- **Query Parameters:**
  - `page` (optional): Page number
  - `limit` (optional): Items per page
- **Description:** Get user's business package orders

### Purchase Extra Ad Slots
- **POST** `/api/business-package/extra-slots/order`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "quantity": 5
  }
  ```
  - `quantity`: 1-50
- **Description:** Create order for extra ad slots

### Verify Extra Slots Payment
- **POST** `/api/business-package/extra-slots/verify`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "orderId": "order_xyz123",
    "paymentId": "pay_abc456",
    "signature": "signature_hash"
  }
  ```
- **Description:** Verify payment for extra ad slots

---

## Chat

### Create/Get Chat Room
- **POST** `/api/chat/room`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "adId": "507f1f77bcf86cd799439011",
    "receiverId": "507f1f77bcf86cd799439012"
  }
  ```
  or
  ```json
  {
    "userId": "507f1f77bcf86cd799439012"
  }
  ```
- **Description:** Create or get existing chat room between users

### Get Chat Rooms
- **GET** `/api/chat/rooms`
- **Auth:** Required
- **Description:** Get user's chat rooms with last message and unread count

### Get Messages
- **GET** `/api/chat/rooms/:roomId/messages`
- **Auth:** Required
- **Query Parameters:**
  - `page` (optional): Page number
  - `limit` (optional): Items per page
- **Description:** Get messages for a chat room (marks as read)

### Get Online Users
- **GET** `/api/chat/online-users`
- **Auth:** Required
- **Description:** Get list of online user IDs

---

## WebSocket Events

The API supports WebSocket connections for real-time features via Socket.IO. Connect to the WebSocket URL and authenticate using JWT token.

### Connection

**Connection URL:** `ws://localhost:5000` (or your configured socket URL)

**Authentication:**
```javascript
const socket = io('ws://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Client → Server Events

#### join_room
Join a specific chat room.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011"
}
```

#### leave_room
Leave a specific chat room.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011"
}
```

#### send_message
Send a chat message.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011",
  "content": "Hello!",
  "type": "TEXT",
  "imageUrl": "https://example.com/image.jpg"
}
```
- `type`: `"TEXT"` | `"IMAGE"` | `"SYSTEM"` (default: `"TEXT"`)
- `imageUrl`: Required if `type` is `"IMAGE"`

#### typing
Notify users in a room that the current user is typing.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011"
}
```

#### stop_typing
Notify users that the current user stopped typing.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011"
}
```

#### webrtc_initiate_call
Initiate a WebRTC call.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011",
  "receiverId": "507f1f77bcf86cd799439012",
  "isAudioOnly": false
}
```

#### webrtc_offer
Send a WebRTC SDP offer.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011",
  "offer": {
    "type": "offer",
    "sdp": "..."
  },
  "receiverId": "507f1f77bcf86cd799439012"
}
```

#### webrtc_answer
Send a WebRTC SDP answer.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011",
  "answer": {
    "type": "answer",
    "sdp": "..."
  },
  "receiverId": "507f1f77bcf86cd799439012"
}
```

#### webrtc_ice_candidate
Send an ICE candidate.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011",
  "candidate": {
    "candidate": "...",
    "sdpMLineIndex": 0,
    "sdpMid": "0"
  },
  "receiverId": "507f1f77bcf86cd799439012"
}
```

#### webrtc_reject_call
Reject an incoming WebRTC call.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011",
  "callerId": "507f1f77bcf86cd799439012"
}
```

#### webrtc_end_call
End an ongoing WebRTC call.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011",
  "receiverId": "507f1f77bcf86cd799439012"
}
```

### Server → Client Events

#### user_online
Broadcasts when a user comes online.

**Payload:**
```json
{
  "userId": "507f1f77bcf86cd799439011"
}
```

#### user_offline
Broadcasts when a user goes offline.

**Payload:**
```json
{
  "userId": "507f1f77bcf86cd799439011"
}
```

#### new_message
Emitted to a chat room when a new message is sent.

**Payload:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "content": "Hello!",
  "type": "TEXT",
  "imageUrl": null,
  "isRead": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "senderId": "507f1f77bcf86cd799439011",
  "receiverId": "507f1f77bcf86cd799439012",
  "roomId": "507f1f77bcf86cd799439013",
  "sender": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "avatar": "https://example.com/avatar.jpg"
  }
}
```

#### notification
Emitted to a user's personal room (`user:{userId}`) for various notifications.

**Payload:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "New Message",
  "message": "You have a new message from John Doe",
  "type": "new_message",
  "link": "/chat/507f1f77bcf86cd799439013",
  "isRead": false,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Notification Types:**
- `new_message` - New chat message
- `ad_approved` - Ad was approved
- `ad_rejected` - Ad was rejected
- `new_follower` - New follower
- `referral_reward` - Referral reward earned

#### user_typing
Emitted to a chat room when a user is typing.

**Payload:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "roomId": "507f1f77bcf86cd799439013"
}
```

#### user_stopped_typing
Emitted to a chat room when a user stops typing.

**Payload:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "roomId": "507f1f77bcf86cd799439013"
}
```

#### webrtc_incoming_call
Emitted to a receiver when a call is initiated.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011",
  "callerId": "507f1f77bcf86cd799439012",
  "callerName": "John Doe",
  "isAudioOnly": false
}
```

#### webrtc_offer
Forwards SDP offer to the receiver.

**Payload:**
```json
{
  "offer": {
    "type": "offer",
    "sdp": "..."
  },
  "callerId": "507f1f77bcf86cd799439012",
  "roomId": "507f1f77bcf86cd799439011"
}
```

#### webrtc_answer
Forwards SDP answer to the caller.

**Payload:**
```json
{
  "answer": {
    "type": "answer",
    "sdp": "..."
  },
  "roomId": "507f1f77bcf86cd799439011"
}
```

#### webrtc_ice_candidate
Forwards ICE candidate.

**Payload:**
```json
{
  "candidate": {
    "candidate": "...",
    "sdpMLineIndex": 0,
    "sdpMid": "0"
  },
  "roomId": "507f1f77bcf86cd799439011"
}
```

#### webrtc_call_rejected
Notifies caller that their call was rejected.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011"
}
```

#### webrtc_call_ended
Notifies participant that a call ended.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011"
}
```

#### error
Emitted to the client on socket-related errors.

**Payload:**
```json
{
  "message": "Error message"
}
```

**Common Error Messages:**
- `"Authentication error"` - Invalid or missing token
- `"User not found"` - User doesn't exist
- `"Room not found"` - Chat room doesn't exist
- `"Not authorized"` - User doesn't have access to room
- `"Failed to send message"` - Message sending failed

---

## Banners

### Get Active Banners
- **GET** `/api/banners`
- **Auth:** None
- **Query Parameters:**
  - `position` (optional): Banner position
  - `categoryId` (optional): Filter by category
  - `locationId` (optional): Filter by location
- **Description:** Get active banners by position/category/location

### Track Banner Click
- **POST** `/api/banners/:id/click`
- **Auth:** None
- **Description:** Track banner click (increments click count)

---

## Interstitial Ads

### Get Active Interstitial Ads
- **GET** `/api/interstitial-ads`
- **Auth:** None
- **Query Parameters:**
  - `position` (optional): Ad position
- **Description:** Get active interstitial ads by position

### Track Interstitial Ad View
- **POST** `/api/interstitial-ads/:id/view`
- **Auth:** None
- **Description:** Track interstitial ad view

### Track Interstitial Ad Click
- **POST** `/api/interstitial-ads/:id/click`
- **Auth:** None
- **Description:** Track interstitial ad click

---

## Wallet

### Get Wallet Balance
- **GET** `/api/wallet/balance`
- **Auth:** Required
- **Description:** Get wallet balance and recent transactions

### Get Wallet Transactions
- **GET** `/api/wallet/transactions`
- **Auth:** Required
- **Query Parameters:**
  - `page` (optional): Page number
  - `limit` (optional): Items per page
  - `type` (optional): `'CREDIT'` | `'DEBIT'`
- **Description:** Get wallet transaction history

---

## Referral

### Get My Referral
- **GET** `/api/referral/my-referral`
- **Auth:** Required
- **Description:** Get user's referral code, link, and statistics

### Get Referral History
- **GET** `/api/referral/history`
- **Auth:** Required
- **Query Parameters:**
  - `page` (optional): Page number
  - `limit` (optional): Items per page
- **Description:** Get referral history and earnings

---

## Search

### Search Ads
- **GET** `/api/search`
- **Auth:** None
- **Query Parameters:**
  - `q` (optional): Search query
  - `page` (optional): Page number
  - `limit` (optional): Items per page
  - `category` (optional): Category filter
  - `subcategory` (optional): Subcategory filter
  - `location` (optional): Location filter
  - `minPrice` (optional): Minimum price
  - `maxPrice` (optional): Maximum price
  - `condition` (optional): Condition filter
  - `sort` (optional): Sort option
- **Description:** Search ads using Meilisearch with filters

### Autocomplete
- **GET** `/api/search/autocomplete`
- **Auth:** None
- **Query Parameters:**
  - `q` (optional): Search query
  - `limit` (optional): Number of suggestions
- **Description:** Get search autocomplete suggestions

---

## Search Alerts

All search alert endpoints require **Admin** authentication.

### Get Settings
- **GET** `/api/search-alerts/settings`
- **Auth:** Admin
- **Description:** Get search alert configuration

### Update Settings
- **PUT** `/api/search-alerts/settings`
- **Auth:** Admin
- **Request Body:**
  ```json
  {
    "enabled": true,
    "maxEmailsPerUser": 5,
    "checkIntervalHours": 24,
    "emailSubject": "New products matching your search!",
    "emailBody": "<p>Hi there!</p><p>We found some products...</p>"
  }
  ```
- **Description:** Update search alert settings

### Get Statistics
- **GET** `/api/search-alerts/statistics`
- **Auth:** Admin
- **Description:** Get search alert statistics

### Get Queries
- **GET** `/api/search-alerts/queries`
- **Auth:** Admin
- **Query Parameters:**
  - `page` (optional): Page number
  - `limit` (optional): Items per page
  - `processed` (optional): Filter processed queries
- **Description:** Get search queries

### Cleanup Queries
- **DELETE** `/api/search-alerts/queries/cleanup`
- **Auth:** Admin
- **Query Parameters:**
  - `days` (optional): Days to keep (default: 30)
- **Description:** Delete old processed queries

### Test Email
- **POST** `/api/search-alerts/test-email`
- **Auth:** Admin
- **Request Body:**
  ```json
  {
    "email": "test@example.com",
    "testQuery": "laptop"
  }
  ```
- **Description:** Send test search alert email

---

## Follow System

### Follow User
- **POST** `/api/follow/:userId`
- **Auth:** Required
- **Description:** Follow a user

### Unfollow User
- **DELETE** `/api/follow/:userId`
- **Auth:** Required
- **Description:** Unfollow a user

### Check Following Status
- **GET** `/api/follow/check/:userId`
- **Auth:** Required
- **Description:** Check if following a user

### Get Followers
- **GET** `/api/follow/followers/:userId`
- **Auth:** None
- **Query Parameters:**
  - `page` (optional): Page number
  - `limit` (optional): Items per page
- **Description:** Get user's followers

### Get Following
- **GET** `/api/follow/following/:userId`
- **Auth:** None
- **Query Parameters:**
  - `page` (optional): Page number
  - `limit` (optional): Items per page
- **Description:** Get users that a user is following

### Get Follow Stats
- **GET** `/api/follow/stats/:userId`
- **Auth:** None
- **Description:** Get follower and following counts

---

## Contact Requests

### Send Contact Request
- **POST** `/api/contact-request`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "sellerId": "507f1f77bcf86cd799439011",
    "adId": "507f1f77bcf86cd799439012",
    "message": "I'm interested in this item"
  }
  ```
- **Description:** Send contact request to a seller

### Check Contact Request Status
- **GET** `/api/contact-request/check/:userId`
- **Auth:** Required
- **Description:** Check contact request status with a user

### Get Pending Requests
- **GET** `/api/contact-request/pending`
- **Auth:** Required
- **Description:** Get pending contact requests (for sellers)

### Approve Contact Request
- **POST** `/api/contact-request/:requestId/approve`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "consentGiven": true
  }
  ```
- **Description:** Approve contact request and share contact info

### Reject Contact Request
- **POST** `/api/contact-request/:requestId/reject`
- **Auth:** Required
- **Description:** Reject contact request

---

## Block System

### Block User
- **POST** `/api/block/:userId`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "reason": "Spam"
  }
  ```
- **Description:** Block a user

### Unblock User
- **DELETE** `/api/block/:userId`
- **Auth:** Required
- **Description:** Unblock a user

### Check Block Status
- **GET** `/api/block/check/:userId`
- **Auth:** Required
- **Description:** Check if user is blocked

### Get Blocked Users
- **GET** `/api/block/list`
- **Auth:** Required
- **Description:** Get list of blocked users

---

## OAuth

### Google OAuth
- **GET** `/api/auth/google`
- **Auth:** None
- **Description:** Initiate Google OAuth login
- **Response:** Redirects to Google OAuth consent screen

### Google OAuth Callback
- **GET** `/api/auth/google/callback`
- **Auth:** None (handled by Passport)
- **Description:** Google OAuth callback (redirects to frontend with token)
- **Response:** Redirects to `{FRONTEND_URL}/auth/callback?token=...`

### Facebook OAuth
- **GET** `/api/auth/facebook`
- **Auth:** None
- **Description:** Initiate Facebook OAuth login
- **Response:** Redirects to Facebook OAuth consent screen

### Facebook OAuth Callback
- **GET** `/api/auth/facebook/callback`
- **Auth:** None (handled by Passport)
- **Description:** Facebook OAuth callback (redirects to frontend with token)
- **Response:** Redirects to `{FRONTEND_URL}/auth/callback?token=...`

---

## Geocoding

### Detect Location
- **POST** `/api/geocoding/detect-location`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "latitude": 12.9716,
    "longitude": 77.5946
  }
  ```
- **Description:** Reverse geocode coordinates and find nearest location
- **Success Response:**
  ```json
  {
    "success": true,
    "location": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Bangalore",
      "slug": "bangalore",
      "state": "Karnataka",
      "city": "Bangalore"
    },
    "address": "Full formatted address"
  }
  ```

### Geocode Address
- **POST** `/api/geocoding/geocode-address`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "address": "123 Main Street, Bangalore, Karnataka"
  }
  ```
- **Description:** Geocode address string to coordinates
- **Success Response:**
  ```json
  {
    "success": true,
    "latitude": 12.9716,
    "longitude": 77.5946,
    "formattedAddress": "123 Main Street, Bangalore, Karnataka, India"
  }
  ```

---

## AI Features

### Generate Product Description
- **POST** `/api/ai/generate-description`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "title": "iPhone 13 Pro Max",
    "price": 75000,
    "condition": "LIKE_NEW",
    "category": "Electronics",
    "subcategory": "Mobile Phones",
    "location": "Bangalore"
  }
  ```
- **Description:** Generate product description using OpenAI
- **Success Response:**
  ```json
  {
    "success": true,
    "description": "Generated product description..."
  }
  ```

---

## Push Notifications

### Get VAPID Key
- **GET** `/api/push/vapid-key`
- **Auth:** None
- **Description:** Get VAPID public key for push notifications
- **Success Response:**
  ```json
  {
    "success": true,
    "publicKey": "BEl62iUYgUivxIkv69yViEuiBIa40HI..."
  }
  ```

### Subscribe
- **POST** `/api/push/subscribe`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "subscription": {
      "endpoint": "https://fcm.googleapis.com/...",
      "keys": {
        "p256dh": "...",
        "auth": "..."
      }
    },
    "userAgent": "Mozilla/5.0..."
  }
  ```
- **Description:** Subscribe to push notifications

### Unsubscribe
- **POST** `/api/push/unsubscribe`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "endpoint": "https://fcm.googleapis.com/..."
  }
  ```
- **Description:** Unsubscribe from push notifications

---

## Auth Settings

### Get Auth Page Settings
- **GET** `/api/auth-settings/:page`
- **Auth:** None
- **Path Parameters:**
  - `page`: `'login'` | `'signup'`
- **Description:** Get authentication page settings

### Update Auth Page Settings
- **PUT** `/api/auth-settings/:page`
- **Auth:** Admin
- **Request Body:**
  ```json
  {
    "title": "Welcome Back",
    "subtitle": "Login to continue",
    "tagline": "Buy and sell anything",
    "imageUrl": "https://example.com/image.jpg",
    "backgroundColor": "#1e293b",
    "stats": {
      "users": 10000,
      "ads": 50000
    },
    "features": [
      "Fast & Secure",
      "24/7 Support"
    ]
  }
  ```
- **Description:** Update authentication page settings

### Upload Auth Image
- **POST** `/api/auth-settings/upload-image`
- **Auth:** Admin
- **Body:** FormData with `image` file
- **Description:** Upload image for auth pages

---

## Admin

All admin endpoints require **Admin** authentication.

### Dashboard Stats
- **GET** `/api/admin/dashboard`
- **Description:** Get dashboard statistics
- **Success Response:**
  ```json
  {
    "success": true,
    "stats": {
      "totalUsers": 1000,
      "totalAds": 5000,
      "pendingAds": 50,
      "revenue": 100000
    }
  }
  ```

### Recent Activity
- **GET** `/api/admin/recent-activity`
- **Query Parameters:**
  - `limit` (optional): Number of items (default: 10)
- **Description:** Get recent activity (ads and users)

### Active Users
- **GET** `/api/admin/active-users`
- **Query Parameters:**
  - `limit` (optional): Number of users
- **Description:** Get online/active users

### Get All Ads
- **GET** `/api/admin/ads`
- **Query Parameters:**
  - `page` (optional): Page number
  - `limit` (optional): Items per page
  - `status` (optional): Filter by status
  - `search` (optional): Search query
- **Description:** Get all ads with filters

### Get Flagged Ads
- **GET** `/api/admin/ads/flagged`
- **Query Parameters:**
  - `page` (optional): Page number
  - `limit` (optional): Items per page
- **Description:** Get flagged/auto-rejected ads

### Approve/Reject Ad
- **PUT** `/api/admin/ads/:id/status`
- **Request Body:**
  ```json
  {
    "status": "APPROVED",
    "reason": "Ad looks good"
  }
  ```
  - `status`: `'APPROVED'` | `'REJECTED'`
  - `reason` (optional): Reason for rejection
- **Description:** Approve or reject an ad

### Get All Users
- **GET** `/api/admin/users`
- **Query Parameters:**
  - `page` (optional): Page number
  - `limit` (optional): Items per page
  - `search` (optional): Search query
- **Description:** Get all users with filters

### Update User Role
- **PUT** `/api/admin/users/:id/role`
- **Request Body:**
  ```json
  {
    "role": "ADMIN"
  }
  ```
  - `role`: `'USER'` | `'ADMIN'`
- **Description:** Update user role

### Block User
- **POST** `/api/admin/users/:id/block`
- **Description:** Block a user (admin action)

### Unblock User
- **POST** `/api/admin/users/:id/unblock`
- **Description:** Unblock a user

### Banner Management
- **GET** `/api/admin/banners` - Get all banners
- **POST** `/api/admin/banners` - Create banner (FormData with image)
- **PUT** `/api/admin/banners/:id` - Update banner
- **DELETE** `/api/admin/banners/:id` - Delete banner

### Interstitial Ad Management
- **GET** `/api/admin/interstitial-ads` - Get all interstitial ads
- **POST** `/api/admin/interstitial-ads` - Create interstitial ad (FormData with image)
- **PUT** `/api/admin/interstitial-ads/:id` - Update interstitial ad
- **DELETE** `/api/admin/interstitial-ads/:id` - Delete interstitial ad

### Category Management
- **GET** `/api/admin/categories` - Get all categories (includes inactive)
- **POST** `/api/admin/categories` - Create category
- **PUT** `/api/admin/categories/:id` - Update category
- **PUT** `/api/admin/categories/pricing/bulk` - Bulk update category pricing
- **DELETE** `/api/admin/categories/:id` - Delete category

### Subcategory Management
- **GET** `/api/admin/subcategories` - Get all subcategories
- **POST** `/api/admin/subcategories` - Create subcategory
- **PUT** `/api/admin/subcategories/:id` - Update subcategory
- **DELETE** `/api/admin/subcategories/:id` - Delete subcategory

### Location Management
- **GET** `/api/admin/locations` - Get all locations
- **GET** `/api/admin/locations/:id` - Get single location
- **POST** `/api/admin/locations` - Create location
- **PUT** `/api/admin/locations/:id` - Update location
- **POST** `/api/admin/locations/:id/update-from-geocoding` - Update location with geocoding data
- **POST** `/api/admin/locations/bulk-update-geocoding` - Bulk update locations with geocoding
- **DELETE** `/api/admin/locations/:id` - Delete location

### Get All Orders
- **GET** `/api/admin/orders`
- **Query Parameters:**
  - `page` (optional): Page number
  - `limit` (optional): Items per page
  - `type` (optional): `'premium'` | `'ad-posting'` | `'business-package'`
  - `status` (optional): Order status
  - `userId` (optional): Filter by user ID
- **Description:** Get all orders (premium and ad posting)

---

## Admin Premium

All admin premium endpoints require **Admin** authentication.

### Get Premium Settings
- **GET** `/api/admin/premium/settings`
- **Description:** Get premium pricing and duration settings

### Update Premium Settings
- **PUT** `/api/admin/premium/settings`
- **Body:** FormData with `prices`, `offerPrices`, `durations`, `offerImage?`
- **Description:** Update premium settings (supports offer prices and image)

### Get Premium Ads
- **GET** `/api/admin/premium/premium-ads`
- **Query Parameters:**
  - `type` (optional): `'TOP'` | `'FEATURED'` | `'BUMP_UP'`
  - `page` (optional): Page number
  - `limit` (optional): Items per page
- **Description:** Get premium ads by type

### Make Ad TOP Premium
- **POST** `/api/admin/premium/ads/:id/make-top`
- **Request Body:**
  ```json
  {
    "days": 7
  }
  ```
- **Description:** Manually make ad TOP premium

### Make Ad FEATURED
- **POST** `/api/admin/premium/ads/:id/make-featured`
- **Request Body:**
  ```json
  {
    "days": 7
  }
  ```
- **Description:** Manually make ad FEATURED

### Bump Ad
- **POST** `/api/admin/premium/ads/:id/bump`
- **Description:** Bump/refresh an ad

### Make Ad URGENT
- **POST** `/api/admin/premium/ads/:id/make-urgent`
- **Request Body:**
  ```json
  {
    "days": 7
  }
  ```
- **Description:** Mark ad as urgent

### Remove Premium Status
- **POST** `/api/admin/premium/ads/:id/remove-premium`
- **Description:** Remove premium status from ad

### Update Premium Expiry
- **PUT** `/api/admin/premium/ads/:id/premium-expiry`
- **Request Body:**
  ```json
  {
    "expiresAt": "2024-12-31T23:59:59.000Z"
  }
  ```
- **Description:** Update premium expiry date

### Business Package Settings
- **GET** `/api/admin/premium/business-packages` - Get business package settings
- **PUT** `/api/admin/premium/business-packages` - Update business package settings
- **GET** `/api/admin/premium/business-packages/orders` - Get business package orders

---

## Moderation

All moderation endpoints require **Admin** authentication.

### Get Statistics
- **GET** `/api/moderation/statistics`
- **Description:** Get moderation statistics

### Get Flagged Ads
- **GET** `/api/moderation/flagged-ads`
- **Query Parameters:**
  - `page` (optional): Page number
  - `limit` (optional): Items per page
  - `type` (optional): `'all'` | `'auto-rejected'` | `'flagged'`
- **Description:** Get flagged/rejected ads

### Re-moderate Ad
- **POST** `/api/moderation/ads/:id/remoderate`
- **Description:** Manually re-run moderation on an ad

### Get Settings
- **GET** `/api/moderation/settings`
- **Description:** Get moderation configuration

---

## Health Check

### Health Check
- **GET** `/health`
- **Auth:** None
- **Description:** Server health check endpoint
- **Success Response:**
  ```json
  {
    "status": "ok",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

---

## Environment Variables

The following environment variables are used by the application. Set them in your `.env` file or environment configuration.

### Server Configuration
```env
NODE_ENV=development                    # 'development' | 'production'
PORT=5000                                # Server port
FRONTEND_URL=http://localhost:3000      # Frontend URL for CORS and redirects
BACKEND_URL=http://localhost:5000       # Backend URL
```

### Database
```env
DATABASE_URL=mongodb+srv://...           # MongoDB connection string
MONGO_URI=mongodb+srv://...              # Alternative MongoDB URI (same as DATABASE_URL)
```

### JWT Authentication
```env
JWT_SECRET=your-secret-key-change-in-production  # Secret key for JWT tokens
JWT_EXPIRES_IN=7d                                # Token expiration (e.g., '7d', '24h')
```

### Email (SMTP) - For OTP
```env
SMTP_HOST=smtp.gmail.com                 # SMTP server host
SMTP_PORT=587                            # SMTP port (587 for TLS, 465 for SSL)
SMTP_SECURE=false                        # Use SSL/TLS (true for port 465)
SMTP_USER=your-email@gmail.com           # SMTP username
SMTP_PASS=your-app-password              # SMTP password/app password
SMTP_FROM=noreply@sellit.com            # From email address
```

### SMS (Twilio) - For OTP
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxx  # Twilio Account SID
TWILIO_AUTH_TOKEN=your_twilio_auth_token # Twilio Auth Token
TWILIO_PHONE_NUMBER=+15017122661         # Twilio phone number
```

### OTP Configuration
```env
OTP_EXPIRY_MINUTES=10                    # OTP expiration time in minutes
OTP_LENGTH=6                             # OTP code length
```

### File Storage - AWS S3
```env
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxx       # AWS Access Key ID
AWS_SECRET_ACCESS_KEY=your_aws_secret_key # AWS Secret Access Key
AWS_REGION=ap-south-1                    # AWS region
S3_BUCKET_NAME=your-s3-bucket-name       # S3 bucket name
```

### File Storage - Cloudinary (Alternative)
```env
USE_CLOUDINARY=false                     # Set to 'true' to use Cloudinary instead of S3
CLOUDINARY_CLOUD_NAME=your_cloud_name    # Cloudinary cloud name
CLOUDINARY_API_KEY=your_api_key          # Cloudinary API key
CLOUDINARY_API_SECRET=your_api_secret    # Cloudinary API secret
```

### Payment Gateway - Razorpay
```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx  # Razorpay Key ID
RAZORPAY_KEY_SECRET=your_razorpay_secret  # Razorpay Key Secret
```

### AI Services - OpenAI
```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxx    # OpenAI API key for AI features
```

### OAuth - Google
```env
GOOGLE_CLIENT_ID=your_google_client_id           # Google OAuth Client ID
GOOGLE_CLIENT_SECRET=your_google_client_secret    # Google OAuth Client Secret
GOOGLE_API_KEY=your_google_api_key               # Optional: for other Google services
GOOGLE_MAPS_API_KEY=your_google_maps_api_key      # Google Maps API key for Geocoding
```

### OAuth - Facebook
```env
FACEBOOK_APP_ID=your_facebook_app_id             # Facebook App ID
FACEBOOK_APP_SECRET=your_facebook_app_secret      # Facebook App Secret
```

### Session (for OAuth)
```env
SESSION_SECRET=your_session_secret                # Session secret (can use JWT_SECRET)
```

### Required Variables
The following environment variables are **required**:
- `DATABASE_URL` or `MONGO_URI`
- `JWT_SECRET`

All other variables are optional but may be required for specific features:
- **OTP**: SMTP or Twilio configuration
- **File Uploads**: AWS S3 or Cloudinary configuration
- **Payments**: Razorpay configuration
- **OAuth**: Google/Facebook OAuth configuration
- **Geocoding**: Google Maps API key
- **AI Features**: OpenAI API key

---

## Notes

### Development Mode
In development mode, if OTP services (SMTP/Twilio) are not configured, the registration endpoint will automatically verify users and return a JWT token without requiring OTP verification.

### Premium Ad Priority
Premium ads are always prioritized in search results and listings, regardless of the selected sort option. The priority order is:
1. Premium ads (isPremium: true)
2. Premium type (TOP > FEATURED > BUMP_UP)
3. Selected sort criteria (newest, price, etc.)

### Ad Limits
- **Free Ads:** Users can post 2 free ads
- **Business Packages:** Provide additional ad slots based on package type
- **Premium Options:** Can be purchased per ad for enhanced visibility

### Content Moderation
All new ads are initially set to `PENDING` status and go through AI-powered content moderation. Ads are automatically approved or rejected based on moderation results. Admins can manually review and override moderation decisions.

### WebSocket Authentication
WebSocket connections require JWT authentication. Include the token in the connection handshake:
```javascript
const socket = io('ws://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Rate Limiting
Some endpoints may have rate limiting applied. Check response headers for rate limit information.

### Caching
Certain endpoints (like ad listings) use caching to improve performance. Cache duration is typically 60 seconds.

---

**Last Updated:** 2024-01-01  
**Total Endpoints:** 150+  
**API Version:** 1.0.0

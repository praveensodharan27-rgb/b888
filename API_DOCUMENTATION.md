# SellIt API - Complete Documentation

Base URL: `http://localhost:5000/api` (or your configured backend URL)

## Table of Contents
1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Ads](#ads)
4. [Categories](#categories)
5. [Locations](#locations)
6. [Premium Features](#premium-features)
7. [Business Packages](#business-packages)
8. [Chat](#chat)
9. [Banners](#banners)
10. [Interstitial Ads](#interstitial-ads)
11. [Wallet](#wallet)
12. [Referral](#referral)
13. [Search](#search)
14. [Search Alerts](#search-alerts)
15. [Follow System](#follow-system)
16. [Contact Requests](#contact-requests)
17. [Block System](#block-system)
18. [OAuth](#oauth)
19. [Geocoding](#geocoding)
20. [AI Features](#ai-features)
21. [Push Notifications](#push-notifications)
22. [Auth Settings](#auth-settings)
23. [Admin](#admin)
24. [Admin Premium](#admin-premium)
25. [Moderation](#moderation)
26. [Health Check](#health-check)

---

## Authentication

### Register
- **POST** `/api/auth/register`
- **Auth:** None
- **Body:** `{ name, email?, phone?, password?, referralCode? }`
- **Description:** Register a new user with email/phone and optional password

### Login
- **POST** `/api/auth/login`
- **Auth:** None
- **Body:** `{ email?, phone?, password }`
- **Description:** Login with email/phone and password

### Login with OTP
- **POST** `/api/auth/login-otp`
- **Auth:** None
- **Body:** `{ email?, phone }`
- **Description:** Request OTP for passwordless login

### Send OTP
- **POST** `/api/auth/send-otp`
- **Auth:** None
- **Body:** `{ email?, phone }`
- **Description:** Send OTP to user's email/phone

### Verify OTP
- **POST** `/api/auth/verify-otp`
- **Auth:** None
- **Body:** `{ email?, phone, code }`
- **Description:** Verify OTP code and authenticate user

### Forgot Password
- **POST** `/api/auth/forgot-password`
- **Auth:** None
- **Body:** `{ email?, phone }`
- **Description:** Request OTP for password reset

### Verify Reset OTP
- **POST** `/api/auth/verify-reset-otp`
- **Auth:** None
- **Body:** `{ email?, phone, code }`
- **Description:** Verify OTP for password reset

### Reset Password
- **POST** `/api/auth/reset-password`
- **Auth:** None
- **Body:** `{ email?, phone, code, newPassword }`
- **Description:** Reset password after OTP verification

### Get Current User
- **GET** `/api/auth/me`
- **Auth:** Required
- **Description:** Get authenticated user's information

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
- **Body:** `{ name?, email?, phone?, bio?, showPhone?, tags? }`
- **Description:** Update user profile

### Update Avatar
- **PUT** `/api/user/avatar`
- **Auth:** Required
- **Body:** FormData with image file
- **Description:** Update user avatar

### Change Password
- **PUT** `/api/user/password`
- **Auth:** Required
- **Body:** `{ currentPassword, newPassword }`
- **Description:** Change user password

### Get User's Ads
- **GET** `/api/user/ads`
- **Auth:** Required
- **Query:** `page?, limit?, status?`
- **Description:** Get authenticated user's ads

### Get Favorites
- **GET** `/api/user/favorites`
- **Auth:** Required
- **Query:** `page?, limit?`
- **Description:** Get user's favorite ads

### Get Notifications
- **GET** `/api/user/notifications`
- **Auth:** Required
- **Query:** `page?, limit?, unreadOnly?`
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
- **Query:** `page?, limit?, type?` (type: 'premium' | 'ad-posting')
- **Description:** Get user's orders (premium and ad posting)

### Generate Invoice
- **GET** `/api/user/orders/:orderId/invoice`
- **Auth:** Required
- **Query:** `type?` ('premium' | 'ad-posting')
- **Description:** Generate PDF invoice for an order

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
- **Description:** Invalidate all user tokens

---

## Ads

### Get All Ads
- **GET** `/api/ads`
- **Auth:** None
- **Query:** `page?, limit?, category?, subcategory?, location?, minPrice?, maxPrice?, search?, condition?, sort?, latitude?, longitude?, radius?, userId?`
- **Description:** Get ads with filters, search, sorting, and location-based filtering

### Get Single Ad
- **GET** `/api/ads/:id`
- **Auth:** None
- **Description:** Get single ad details (increments view count)

### Create Ad
- **POST** `/api/ads`
- **Auth:** Required
- **Body:** FormData with `title, description, price, categoryId, subcategoryId?, locationId?, images[], premiumType?, isUrgent?, paymentOrderId?, attributes?`
- **Description:** Create a new ad (requires images, supports premium features)

### Update Ad
- **PUT** `/api/ads/:id`
- **Auth:** Required (owner only)
- **Body:** FormData with updatable fields
- **Description:** Update an ad (requires re-approval if images changed)

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

### Get Price Suggestion
- **GET** `/api/ads/price-suggestion`
- **Auth:** None
- **Query:** `categoryId, subcategoryId?, condition?`
- **Description:** Get price suggestions based on similar ads

### Live Location Feed
- **GET** `/api/ads/live-location`
- **Auth:** None
- **Query:** `latitude, longitude, radius?, page?, limit?, category?, subcategory?, minPrice?, maxPrice?, search?, condition?`
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
- **Query:** `state?, city?`
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
- **Body:** `{ adId, type }` (type: 'TOP' | 'FEATURED' | 'BUMP_UP')
- **Description:** Create Razorpay order for premium features

### Verify Premium Payment
- **POST** `/api/premium/verify`
- **Auth:** Required
- **Body:** `{ orderId, paymentId, signature }`
- **Description:** Verify payment and activate premium features

### Get Premium Orders
- **GET** `/api/premium/orders`
- **Auth:** Required
- **Query:** `page?, limit?`
- **Description:** Get user's premium orders

### Create Ad Posting Payment Order
- **POST** `/api/premium/ad-posting/order`
- **Auth:** Required
- **Body:** `{ adData }` (includes premiumType, isUrgent, etc.)
- **Description:** Create payment order for ad posting with premium features

### Verify Ad Posting Payment
- **POST** `/api/premium/ad-posting/verify`
- **Auth:** Required
- **Body:** `{ orderId, paymentId, signature }`
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
- **Body:** `{ packageType }` ('MAX_VISIBILITY' | 'SELLER_PLUS' | 'SELLER_PRIME')
- **Description:** Create Razorpay order for business package

### Verify Package Payment
- **POST** `/api/business-package/verify`
- **Auth:** Required
- **Body:** `{ orderId, paymentId, signature }`
- **Description:** Verify payment and activate business package

### Get Package Orders
- **GET** `/api/business-package/orders`
- **Auth:** Required
- **Query:** `page?, limit?`
- **Description:** Get user's business package orders

### Purchase Extra Ad Slots
- **POST** `/api/business-package/extra-slots/order`
- **Auth:** Required
- **Body:** `{ quantity }` (1-50)
- **Description:** Create order for extra ad slots

### Verify Extra Slots Payment
- **POST** `/api/business-package/extra-slots/verify`
- **Auth:** Required
- **Body:** `{ orderId, paymentId, signature }`
- **Description:** Verify payment for extra ad slots

---

## Chat

### Create/Get Chat Room
- **POST** `/api/chat/room`
- **Auth:** Required
- **Body:** `{ adId?, receiverId?, userId? }`
- **Description:** Create or get existing chat room between users

### Get Chat Rooms
- **GET** `/api/chat/rooms`
- **Auth:** Required
- **Description:** Get user's chat rooms with last message and unread count

### Get Messages
- **GET** `/api/chat/rooms/:roomId/messages`
- **Auth:** Required
- **Query:** `page?, limit?`
- **Description:** Get messages for a chat room (marks as read)

### Get Online Users
- **GET** `/api/chat/online-users`
- **Auth:** Required
- **Description:** Get list of online user IDs

---

## Banners

### Get Active Banners
- **GET** `/api/banners`
- **Auth:** None
- **Query:** `position?, categoryId?, locationId?`
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
- **Query:** `position?`
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
- **Query:** `page?, limit?, type?` (type: 'CREDIT' | 'DEBIT')
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
- **Query:** `page?, limit?`
- **Description:** Get referral history and earnings

---

## Search

### Search Ads
- **GET** `/api/search`
- **Auth:** None
- **Query:** `q?, page?, limit?, category?, subcategory?, location?, minPrice?, maxPrice?, condition?, sort?`
- **Description:** Search ads using Meilisearch with filters

### Autocomplete
- **GET** `/api/search/autocomplete`
- **Auth:** None
- **Query:** `q?, limit?`
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
- **Body:** `{ enabled?, maxEmailsPerUser?, checkIntervalHours?, emailSubject?, emailBody? }`
- **Description:** Update search alert settings

### Get Statistics
- **GET** `/api/search-alerts/statistics`
- **Auth:** Admin
- **Description:** Get search alert statistics

### Get Queries
- **GET** `/api/search-alerts/queries`
- **Auth:** Admin
- **Query:** `page?, limit?, processed?`
- **Description:** Get search queries

### Cleanup Queries
- **DELETE** `/api/search-alerts/queries/cleanup`
- **Auth:** Admin
- **Query:** `days?` (default: 30)
- **Description:** Delete old processed queries

### Test Email
- **POST** `/api/search-alerts/test-email`
- **Auth:** Admin
- **Body:** `{ email, testQuery? }`
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
- **Query:** `page?, limit?`
- **Description:** Get user's followers

### Get Following
- **GET** `/api/follow/following/:userId`
- **Auth:** None
- **Query:** `page?, limit?`
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
- **Body:** `{ sellerId, adId?, message? }`
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
- **Body:** `{ consentGiven }`
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
- **Body:** `{ reason? }`
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

### Google OAuth Callback
- **GET** `/api/auth/google/callback`
- **Auth:** None (handled by Passport)
- **Description:** Google OAuth callback (redirects to frontend)

### Facebook OAuth
- **GET** `/api/auth/facebook`
- **Auth:** None
- **Description:** Initiate Facebook OAuth login

### Facebook OAuth Callback
- **GET** `/api/auth/facebook/callback`
- **Auth:** None (handled by Passport)
- **Description:** Facebook OAuth callback (redirects to frontend)

---

## Geocoding

### Detect Location
- **POST** `/api/geocoding/detect-location`
- **Auth:** Required
- **Body:** `{ latitude, longitude }`
- **Description:** Reverse geocode coordinates and find nearest location

### Geocode Address
- **POST** `/api/geocoding/geocode-address`
- **Auth:** Required
- **Body:** `{ address }`
- **Description:** Geocode address string to coordinates

---

## AI Features

### Generate Product Description
- **POST** `/api/ai/generate-description`
- **Auth:** Required
- **Body:** `{ title, price?, condition?, category?, subcategory?, location? }`
- **Description:** Generate product description using OpenAI

---

## Push Notifications

### Get VAPID Key
- **GET** `/api/push/vapid-key`
- **Auth:** None
- **Description:** Get VAPID public key for push notifications

### Subscribe
- **POST** `/api/push/subscribe`
- **Auth:** Required
- **Body:** `{ subscription, userAgent? }`
- **Description:** Subscribe to push notifications

### Unsubscribe
- **POST** `/api/push/unsubscribe`
- **Auth:** Required
- **Body:** `{ endpoint }`
- **Description:** Unsubscribe from push notifications

---

## Auth Settings

### Get Auth Page Settings
- **GET** `/api/auth-settings/:page` (page: 'login' | 'signup')
- **Auth:** None
- **Description:** Get authentication page settings

### Update Auth Page Settings
- **PUT** `/api/auth-settings/:page`
- **Auth:** Admin
- **Body:** `{ title?, subtitle?, tagline?, imageUrl?, backgroundColor?, stats?, features? }`
- **Description:** Update authentication page settings

### Upload Auth Image
- **POST** `/api/auth-settings/upload-image`
- **Auth:** Admin
- **Body:** FormData with image file
- **Description:** Upload image for auth pages

---

## Admin

All admin endpoints require **Admin** authentication.

### Dashboard Stats
- **GET** `/api/admin/dashboard`
- **Description:** Get dashboard statistics

### Recent Activity
- **GET** `/api/admin/recent-activity`
- **Query:** `limit?`
- **Description:** Get recent activity (ads and users)

### Active Users
- **GET** `/api/admin/active-users`
- **Query:** `limit?`
- **Description:** Get online/active users

### Get All Ads
- **GET** `/api/admin/ads`
- **Query:** `page?, limit?, status?, search?`
- **Description:** Get all ads with filters

### Get Flagged Ads
- **GET** `/api/admin/ads/flagged`
- **Query:** `page?, limit?`
- **Description:** Get flagged/auto-rejected ads

### Approve/Reject Ad
- **PUT** `/api/admin/ads/:id/status`
- **Body:** `{ status, reason? }` (status: 'APPROVED' | 'REJECTED')
- **Description:** Approve or reject an ad

### Get All Users
- **GET** `/api/admin/users`
- **Query:** `page?, limit?, search?`
- **Description:** Get all users with filters

### Update User Role
- **PUT** `/api/admin/users/:id/role`
- **Body:** `{ role }` ('USER' | 'ADMIN')
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
- **Query:** `page?, limit?, type?, status?, userId?`
- **Description:** Get all orders (premium and ad posting)

---

## Admin Premium

All admin premium endpoints require **Admin** authentication.

### Get Premium Settings
- **GET** `/api/admin/premium/settings`
- **Description:** Get premium pricing and duration settings

### Update Premium Settings
- **PUT** `/api/admin/premium/settings`
- **Body:** FormData with `prices, offerPrices, durations, offerImage?`
- **Description:** Update premium settings (supports offer prices and image)

### Get Premium Ads
- **GET** `/api/admin/premium/premium-ads`
- **Query:** `type?, page?, limit?`
- **Description:** Get premium ads by type

### Make Ad TOP Premium
- **POST** `/api/admin/premium/ads/:id/make-top`
- **Body:** `{ days? }`
- **Description:** Manually make ad TOP premium

### Make Ad FEATURED
- **POST** `/api/admin/premium/ads/:id/make-featured`
- **Body:** `{ days? }`
- **Description:** Manually make ad FEATURED

### Bump Ad
- **POST** `/api/admin/premium/ads/:id/bump`
- **Description:** Bump/refresh an ad

### Make Ad URGENT
- **POST** `/api/admin/premium/ads/:id/make-urgent`
- **Body:** `{ days? }`
- **Description:** Mark ad as urgent

### Remove Premium Status
- **POST** `/api/admin/premium/ads/:id/remove-premium`
- **Description:** Remove premium status from ad

### Update Premium Expiry
- **PUT** `/api/admin/premium/ads/:id/premium-expiry`
- **Body:** `{ expiresAt }`
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
- **Query:** `page?, limit?, type?` (type: 'all' | 'auto-rejected' | 'flagged')
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

---

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <token>
```

## Response Format

All endpoints return JSON responses in the following format:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error message"
}
```

## Pagination

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

## File Uploads

Endpoints that accept file uploads use `multipart/form-data`:
- Ad images: `/api/ads` (POST/PUT)
- Avatar: `/api/user/avatar` (PUT)
- Banner images: `/api/admin/banners` (POST/PUT)
- Interstitial ad images: `/api/admin/interstitial-ads` (POST/PUT)
- Auth page images: `/api/auth-settings/upload-image` (POST)
- Offer images: `/api/admin/premium/settings` (PUT)

## WebSocket Events

The API also supports WebSocket connections for real-time features:
- Chat messages
- Notifications
- Online user status
- New ad approvals

Connect to: `ws://localhost:5000` (or your configured socket URL)

---

**Last Updated:** Generated from codebase analysis
**Total Endpoints:** 150+

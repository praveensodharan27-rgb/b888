# Complete API Endpoints - A to Z
## All Website Features & Endpoints Documentation

**Base URL:** `http://localhost:5000/api`  
**Production:** `https://yourdomain.com/api`

---

## 📋 Table of Contents

- [A - Ads Management](#a---ads-management)
- [B - Business Packages](#b---business-packages)
- [C - Categories](#c---categories)
- [D - Dashboard & Admin](#d---dashboard--admin)
- [E - Email & Notifications](#e---email--notifications)
- [F - Follow & Social](#f---follow--social)
- [G - Geocoding & Location](#g---geocoding--location)
- [H - Help & Support](#h---help--support)
- [I - Interstitial Ads](#i---interstitial-ads)
- [J - JWT & Authentication](#j---jwt--authentication)
- [K - Keys & Configuration](#k---keys--configuration)
- [L - Locations](#l---locations)
- [M - Moderation](#m---moderation)
- [N - Notifications](#n---notifications)
- [O - OAuth & Social Login](#o---oauth--social-login)
- [P - Payments & Premium](#p---payments--premium)
- [Q - Queries & Search](#q---queries--search)
- [R - Referrals & Rewards](#r---referrals--rewards)
- [S - Search & Alerts](#s---search--alerts)
- [T - Test & Development](#t---test--development)
- [U - User Management](#u---user-management)
- [V - Verification](#v---verification)
- [W - Wallet & Transactions](#w---wallet--transactions)
- [X - XML & Sitemaps](#x---xml--sitemaps)
- [Y - Your Account](#y---your-account)
- [Z - Zones & Regions](#z---zones--regions)

---

## A - Ads Management

### Create Ad
- **POST** `/api/ads`
- **Auth:** Required
- **Body:** `{ title, description, price, categoryId, subcategoryId, locationId, images, condition, ... }`
- **Description:** Create a new classified ad listing

### Get All Ads
- **GET** `/api/ads?page=1&limit=20&category=&location=&minPrice=&maxPrice=&sort=`
- **Auth:** Optional
- **Query Params:** page, limit, category, subcategory, location, minPrice, maxPrice, condition, sort
- **Description:** Get paginated list of ads with filters

### Get Single Ad
- **GET** `/api/ads/:id`
- **Auth:** Optional
- **Description:** Get detailed information about a specific ad

### Update Ad
- **PUT** `/api/ads/:id`
- **Auth:** Required (Owner)
- **Body:** `{ title, description, price, ... }`
- **Description:** Update an existing ad

### Delete Ad
- **DELETE** `/api/ads/:id`
- **Auth:** Required (Owner or Admin)
- **Description:** Delete an ad listing

### Get User Ads
- **GET** `/api/user/ads?status=&page=&limit=`
- **Auth:** Required
- **Description:** Get all ads posted by the authenticated user

### Favorite Ad
- **POST** `/api/ads/:id/favorite`
- **Auth:** Required
- **Description:** Add ad to favorites

### Unfavorite Ad
- **DELETE** `/api/ads/:id/favorite`
- **Auth:** Required
- **Description:** Remove ad from favorites

### Get Favorites
- **GET** `/api/user/favorites`
- **Auth:** Required
- **Description:** Get user's favorite ads

### Report Ad
- **POST** `/api/ads/:id/report`
- **Auth:** Required
- **Body:** `{ reason, description }`
- **Description:** Report an inappropriate ad

### Bump Up Ad
- **POST** `/api/ads/:id/bump`
- **Auth:** Required (Owner)
- **Description:** Bump ad to top of listings (premium feature)

### Get Ad Views
- **GET** `/api/ads/:id/views`
- **Auth:** Required (Owner or Admin)
- **Description:** Get view statistics for an ad

---

## B - Business Packages

### Get Business Package Info
- **GET** `/api/business-package/info`
- **Auth:** Optional
- **Description:** Get available business package types and pricing

### Get User Business Package Status
- **GET** `/api/business-package/status`
- **Auth:** Required
- **Description:** Get user's active business packages

### Create Business Package Order
- **POST** `/api/business-package/order`
- **Auth:** Required
- **Body:** `{ packageType }`
- **Description:** Create order for business package purchase

### Verify Business Package Payment
- **POST** `/api/business-package/verify`
- **Auth:** Required
- **Body:** `{ razorpayOrderId, razorpayPaymentId, razorpaySignature }`
- **Description:** Verify and activate business package after payment

### Get Business Package History
- **GET** `/api/business-package/history`
- **Auth:** Required
- **Description:** Get user's business package purchase history

---

## C - Categories

### Get All Categories
- **GET** `/api/categories`
- **Auth:** Optional
- **Description:** Get all categories with subcategories

### Get Category by Slug
- **GET** `/api/categories/:slug`
- **Auth:** Optional
- **Description:** Get single category with subcategories

### Get Subcategories
- **GET** `/api/categories/:slug/subcategories`
- **Auth:** Optional
- **Description:** Get subcategories for a category

### Get Category Ads
- **GET** `/api/categories/:categorySlug/:subcategorySlug`
- **Auth:** Optional
- **Query Params:** page, limit, sort, minPrice, maxPrice
- **Description:** Get ads filtered by category and subcategory

### Get Single Product/Ad
- **GET** `/api/categories/:categorySlug/:subcategorySlug/:productSlug`
- **Auth:** Optional
- **Description:** Get single ad by category/subcategory/product slugs

---

## D - Dashboard & Admin

### Admin Dashboard Stats
- **GET** `/api/admin/dashboard`
- **Auth:** Required (Admin)
- **Description:** Get admin dashboard statistics

### Admin Users List
- **GET** `/api/admin/users?page=&limit=&search=&role=`
- **Auth:** Required (Admin)
- **Description:** Get paginated list of users

### Admin Ads List
- **GET** `/api/admin/ads?page=&limit=&status=&search=`
- **Auth:** Required (Admin)
- **Description:** Get paginated list of ads for moderation

### Admin Approve Ad
- **POST** `/api/admin/ads/:id/approve`
- **Auth:** Required (Admin)
- **Description:** Approve a pending ad

### Admin Reject Ad
- **POST** `/api/admin/ads/:id/reject`
- **Auth:** Required (Admin)
- **Body:** `{ reason }`
- **Description:** Reject an ad with reason

### Admin Categories Management
- **GET** `/api/admin/categories`
- **POST** `/api/admin/categories`
- **PUT** `/api/admin/categories/:id`
- **DELETE** `/api/admin/categories/:id`
- **Auth:** Required (Admin)
- **Description:** Manage categories (CRUD operations)

### Admin Locations Management
- **GET** `/api/admin/locations`
- **POST** `/api/admin/locations`
- **PUT** `/api/admin/locations/:id`
- **DELETE** `/api/admin/locations/:id`
- **Auth:** Required (Admin)
- **Description:** Manage locations (CRUD operations)

### Admin Banners Management
- **GET** `/api/admin/banners`
- **POST** `/api/admin/banners`
- **PUT** `/api/admin/banners/:id`
- **DELETE** `/api/admin/banners/:id`
- **Auth:** Required (Admin)
- **Description:** Manage homepage banners

### Admin Interstitial Ads
- **GET** `/api/admin/interstitial-ads`
- **POST** `/api/admin/interstitial-ads`
- **PUT** `/api/admin/interstitial-ads/:id`
- **DELETE** `/api/admin/interstitial-ads/:id`
- **Auth:** Required (Admin)
- **Description:** Manage interstitial ads

### Admin Premium Settings
- **GET** `/api/admin/premium/settings`
- **PUT** `/api/admin/premium/settings`
- **Auth:** Required (Admin)
- **Description:** Manage premium ad pricing and settings

### Admin Business Packages
- **GET** `/api/admin/business-packages`
- **POST** `/api/admin/business-packages`
- **PUT** `/api/admin/business-packages/:id`
- **Auth:** Required (Admin)
- **Description:** Manage business package configurations

---

## E - Email & Notifications

### Send Test Email
- **POST** `/api/test/email`
- **Auth:** Required (Admin)
- **Body:** `{ to, subject, text, html }`
- **Description:** Send test email

### Get Notifications
- **GET** `/api/user/notifications?page=&limit=&unreadOnly=`
- **Auth:** Required
- **Description:** Get user notifications

### Mark Notification Read
- **PUT** `/api/user/notifications/:id/read`
- **Auth:** Required
- **Description:** Mark notification as read

### Mark All Notifications Read
- **PUT** `/api/user/notifications/read-all`
- **Auth:** Required
- **Description:** Mark all notifications as read

---

## F - Follow & Social

### Follow User
- **POST** `/api/follow/:userId`
- **Auth:** Required
- **Description:** Follow a user

### Unfollow User
- **DELETE** `/api/follow/:userId`
- **Auth:** Required
- **Description:** Unfollow a user

### Get Followers
- **GET** `/api/follow/:userId/followers`
- **Auth:** Optional
- **Description:** Get user's followers list

### Get Following
- **GET** `/api/follow/:userId/following`
- **Auth:** Optional
- **Description:** Get users that a user is following

### Get Follow Stats
- **GET** `/api/follow/stats/:userId`
- **Auth:** Optional
- **Description:** Get follower/following counts

### Check Follow Status
- **GET** `/api/follow/:userId/status`
- **Auth:** Required
- **Description:** Check if current user follows a user

---

## G - Geocoding & Location

### Geocode Address
- **POST** `/api/geocoding/geocode`
- **Auth:** Optional
- **Body:** `{ address }`
- **Description:** Convert address to coordinates

### Reverse Geocode
- **POST** `/api/geocoding/reverse`
- **Auth:** Optional
- **Body:** `{ latitude, longitude }`
- **Description:** Convert coordinates to address

### Get Location Suggestions
- **GET** `/api/geocoding/suggestions?query=`
- **Auth:** Optional
- **Description:** Get location suggestions based on query

---

## H - Help & Support

### Contact Support
- **POST** `/api/contact`
- **Auth:** Optional
- **Body:** `{ name, email, subject, message }`
- **Description:** Send support message

### Get Help Articles
- **GET** `/api/help`
- **Auth:** Optional
- **Description:** Get help documentation

---

## I - Interstitial Ads

### Get Interstitial Ads
- **GET** `/api/interstitial-ads?position=`
- **Auth:** Optional
- **Query Params:** position (page_load, page_exit, after_action, between_pages)
- **Description:** Get active interstitial ads by position

### Track Ad View
- **POST** `/api/interstitial-ads/:id/view`
- **Auth:** Optional
- **Description:** Track interstitial ad view

### Track Ad Click
- **POST** `/api/interstitial-ads/:id/click`
- **Auth:** Optional
- **Description:** Track interstitial ad click

---

## J - JWT & Authentication

### Register
- **POST** `/api/auth/register`
- **Auth:** Public
- **Body:** `{ name, email?, phone?, password?, referralCode? }`
- **Description:** Register new user account

### Login
- **POST** `/api/auth/login`
- **Auth:** Public
- **Body:** `{ email?, phone?, password }`
- **Description:** Login with email/phone and password

### Login with OTP
- **POST** `/api/auth/login-otp`
- **Auth:** Public
- **Body:** `{ email?, phone? }`
- **Description:** Request OTP for passwordless login

### Send OTP
- **POST** `/api/auth/send-otp`
- **Auth:** Public
- **Body:** `{ email?, phone? }`
- **Description:** Send OTP code

### Verify OTP
- **POST** `/api/auth/verify-otp`
- **Auth:** Public
- **Body:** `{ email?, phone?, code }`
- **Description:** Verify OTP and login

### Get Current User
- **GET** `/api/auth/me`
- **Auth:** Required
- **Description:** Get authenticated user profile

### Refresh Token
- **POST** `/api/auth/refresh`
- **Auth:** Required
- **Description:** Refresh authentication token

### Forgot Password
- **POST** `/api/auth/forgot-password`
- **Auth:** Public
- **Body:** `{ email?, phone? }`
- **Description:** Request password reset OTP

### Reset Password
- **POST** `/api/auth/reset-password`
- **Auth:** Public
- **Body:** `{ email?, phone?, code, newPassword }`
- **Description:** Reset password with OTP

---

## K - Keys & Configuration

### Get Payment Gateway Status
- **GET** `/api/payment-gateway/status`
- **Auth:** Public
- **Description:** Get payment gateway configuration status

### Reinitialize Payment Gateway
- **POST** `/api/payment-gateway/reinitialize`
- **Auth:** Required (Admin)
- **Description:** Reinitialize payment gateway with new keys

---

## L - Locations

### Get All Locations
- **GET** `/api/locations?state=&city=`
- **Auth:** Optional
- **Query Params:** state, city
- **Description:** Get all active locations

### Get Location by Slug
- **GET** `/api/locations/:slug`
- **Auth:** Optional
- **Description:** Get single location details

### Get Location Ads
- **GET** `/api/locations/:slug/ads`
- **Auth:** Optional
- **Query Params:** page, limit
- **Description:** Get ads for a specific location

---

## M - Moderation

### Get Moderation Queue
- **GET** `/api/moderation/queue?status=&page=&limit=`
- **Auth:** Required (Admin/Moderator)
- **Description:** Get ads pending moderation

### Moderate Ad
- **POST** `/api/moderation/ads/:id`
- **Auth:** Required (Admin/Moderator)
- **Body:** `{ action, reason? }`
- **Description:** Approve or reject ad

### Get Moderation Stats
- **GET** `/api/moderation/stats`
- **Auth:** Required (Admin/Moderator)
- **Description:** Get moderation statistics

---

## N - Notifications

### Get Push Subscriptions
- **GET** `/api/push/subscriptions`
- **Auth:** Required
- **Description:** Get user's push notification subscriptions

### Subscribe to Push
- **POST** `/api/push/subscribe`
- **Auth:** Required
- **Body:** `{ endpoint, keys }`
- **Description:** Subscribe to push notifications

### Unsubscribe from Push
- **DELETE** `/api/push/unsubscribe`
- **Auth:** Required
- **Body:** `{ endpoint }`
- **Description:** Unsubscribe from push notifications

### Send Push Notification
- **POST** `/api/push/send`
- **Auth:** Required (Admin)
- **Body:** `{ title, body, url?, userId? }`
- **Description:** Send push notification

---

## O - OAuth & Social Login

### Google OAuth
- **GET** `/api/auth/google`
- **Auth:** Public
- **Description:** Initiate Google OAuth login

### Google OAuth Callback
- **GET** `/api/auth/google/callback`
- **Auth:** Public
- **Description:** Handle Google OAuth callback

### Facebook OAuth
- **GET** `/api/auth/facebook`
- **Auth:** Public
- **Description:** Initiate Facebook OAuth login

### Facebook OAuth Callback
- **GET** `/api/auth/facebook/callback`
- **Auth:** Public
- **Description:** Handle Facebook OAuth callback

---

## P - Payments & Premium

### Create Payment Order
- **POST** `/api/payment-gateway/order`
- **Auth:** Required
- **Body:** `{ amount, currency?, notes? }`
- **Description:** Create Razorpay payment order

### Verify Payment
- **POST** `/api/payment-gateway/verify`
- **Auth:** Required
- **Body:** `{ orderId, paymentId, signature }`
- **Description:** Verify Razorpay payment

### Process Refund
- **POST** `/api/payment-gateway/refund`
- **Auth:** Required (Admin)
- **Body:** `{ paymentId, amount? }`
- **Description:** Process payment refund

### Capture Payment
- **POST** `/api/payment-gateway/capture`
- **Auth:** Required
- **Body:** `{ paymentId, amount }`
- **Description:** Capture authorized payment

### Get Payment History
- **GET** `/api/payment-gateway/payments?page=&limit=`
- **Auth:** Required
- **Description:** Get user's payment history

### Get Payment Details
- **GET** `/api/payment-gateway/payment/:paymentId`
- **Auth:** Required
- **Description:** Get payment details

### Get Order Status
- **GET** `/api/payment-gateway/order/:orderId`
- **Auth:** Required
- **Description:** Get payment order status

### Get Razorpay Order Details
- **GET** `/api/payment-gateway/razorpay-order/:orderId`
- **Auth:** Required
- **Description:** Get Razorpay order details

### Payment Webhook
- **POST** `/api/payment-gateway/webhook`
- **Auth:** Public (Razorpay signature verified)
- **Description:** Handle Razorpay webhook events

### Get Premium Offers
- **GET** `/api/premium/offers`
- **Auth:** Optional
- **Description:** Get available premium ad options

### Purchase Premium Ad
- **POST** `/api/premium/purchase`
- **Auth:** Required
- **Body:** `{ adId, type, duration? }`
- **Description:** Purchase premium ad feature

### Get Premium Settings
- **GET** `/api/premium/settings`
- **Auth:** Optional
- **Description:** Get premium ad pricing and settings

---

## Q - Queries & Search

### Search Ads
- **GET** `/api/search?q=&page=&limit=&category=&location=&minPrice=&maxPrice=&sort=`
- **Auth:** Optional
- **Description:** Search ads using Meilisearch

### Autocomplete Search
- **GET** `/api/search/autocomplete?q=`
- **Auth:** Optional
- **Description:** Get search autocomplete suggestions

### Get Search Suggestions
- **GET** `/api/search/suggestions?q=`
- **Auth:** Optional
- **Description:** Get search query suggestions

---

## R - Referrals & Rewards

### Get Referral Code
- **GET** `/api/referral/code`
- **Auth:** Required
- **Description:** Get user's referral code

### Get Referral Stats
- **GET** `/api/referral/stats`
- **Auth:** Required
- **Description:** Get referral statistics and earnings

### Get Referral History
- **GET** `/api/referral/history`
- **Auth:** Required
- **Description:** Get referral history

### Claim Referral Reward
- **POST** `/api/referral/claim`
- **Auth:** Required
- **Body:** `{ referralId }`
- **Description:** Claim referral reward

---

## S - Search & Alerts

### Create Search Alert
- **POST** `/api/search-alerts`
- **Auth:** Required
- **Body:** `{ query, categoryId?, subcategoryId?, locationId?, minPrice?, maxPrice? }`
- **Description:** Create search alert

### Get Search Alerts
- **GET** `/api/search-alerts`
- **Auth:** Required
- **Description:** Get user's search alerts

### Update Search Alert
- **PUT** `/api/search-alerts/:id`
- **Auth:** Required
- **Body:** `{ query, isActive?, ... }`
- **Description:** Update search alert

### Delete Search Alert
- **DELETE** `/api/search-alerts/:id`
- **Auth:** Required
- **Description:** Delete search alert

### Get Search Alert Matches
- **GET** `/api/search-alerts/:id/matches`
- **Auth:** Required
- **Description:** Get ads matching search alert

---

## T - Test & Development

### Get Test Users (Payment Gateway)
- **GET** `/api/payment-gateway/test-users`
- **Auth:** Required (Dev mode or Admin)
- **Description:** Get test users for payment gateway

### Get Test User Info
- **GET** `/api/payment-gateway/test-user/:userId`
- **Auth:** Required (Dev mode or Admin)
- **Description:** Get test user details

### Test Email
- **POST** `/api/test/email`
- **Auth:** Required (Admin)
- **Description:** Send test email

---

## U - User Management

### Get User Profile
- **GET** `/api/user/profile`
- **Auth:** Required
- **Description:** Get authenticated user profile

### Get Profile Stats
- **GET** `/api/profile/stats`
- **Auth:** Required
- **Description:** Get user profile statistics

### Update Profile
- **PUT** `/api/user/profile`
- **Auth:** Required
- **Body:** `{ name?, email?, phone?, bio?, showPhone?, locationId? }`
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

### Get Public Profile
- **GET** `/api/user/public/:userId`
- **Auth:** Optional
- **Description:** Get public user profile

### Deactivate Account
- **POST** `/api/user/deactivate`
- **Auth:** Required
- **Body:** `{ reason? }`
- **Description:** Deactivate user account

### Reactivate Account
- **POST** `/api/user/reactivate`
- **Auth:** Required
- **Body:** `{ email?, phone?, password? }`
- **Description:** Reactivate deactivated account

### Logout All Devices
- **POST** `/api/user/logout-all-devices`
- **Auth:** Required
- **Description:** Logout from all devices

### Get Deactivation Status
- **GET** `/api/user/deactivation-status`
- **Auth:** Required
- **Description:** Check if account is deactivated

### Get Free Ads Status
- **GET** `/api/user/free-ads-status`
- **Auth:** Required
- **Description:** Get free ads remaining count

### Get User Orders
- **GET** `/api/user/orders`
- **Auth:** Required
- **Description:** Get user's ad posting orders

### Get Order Invoice
- **GET** `/api/user/orders/:orderId/invoice`
- **Auth:** Required
- **Description:** Get order invoice PDF

---

## V - Verification

### Verify Email
- **POST** `/api/auth/verify-email`
- **Auth:** Required
- **Body:** `{ code }`
- **Description:** Verify email with OTP

### Verify Phone
- **POST** `/api/auth/verify-phone`
- **Auth:** Required
- **Body:** `{ code }`
- **Description:** Verify phone with OTP

### Resend Verification
- **POST** `/api/auth/resend-verification`
- **Auth:** Required
- **Body:** `{ type }` (email or phone)
- **Description:** Resend verification code

---

## W - Wallet & Transactions

### Get Wallet Balance
- **GET** `/api/wallet/balance`
- **Auth:** Required
- **Description:** Get user wallet balance

### Get Wallet Transactions
- **GET** `/api/wallet/transactions?page=&limit=&type=`
- **Auth:** Required
- **Description:** Get wallet transaction history

### Add Money to Wallet
- **POST** `/api/wallet/add`
- **Auth:** Required
- **Body:** `{ amount }`
- **Description:** Add money to wallet

### Withdraw from Wallet
- **POST** `/api/wallet/withdraw`
- **Auth:** Required
- **Body:** `{ amount, accountDetails }`
- **Description:** Withdraw money from wallet

### Transfer Wallet Funds
- **POST** `/api/wallet/transfer`
- **Auth:** Required
- **Body:** `{ toUserId, amount }`
- **Description:** Transfer funds to another user

---

## X - XML & Sitemaps

### Get Sitemap
- **GET** `/api/sitemap.xml`
- **Auth:** Public
- **Description:** Get sitemap XML

### Get Robots.txt
- **GET** `/robots.txt`
- **Auth:** Public
- **Description:** Get robots.txt file

---

## Y - Your Account

### Get Account Settings
- **GET** `/api/user/settings`
- **Auth:** Required
- **Description:** Get user account settings

### Update Account Settings
- **PUT** `/api/user/settings`
- **Auth:** Required
- **Body:** `{ notifications?, privacy?, ... }`
- **Description:** Update account settings

### Get Auth Settings
- **GET** `/api/auth-settings`
- **Auth:** Required
- **Description:** Get authentication settings page configuration

### Update Auth Settings
- **PUT** `/api/auth-settings`
- **Auth:** Required (Admin)
- **Body:** `{ title?, description?, ... }`
- **Description:** Update authentication page settings

---

## Z - Zones & Regions

### Get Regions
- **GET** `/api/locations/regions`
- **Auth:** Optional
- **Description:** Get all regions/states

### Get Cities by Region
- **GET** `/api/locations/regions/:region/cities`
- **Auth:** Optional
- **Description:** Get cities in a region

### Get Neighborhoods
- **GET** `/api/locations/:slug/neighborhoods`
- **Auth:** Optional
- **Description:** Get neighborhoods in a location

---

## 🔐 AUTH / SECURITY (Additional)

### Refresh Token
- **POST** `/api/auth/refresh-token` - Refresh authentication token

### Change Password (Alternative)
- **POST** `/api/auth/change-password` - Change password (POST version)

### Delete Account
- **DELETE** `/api/user/account` - Permanently delete user account

---

## 👤 USER / PROFILE (Additional)

### Public Profile by ID
- **GET** `/api/users/:id/public-profile` - Get public profile by user ID

### Activity Log
- **GET** `/api/user/activity-log` - Get user activity log

### Notification Settings
- **PUT** `/api/user/notification-settings` - Update notification preferences

### Recent Views
- **GET** `/api/user/recent-views` - Get recently viewed ads

---

## 📦 ADS / LISTINGS (Additional)

### Mark as Sold
- **POST** `/api/ads/:id/mark-sold` - Mark ad as sold

### Mark as Expired
- **POST** `/api/ads/:id/mark-expired` - Mark ad as expired

### Report Ad
- **POST** `/api/ads/:id/report` - Report inappropriate ad

---

## 🔍 SEARCH / ENGAGEMENT (Additional)

### Trending Searches
- **GET** `/api/search/trending` - Get trending search queries

---

## 💬 CHAT (Additional)

### Unread Count
- **GET** `/api/chat/unread-count` - Get unread message count

### Block User in Chat
- **POST** `/api/chat/block/:userId` - Block user from messaging

---

## 💳 WALLET / PAYMENT (Additional)

### Cancel Payment Order
- **POST** `/api/payment-gateway/cancel` - Cancel payment order

---

## 🔔 NOTIFICATIONS (Additional)

### Mark Notification Read (POST)
- **POST** `/api/user/notifications/read` - Mark notification as read (POST version)

---

## 🛠️ ADMIN (Additional)

### Analytics
- **GET** `/api/admin/analytics` - Get analytics data

### Audit Logs
- **GET** `/api/admin/audit-logs` - Get audit logs with filtering

### Roles Management
- **GET** `/api/admin/roles` - Get available roles
- **POST** `/api/admin/roles` - Create/update role

---

## 🧠 AI (Additional)

### Ad Description
- **POST** `/api/ai/ad-description` - Generate ad description

### Price Suggestion (POST)
- **POST** `/api/ai/ad-price-suggestion` - Get AI price suggestion

### Image Moderation
- **POST** `/api/ai/image-moderation` - Moderate image content

---

## 🧱 SYSTEM / SCALE (Additional)

### Health Check (API)
- **GET** `/api/health` - Health check endpoint

### Rate Limit Status
- **GET** `/api/rate-limit/status` - Get rate limit status

---

## 📊 Summary Statistics

- **Total Endpoints:** 220+
- **Public Endpoints:** ~42
- **Authenticated Endpoints:** ~178
- **Admin Endpoints:** ~35
- **Payment Endpoints:** ~16
- **Search Endpoints:** ~11
- **AI Endpoints:** ~5
- **System Endpoints:** ~3

---

## 🔐 Authentication

Most endpoints require authentication via Bearer token:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 📝 Notes

- All endpoints return JSON responses
- Error responses follow format: `{ success: false, message: "..." }`
- Success responses follow format: `{ success: true, data: {...} }`
- Pagination uses `page` and `limit` query parameters
- Dates are in ISO 8601 format
- Prices are in INR (Indian Rupees)

---

**Last Updated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")


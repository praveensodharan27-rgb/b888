# Complete API Endpoints List - All 256+ Endpoints

**Base URL:** `http://localhost:5000/api`

---

## 📊 Statistics
- **Total Endpoints:** 256+
- **Public Endpoints:** ~45
- **Authenticated Endpoints:** ~195
- **Admin Endpoints:** ~42

---

## 🔐 AUTHENTICATION (12 endpoints)

### Basic Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/phone + password
- `POST /api/auth/login-otp` - Login with OTP
- `POST /api/auth/send-otp` - Send OTP code
- `POST /api/auth/verify-otp` - Verify OTP and login
- `POST /api/auth/forgot-password` - Request password reset OTP
- `POST /api/auth/verify-reset-otp` - Verify reset password OTP
- `POST /api/auth/reset-password` - Reset password with OTP
- `POST /api/auth/refresh-token` - Refresh authentication token (Auth)
- `POST /api/auth/change-password` - Change password (Auth)
- `GET /api/auth/me` - Get current user info (Auth)

### OAuth
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/facebook` - Initiate Facebook OAuth
- `GET /api/auth/facebook/callback` - Facebook OAuth callback

---

## 👤 USER MANAGEMENT (20 endpoints)

- `GET /api/user/public/:userId` - Get public user profile
- `GET /api/users/:id/public-profile` - Get public profile by ID
- `GET /api/user/profile` - Get own profile (Auth)
- `GET /api/profile/stats` - Get user profile statistics (Auth)
- `PUT /api/user/profile` - Update profile (Auth)
- `PUT /api/user/avatar` - Upload/update avatar (Auth)
- `PUT /api/user/password` - Change password (Auth)
- `GET /api/user/free-ads-status` - Check free ads remaining (Auth)
- `GET /api/user/ads` - Get user's ads (Auth)
- `GET /api/user/favorites` - Get user's favorite ads (Auth)
- `GET /api/user/notifications` - Get user notifications (Auth)
- `PUT /api/user/notifications/:id/read` - Mark notification as read (Auth)
- `POST /api/user/notifications/read` - Mark notification as read POST (Auth)
- `PUT /api/user/notifications/read-all` - Mark all notifications as read (Auth)
- `PUT /api/user/notification-settings` - Update notification settings (Auth)
- `GET /api/user/orders` - Get user's orders (Auth)
- `GET /api/user/orders/:orderId/invoice` - Get order invoice PDF (Auth)
- `GET /api/user/activity-log` - Get user activity log (Auth)
- `GET /api/user/recent-views` - Get recently viewed ads (Auth)
- `POST /api/user/deactivate` - Deactivate account (Auth)
- `POST /api/user/reactivate` - Reactivate account (Auth)
- `DELETE /api/user/account` - Permanently delete account (Auth)
- `POST /api/user/logout-all-devices` - Logout from all devices (Auth)
- `GET /api/user/deactivation-status` - Check account deactivation status (Auth)

---

## 📦 ADS MANAGEMENT (22 endpoints)

### Basic Operations
- `GET /api/ads` - Get all ads (with filters, pagination)
- `GET /api/ads/check-limit` - Check if user can post more ads (Auth)
- `GET /api/ads/price-suggestion` - Get AI price suggestion
- `GET /api/ads/live-location` - Get ads by live location (lat/lng)
- `GET /api/ads/:id` - Get ad details
- `POST /api/ads` - Create new ad (Auth)
- `PUT /api/ads/:id` - Update ad (Auth)
- `DELETE /api/ads/:id` - Delete ad (Auth)
- `POST /api/ads/:id/favorite` - Toggle favorite ad (Auth)
- `GET /api/ads/:id/favorite` - Check if ad is favorited (Auth)
- `POST /api/ads/:id/mark-sold` - Mark ad as sold (Auth)
- `POST /api/ads/:id/mark-expired` - Mark ad as expired (Auth)
- `POST /api/ads/:id/report` - Report inappropriate ad (Auth)

### Ad Drafts (6 endpoints)
- `POST /api/ads/draft` - Save ad as draft (Auth)
- `GET /api/ads/drafts` - Get all drafts for current user (Auth)
- `GET /api/ads/draft/:id` - Get a specific draft (Auth)
- `PUT /api/ads/draft/:id` - Update a draft (Auth)
- `POST /api/ads/draft/:id/publish` - Publish a draft (Auth)
- `DELETE /api/ads/draft/:id` - Delete a draft (Auth)

### Ad Renewal (3 endpoints)
- `POST /api/ads/:id/renew` - Renew an expired ad (Auth)
- `GET /api/ads/:id/renewal-history` - Get renewal history (Auth)
- `GET /api/ads/:id/renewal-status` - Check renewal status (Auth)

---

## 🏷️ CATEGORIES (5 endpoints)

- `GET /api/categories` - Get all categories with subcategories
- `GET /api/categories/:slug` - Get category by slug
- `GET /api/categories/:id/subcategories` - Get subcategories for category
- `GET /api/categories/:categorySlug/:subcategorySlug` - Get ads by category/subcategory
- `GET /api/categories/:categorySlug/:subcategorySlug/:productSlug` - Get single ad by slugs

---

## 📍 LOCATIONS (2 endpoints)

- `GET /api/locations` - Get all locations
- `GET /api/locations/:slug` - Get location by slug

---

## 💳 PAYMENT GATEWAY (13 endpoints)

- `GET /api/payment-gateway/status` - Get gateway status
- `POST /api/payment-gateway/order` - Create payment order (Auth)
- `POST /api/payment-gateway/verify` - Verify payment (Auth)
- `POST /api/payment-gateway/refund` - Process refund (Auth)
- `POST /api/payment-gateway/cancel` - Cancel payment order (Auth)
- `POST /api/payment-gateway/capture` - Capture authorized payment (Auth)
- `GET /api/payment-gateway/order/:orderId` - Get order status (Auth)
- `GET /api/payment-gateway/payments` - Get payment history (Auth)
- `GET /api/payment-gateway/payment/:paymentId` - Get payment details (Auth)
- `GET /api/payment-gateway/razorpay-order/:orderId` - Get Razorpay order details (Auth)
- `POST /api/payment-gateway/webhook` - Razorpay webhook handler (Public*)
- `POST /api/payment-gateway/reinitialize` - Reinitialize payment gateway (Admin)
- `GET /api/payment-gateway/test-users` - Get test users (Dev/Admin)
- `GET /api/payment-gateway/test-user/:userId` - Get test user info (Dev/Admin)

---

## ⭐ PREMIUM ADS (6 endpoints)

- `GET /api/premium/offers` - Get premium ad options
- `POST /api/premium/order` - Purchase premium ad (Auth)
- `POST /api/premium/verify` - Verify premium payment (Auth)
- `GET /api/premium/orders` - Get premium orders (Auth)
- `POST /api/premium/ad-posting/order` - Create ad posting order (Auth)
- `POST /api/premium/ad-posting/verify` - Verify ad posting payment (Auth)

---

## 💼 BUSINESS PACKAGES (5 endpoints)

- `GET /api/business-package/info` - Get available packages
- `GET /api/business-package/status` - Get user's package status (Auth)
- `POST /api/business-package/order` - Create package order (Auth)
- `POST /api/business-package/verify` - Verify package payment (Auth)
- `GET /api/business-package/history` - Get package history (Auth)

---

## 🔍 SEARCH (3 endpoints)

- `GET /api/search` - Search ads with filters
- `GET /api/search/autocomplete` - Get autocomplete suggestions
- `GET /api/search/trending` - Get trending searches

---

## 🔔 SEARCH ALERTS (5 endpoints)

- `GET /api/search-alerts` - Get user's search alerts (Auth)
- `POST /api/search-alerts` - Create search alert (Auth)
- `PUT /api/search-alerts/:id` - Update search alert (Auth)
- `DELETE /api/search-alerts/:id` - Delete search alert (Auth)
- `GET /api/search-alerts/:id/matches` - Get alert matches (Auth)

---

## 💬 CHAT (11 endpoints)

### Basic Chat
- `POST /api/chat/room` - Create/get chat room (Auth)
- `GET /api/chat/rooms` - Get user's chat rooms (Auth)
- `GET /api/chat/rooms/:roomId/messages` - Get chat messages (Auth)
- `GET /api/chat/unread-count` - Get unread message count (Auth)
- `POST /api/chat/block/:userId` - Block user in chat (Auth)
- `GET /api/chat/online-users` - Get online users (Auth)

### Chat Read Receipts (5 endpoints)
- `POST /api/chat/messages/:messageId/read` - Mark message as read (Auth)
- `POST /api/chat/rooms/:roomId/read-all` - Mark all messages in room as read (Auth)
- `GET /api/chat/messages/:messageId/read-receipts` - Get read receipts for message (Auth)
- `POST /api/chat/messages/read-status` - Get read status for multiple messages (Auth)
- `GET /api/chat/rooms/unread-counts` - Get unread count per room (Auth)

---

## 👥 FOLLOW (6 endpoints)

- `POST /api/follow/:userId` - Follow a user (Auth)
- `DELETE /api/follow/:userId` - Unfollow a user (Auth)
- `GET /api/follow/check/:userId` - Check follow status (Auth)
- `GET /api/follow/followers/:userId` - Get user's followers
- `GET /api/follow/following/:userId` - Get users being followed
- `GET /api/follow/stats/:userId` - Get follow statistics

---

## 🚫 BLOCK (4 endpoints)

- `POST /api/block/:userId` - Block a user (Auth)
- `DELETE /api/block/:userId` - Unblock a user (Auth)
- `GET /api/block/check/:userId` - Check block status (Auth)
- `GET /api/block/list` - Get blocked users list (Auth)

---

## 📞 CONTACT REQUESTS (5 endpoints)

- `POST /api/contact-request` - Request contact info (Auth)
- `GET /api/contact-request/check/:userId` - Check contact request status (Auth)
- `GET /api/contact-request/pending` - Get pending requests (Auth)
- `POST /api/contact-request/:requestId/approve` - Approve contact request (Auth)
- `POST /api/contact-request/:requestId/reject` - Reject contact request (Auth)

---

## 💰 WALLET (8 endpoints)

- `GET /api/wallet/balance` - Get wallet balance (Auth)
- `GET /api/wallet/transactions` - Get transaction history (Auth)
- `POST /api/wallet/add` - Add money to wallet (Auth)
- `POST /api/wallet/withdraw` - Withdraw from wallet (Auth)
- `POST /api/wallet/transfer` - Transfer funds to another user (Auth)
- `GET /api/wallet/statement` - Get wallet statement with filters (Auth)
- `GET /api/wallet/statement/download` - Download statement as PDF placeholder (Auth)

---

## 🎁 REFERRAL (4 endpoints)

- `GET /api/referral/code` - Get referral code (Auth)
- `GET /api/referral/stats` - Get referral statistics (Auth)
- `GET /api/referral/history` - Get referral history (Auth)
- `POST /api/referral/claim` - Claim referral reward (Auth)

---

## 🧠 AI SERVICES (4 endpoints)

- `POST /api/ai/generate-description` - Generate ad description (Auth)
- `POST /api/ai/ad-description` - Generate ad description alternative (Auth)
- `POST /api/ai/ad-price-suggestion` - Get AI price suggestion (Auth)
- `POST /api/ai/image-moderation` - Moderate image content (Auth)

---

## 📍 GEOCODING (3 endpoints)

- `POST /api/geocoding/geocode` - Convert address to coordinates
- `POST /api/geocoding/reverse` - Convert coordinates to address
- `GET /api/geocoding/suggestions` - Get location suggestions

---

## 🎨 BANNERS (2 endpoints)

- `GET /api/banners` - Get active banners
- `GET /api/banners/:position` - Get banners by position

---

## 📱 INTERSTITIAL ADS (3 endpoints)

- `GET /api/interstitial-ads` - Get interstitial ads
- `POST /api/interstitial-ads/:id/view` - Track ad view
- `POST /api/interstitial-ads/:id/click` - Track ad click

---

## 🔔 PUSH NOTIFICATIONS (4 endpoints)

- `GET /api/push/subscriptions` - Get push subscriptions (Auth)
- `POST /api/push/subscribe` - Subscribe to push notifications (Auth)
- `DELETE /api/push/unsubscribe` - Unsubscribe from push (Auth)
- `POST /api/push/send` - Send push notification (Admin)

---

## 🛠️ ADMIN (42+ endpoints)

### Dashboard & Stats
- `GET /api/admin/dashboard` - Get dashboard statistics (Admin)
- `GET /api/admin/analytics` - Get analytics data (Admin)
- `GET /api/admin/recent-activity` - Get recent activity (Admin)

### Users Management
- `GET /api/admin/users` - Get users list (Admin)
- `PUT /api/admin/users/:id/role` - Update user role (Admin)
- `POST /api/admin/users/:id/block` - Block user (Admin)
- `POST /api/admin/users/:id/unblock` - Unblock user (Admin)

### Ads Management
- `GET /api/admin/ads` - Get ads list (Admin)
- `GET /api/admin/ads/flagged` - Get flagged ads (Admin)
- `PUT /api/admin/ads/:id/status` - Update ad status (Admin)
- `POST /api/admin/ads/:id/approve` - Approve ad (Admin)
- `POST /api/admin/ads/:id/reject` - Reject ad (Admin)

### Categories Management
- `GET /api/admin/categories` - Get categories (Admin)
- `POST /api/admin/categories` - Create category (Admin)
- `PUT /api/admin/categories/:id` - Update category (Admin)
- `DELETE /api/admin/categories/:id` - Delete category (Admin)

### Locations Management
- `GET /api/admin/locations` - Get locations (Admin)
- `POST /api/admin/locations` - Create location (Admin)
- `PUT /api/admin/locations/:id` - Update location (Admin)
- `DELETE /api/admin/locations/:id` - Delete location (Admin)

### Banners Management
- `GET /api/admin/banners` - Get banners (Admin)
- `POST /api/admin/banners` - Create banner (Admin)
- `PUT /api/admin/banners/:id` - Update banner (Admin)
- `DELETE /api/admin/banners/:id` - Delete banner (Admin)

### Interstitial Ads Management
- `GET /api/admin/interstitial-ads` - Get interstitial ads (Admin)
- `POST /api/admin/interstitial-ads` - Create interstitial ad (Admin)
- `PUT /api/admin/interstitial-ads/:id` - Update interstitial ad (Admin)
- `DELETE /api/admin/interstitial-ads/:id` - Delete interstitial ad (Admin)

### Premium Settings
- `GET /api/admin/premium/settings` - Get premium settings (Admin)
- `PUT /api/admin/premium/settings` - Update premium settings (Admin)
- `GET /api/admin/premium/ads` - Get all premium ads (Admin)

### Business Packages Management
- `GET /api/admin/business-packages` - Get business packages (Admin)
- `POST /api/admin/business-packages` - Create business package (Admin)
- `PUT /api/admin/business-packages/:id` - Update business package (Admin)
- `GET /api/admin/business-packages/orders` - Get business package orders (Admin)

### System Management
- `GET /api/admin/analytics` - Get analytics (Admin)
- `GET /api/admin/audit-logs` - Get audit logs (Admin)
- `GET /api/admin/roles` - Get available roles (Admin)
- `POST /api/admin/roles` - Create/update role (Admin)

### Feature Flags (7 endpoints)
- `GET /api/admin/feature-flags` - Get all feature flags (Admin)
- `GET /api/admin/feature-flags/:flagName` - Get specific feature flag (Admin)
- `POST /api/admin/feature-flags/:flagName` - Create/update feature flag (Admin)
- `PATCH /api/admin/feature-flags/:flagName/toggle` - Toggle feature flag (Admin)
- `DELETE /api/admin/feature-flags/:flagName` - Delete feature flag (Admin)
- `POST /api/admin/feature-flags/bulk` - Bulk update feature flags (Admin)
- `GET /api/admin/feature-flags/:flagName/stats` - Get feature flag statistics (Admin)

---

## 🔍 MODERATION (3 endpoints)

- `GET /api/moderation/queue` - Get moderation queue (Admin/Mod)
- `POST /api/moderation/ads/:id` - Moderate ad (Admin/Mod)
- `GET /api/moderation/stats` - Get moderation stats (Admin/Mod)

---

## ⚙️ AUTH SETTINGS (2 endpoints)

- `GET /api/auth-settings/:page` - Get auth page settings
- `PUT /api/auth-settings/:page` - Update auth page settings (Admin)

---

## 🧪 TEST (1 endpoint)

- `POST /api/test/email` - Send test email (Admin)

---

## 🔐 SESSION MANAGEMENT (8 endpoints)

- `GET /api/session` - Get all active sessions (Auth)
- `GET /api/session/current` - Get current session details (Auth)
- `DELETE /api/session/:sessionId` - Revoke a specific session (Auth)
- `DELETE /api/session/others` - Revoke all other sessions (Auth)
- `DELETE /api/session/all` - Revoke all sessions (Auth)
- `PATCH /api/session/:sessionId/activity` - Update session activity (Auth)
- `GET /api/session/stats` - Get session statistics (Auth)
- `GET /api/session/admin/user/:userId` - Get sessions for user (Admin)

---

## 🧱 SYSTEM (7 endpoints)

- `GET /health` - Health check
- `GET /api/health` - Health check (API version)
- `GET /api/rate-limit/status` - Get rate limit status
- `GET /api/system/version` - Get system version information
- `GET /api/system/info` - Get detailed system information (Admin)
- `GET /api/system/health` - Get system health check
- `GET /api/system/status` - Get API status
- `GET /api/system/metrics` - Get system metrics (Admin)

---

## 📊 Summary by Category

| Category | Count | Base Path |
|----------|-------|-----------|
| Authentication | 12 | `/api/auth` |
| User Management | 20 | `/api/user` |
| Ads | 22 | `/api/ads` |
| Categories | 5 | `/api/categories` |
| Locations | 2 | `/api/locations` |
| Payment Gateway | 13 | `/api/payment-gateway` |
| Premium Ads | 6 | `/api/premium` |
| Business Packages | 5 | `/api/business-package` |
| Search | 3 | `/api/search` |
| Search Alerts | 5 | `/api/search-alerts` |
| Chat | 11 | `/api/chat` |
| Follow | 6 | `/api/follow` |
| Block | 4 | `/api/block` |
| Contact Request | 5 | `/api/contact-request` |
| Wallet | 8 | `/api/wallet` |
| Referral | 4 | `/api/referral` |
| AI Services | 4 | `/api/ai` |
| Geocoding | 3 | `/api/geocoding` |
| Banners | 2 | `/api/banners` |
| Interstitial Ads | 3 | `/api/interstitial-ads` |
| Push Notifications | 4 | `/api/push` |
| Admin | 42+ | `/api/admin` |
| Moderation | 3 | `/api/moderation` |
| Auth Settings | 2 | `/api/auth-settings` |
| Test | 1 | `/api/test` |
| Session Management | 8 | `/api/session` |
| System | 7 | `/api/system` |

**Total: 256+ Endpoints**

---

## 🔑 Authentication Notes

- **No Auth** - Public endpoint, no authentication required
- **Auth** - Requires JWT Bearer token: `Authorization: Bearer {token}`
- **Admin** - Requires authentication + admin role
- **Dev/Admin** - Development mode or admin role required

---

## 📚 Related Documentation

- **Complete Reference:** `ALL_API_ENDPOINTS_COMPLETE.md`
- **Enterprise Endpoints:** `ENTERPRISE_ENDPOINTS.md`
- **Quick Reference:** `API_ENDPOINTS_QUICK_REFERENCE.md`
- **Razorpay:** `RAZORPAY_API_LIST.md`

---

**Last Updated:** 2024-01-15


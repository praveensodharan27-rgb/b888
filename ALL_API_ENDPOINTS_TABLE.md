# Complete API Endpoints - Table Format

**Base URL:** `http://localhost:5000/api`

---

## 📊 Quick Stats
- **Total Endpoints:** 256+
- **Public Endpoints:** ~45
- **Authenticated Endpoints:** ~195
- **Admin Endpoints:** ~42

---

## 🔐 AUTHENTICATION (12 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login with email/phone + password |
| POST | `/api/auth/login-otp` | No | Login with OTP |
| POST | `/api/auth/send-otp` | No | Send OTP code |
| POST | `/api/auth/verify-otp` | No | Verify OTP and login |
| POST | `/api/auth/forgot-password` | No | Request password reset OTP |
| POST | `/api/auth/verify-reset-otp` | No | Verify reset password OTP |
| POST | `/api/auth/reset-password` | No | Reset password with OTP |
| POST | `/api/auth/refresh-token` | Yes | Refresh authentication token |
| POST | `/api/auth/change-password` | Yes | Change password |
| GET | `/api/auth/me` | Yes | Get current user info |
| GET | `/api/auth/google` | No | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | No | Google OAuth callback |
| GET | `/api/auth/facebook` | No | Initiate Facebook OAuth |
| GET | `/api/auth/facebook/callback` | No | Facebook OAuth callback |

---

## 👤 USER MANAGEMENT (20 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/user/public/:userId` | No | Get public user profile |
| GET | `/api/users/:id/public-profile` | No | Get public profile by ID |
| GET | `/api/user/profile` | Yes | Get own profile |
| GET | `/api/profile/stats` | Yes | Get user profile statistics |
| PUT | `/api/user/profile` | Yes | Update profile |
| PUT | `/api/user/avatar` | Yes | Upload/update avatar |
| PUT | `/api/user/password` | Yes | Change password |
| GET | `/api/user/free-ads-status` | Yes | Check free ads remaining |
| GET | `/api/user/ads` | Yes | Get user's ads |
| GET | `/api/user/favorites` | Yes | Get user's favorite ads |
| GET | `/api/user/notifications` | Yes | Get user notifications |
| PUT | `/api/user/notifications/:id/read` | Yes | Mark notification as read |
| POST | `/api/user/notifications/read` | Yes | Mark notification as read (POST) |
| PUT | `/api/user/notifications/read-all` | Yes | Mark all notifications as read |
| PUT | `/api/user/notification-settings` | Yes | Update notification settings |
| GET | `/api/user/orders` | Yes | Get user's orders |
| GET | `/api/user/orders/:orderId/invoice` | Yes | Get order invoice PDF |
| GET | `/api/user/activity-log` | Yes | Get user activity log |
| GET | `/api/user/recent-views` | Yes | Get recently viewed ads |
| POST | `/api/user/deactivate` | Yes | Deactivate account |
| POST | `/api/user/reactivate` | Yes | Reactivate account |
| DELETE | `/api/user/account` | Yes | Permanently delete account |
| POST | `/api/user/logout-all-devices` | Yes | Logout from all devices |
| GET | `/api/user/deactivation-status` | Yes | Check account deactivation status |

---

## 📦 ADS MANAGEMENT (22 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/ads` | No | Get all ads (with filters, pagination) |
| GET | `/api/ads/check-limit` | Yes | Check if user can post more ads |
| GET | `/api/ads/price-suggestion` | No | Get AI price suggestion |
| GET | `/api/ads/live-location` | No | Get ads by live location (lat/lng) |
| GET | `/api/ads/:id` | No | Get ad details |
| POST | `/api/ads` | Yes | Create new ad |
| PUT | `/api/ads/:id` | Yes | Update ad |
| DELETE | `/api/ads/:id` | Yes | Delete ad |
| POST | `/api/ads/:id/favorite` | Yes | Toggle favorite ad |
| GET | `/api/ads/:id/favorite` | Yes | Check if ad is favorited |
| POST | `/api/ads/:id/mark-sold` | Yes | Mark ad as sold |
| POST | `/api/ads/:id/mark-expired` | Yes | Mark ad as expired |
| POST | `/api/ads/:id/report` | Yes | Report inappropriate ad |
| POST | `/api/ads/draft` | Yes | Save ad as draft |
| GET | `/api/ads/drafts` | Yes | Get all drafts for current user |
| GET | `/api/ads/draft/:id` | Yes | Get a specific draft |
| PUT | `/api/ads/draft/:id` | Yes | Update a draft |
| POST | `/api/ads/draft/:id/publish` | Yes | Publish a draft |
| DELETE | `/api/ads/draft/:id` | Yes | Delete a draft |
| POST | `/api/ads/:id/renew` | Yes | Renew an expired ad |
| GET | `/api/ads/:id/renewal-history` | Yes | Get renewal history |
| GET | `/api/ads/:id/renewal-status` | Yes | Check renewal status |

---

## 🏷️ CATEGORIES (5 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/categories` | No | Get all categories with subcategories |
| GET | `/api/categories/:slug` | No | Get category by slug |
| GET | `/api/categories/:id/subcategories` | No | Get subcategories for category |
| GET | `/api/categories/:categorySlug/:subcategorySlug` | No | Get ads by category/subcategory |
| GET | `/api/categories/:categorySlug/:subcategorySlug/:productSlug` | No | Get single ad by slugs |

---

## 📍 LOCATIONS (2 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/locations` | No | Get all locations |
| GET | `/api/locations/:slug` | No | Get location by slug |

---

## 💳 PAYMENT GATEWAY (13 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/payment-gateway/status` | No | Get gateway status |
| POST | `/api/payment-gateway/order` | Yes | Create payment order |
| POST | `/api/payment-gateway/verify` | Yes | Verify payment |
| POST | `/api/payment-gateway/refund` | Yes | Process refund |
| POST | `/api/payment-gateway/cancel` | Yes | Cancel payment order |
| POST | `/api/payment-gateway/capture` | Yes | Capture authorized payment |
| GET | `/api/payment-gateway/order/:orderId` | Yes | Get order status |
| GET | `/api/payment-gateway/payments` | Yes | Get payment history |
| GET | `/api/payment-gateway/payment/:paymentId` | Yes | Get payment details |
| GET | `/api/payment-gateway/razorpay-order/:orderId` | Yes | Get Razorpay order details |
| POST | `/api/payment-gateway/webhook` | Public* | Razorpay webhook handler |
| POST | `/api/payment-gateway/reinitialize` | Admin | Reinitialize payment gateway |
| GET | `/api/payment-gateway/test-users` | Dev/Admin | Get test users |
| GET | `/api/payment-gateway/test-user/:userId` | Dev/Admin | Get test user info |

---

## ⭐ PREMIUM ADS (6 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/premium/offers` | No | Get premium ad options |
| POST | `/api/premium/order` | Yes | Purchase premium ad |
| POST | `/api/premium/verify` | Yes | Verify premium payment |
| GET | `/api/premium/orders` | Yes | Get premium orders |
| POST | `/api/premium/ad-posting/order` | Yes | Create ad posting order |
| POST | `/api/premium/ad-posting/verify` | Yes | Verify ad posting payment |

---

## 💼 BUSINESS PACKAGES (5 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/business-package/info` | No | Get available packages |
| GET | `/api/business-package/status` | Yes | Get user's package status |
| POST | `/api/business-package/order` | Yes | Create package order |
| POST | `/api/business-package/verify` | Yes | Verify package payment |
| GET | `/api/business-package/history` | Yes | Get package history |

---

## 🔍 SEARCH (3 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/search` | No | Search ads with filters |
| GET | `/api/search/autocomplete` | No | Get autocomplete suggestions |
| GET | `/api/search/trending` | No | Get trending searches |

---

## 🔔 SEARCH ALERTS (5 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/search-alerts` | Yes | Get user's search alerts |
| POST | `/api/search-alerts` | Yes | Create search alert |
| PUT | `/api/search-alerts/:id` | Yes | Update search alert |
| DELETE | `/api/search-alerts/:id` | Yes | Delete search alert |
| GET | `/api/search-alerts/:id/matches` | Yes | Get alert matches |

---

## 💬 CHAT (11 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/chat/room` | Yes | Create/get chat room |
| GET | `/api/chat/rooms` | Yes | Get user's chat rooms |
| GET | `/api/chat/rooms/:roomId/messages` | Yes | Get chat messages |
| GET | `/api/chat/unread-count` | Yes | Get unread message count |
| POST | `/api/chat/block/:userId` | Yes | Block user in chat |
| GET | `/api/chat/online-users` | Yes | Get online users |
| POST | `/api/chat/messages/:messageId/read` | Yes | Mark message as read |
| POST | `/api/chat/rooms/:roomId/read-all` | Yes | Mark all messages in room as read |
| GET | `/api/chat/messages/:messageId/read-receipts` | Yes | Get read receipts for message |
| POST | `/api/chat/messages/read-status` | Yes | Get read status for multiple messages |
| GET | `/api/chat/rooms/unread-counts` | Yes | Get unread count per room |

---

## 👥 FOLLOW (6 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/follow/:userId` | Yes | Follow a user |
| DELETE | `/api/follow/:userId` | Yes | Unfollow a user |
| GET | `/api/follow/check/:userId` | Yes | Check follow status |
| GET | `/api/follow/followers/:userId` | No | Get user's followers |
| GET | `/api/follow/following/:userId` | No | Get users being followed |
| GET | `/api/follow/stats/:userId` | No | Get follow statistics |

---

## 🚫 BLOCK (4 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/block/:userId` | Yes | Block a user |
| DELETE | `/api/block/:userId` | Yes | Unblock a user |
| GET | `/api/block/check/:userId` | Yes | Check block status |
| GET | `/api/block/list` | Yes | Get blocked users list |

---

## 📞 CONTACT REQUESTS (5 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/contact-request` | Yes | Request contact info |
| GET | `/api/contact-request/check/:userId` | Yes | Check contact request status |
| GET | `/api/contact-request/pending` | Yes | Get pending requests |
| POST | `/api/contact-request/:requestId/approve` | Yes | Approve contact request |
| POST | `/api/contact-request/:requestId/reject` | Yes | Reject contact request |

---

## 💰 WALLET (8 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/wallet/balance` | Yes | Get wallet balance |
| GET | `/api/wallet/transactions` | Yes | Get transaction history |
| POST | `/api/wallet/add` | Yes | Add money to wallet |
| POST | `/api/wallet/withdraw` | Yes | Withdraw from wallet |
| POST | `/api/wallet/transfer` | Yes | Transfer funds to another user |
| GET | `/api/wallet/statement` | Yes | Get wallet statement with filters |
| GET | `/api/wallet/statement/download` | Yes | Download statement as PDF (placeholder) |

---

## 🎁 REFERRAL (4 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/referral/code` | Yes | Get referral code |
| GET | `/api/referral/stats` | Yes | Get referral statistics |
| GET | `/api/referral/history` | Yes | Get referral history |
| POST | `/api/referral/claim` | Yes | Claim referral reward |

---

## 🧠 AI SERVICES (4 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ai/generate-description` | Yes | Generate ad description |
| POST | `/api/ai/ad-description` | Yes | Generate ad description (alternative) |
| POST | `/api/ai/ad-price-suggestion` | Yes | Get AI price suggestion |
| POST | `/api/ai/image-moderation` | Yes | Moderate image content |

---

## 📍 GEOCODING (3 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/geocoding/geocode` | No | Convert address to coordinates |
| POST | `/api/geocoding/reverse` | No | Convert coordinates to address |
| GET | `/api/geocoding/suggestions` | No | Get location suggestions |

---

## 🎨 BANNERS (2 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/banners` | No | Get active banners |
| GET | `/api/banners/:position` | No | Get banners by position |

---

## 📱 INTERSTITIAL ADS (3 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/interstitial-ads` | No | Get interstitial ads |
| POST | `/api/interstitial-ads/:id/view` | No | Track ad view |
| POST | `/api/interstitial-ads/:id/click` | No | Track ad click |

---

## 🔔 PUSH NOTIFICATIONS (4 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/push/subscriptions` | Yes | Get push subscriptions |
| POST | `/api/push/subscribe` | Yes | Subscribe to push notifications |
| DELETE | `/api/push/unsubscribe` | Yes | Unsubscribe from push |
| POST | `/api/push/send` | Admin | Send push notification |

---

## 🛠️ ADMIN (42+ endpoints)

### Dashboard & Stats
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/dashboard` | Admin | Get dashboard statistics |
| GET | `/api/admin/analytics` | Admin | Get analytics data |
| GET | `/api/admin/recent-activity` | Admin | Get recent activity |

### Users Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/users` | Admin | Get users list |
| PUT | `/api/admin/users/:id/role` | Admin | Update user role |
| POST | `/api/admin/users/:id/block` | Admin | Block user |
| POST | `/api/admin/users/:id/unblock` | Admin | Unblock user |

### Ads Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/ads` | Admin | Get ads list |
| GET | `/api/admin/ads/flagged` | Admin | Get flagged ads |
| PUT | `/api/admin/ads/:id/status` | Admin | Update ad status |
| POST | `/api/admin/ads/:id/approve` | Admin | Approve ad |
| POST | `/api/admin/ads/:id/reject` | Admin | Reject ad |

### Categories Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/categories` | Admin | Get categories |
| POST | `/api/admin/categories` | Admin | Create category |
| PUT | `/api/admin/categories/:id` | Admin | Update category |
| DELETE | `/api/admin/categories/:id` | Admin | Delete category |

### Locations Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/locations` | Admin | Get locations |
| POST | `/api/admin/locations` | Admin | Create location |
| PUT | `/api/admin/locations/:id` | Admin | Update location |
| DELETE | `/api/admin/locations/:id` | Admin | Delete location |

### Banners Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/banners` | Admin | Get banners |
| POST | `/api/admin/banners` | Admin | Create banner |
| PUT | `/api/admin/banners/:id` | Admin | Update banner |
| DELETE | `/api/admin/banners/:id` | Admin | Delete banner |

### Interstitial Ads Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/interstitial-ads` | Admin | Get interstitial ads |
| POST | `/api/admin/interstitial-ads` | Admin | Create interstitial ad |
| PUT | `/api/admin/interstitial-ads/:id` | Admin | Update interstitial ad |
| DELETE | `/api/admin/interstitial-ads/:id` | Admin | Delete interstitial ad |

### Premium Settings
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/premium/settings` | Admin | Get premium settings |
| PUT | `/api/admin/premium/settings` | Admin | Update premium settings |
| GET | `/api/admin/premium/ads` | Admin | Get all premium ads |

### Business Packages Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/business-packages` | Admin | Get business packages |
| POST | `/api/admin/business-packages` | Admin | Create business package |
| PUT | `/api/admin/business-packages/:id` | Admin | Update business package |
| GET | `/api/admin/business-packages/orders` | Admin | Get business package orders |

### System Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/analytics` | Admin | Get analytics |
| GET | `/api/admin/audit-logs` | Admin | Get audit logs |
| GET | `/api/admin/roles` | Admin | Get available roles |
| POST | `/api/admin/roles` | Admin | Create/update role |

### Feature Flags
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/feature-flags` | Admin | Get all feature flags |
| GET | `/api/admin/feature-flags/:flagName` | Admin | Get specific feature flag |
| POST | `/api/admin/feature-flags/:flagName` | Admin | Create/update feature flag |
| PATCH | `/api/admin/feature-flags/:flagName/toggle` | Admin | Toggle feature flag |
| DELETE | `/api/admin/feature-flags/:flagName` | Admin | Delete feature flag |
| POST | `/api/admin/feature-flags/bulk` | Admin | Bulk update feature flags |
| GET | `/api/admin/feature-flags/:flagName/stats` | Admin | Get feature flag statistics |

---

## 🔍 MODERATION (3 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/moderation/queue` | Admin/Mod | Get moderation queue |
| POST | `/api/moderation/ads/:id` | Admin/Mod | Moderate ad |
| GET | `/api/moderation/stats` | Admin/Mod | Get moderation stats |

---

## ⚙️ AUTH SETTINGS (2 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/auth-settings/:page` | No | Get auth page settings |
| PUT | `/api/auth-settings/:page` | Admin | Update auth page settings |

---

## 🧪 TEST (1 endpoint)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/test/email` | Admin | Send test email |

---

## 🔐 SESSION MANAGEMENT (8 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/session` | Yes | Get all active sessions |
| GET | `/api/session/current` | Yes | Get current session details |
| DELETE | `/api/session/:sessionId` | Yes | Revoke a specific session |
| DELETE | `/api/session/others` | Yes | Revoke all other sessions |
| DELETE | `/api/session/all` | Yes | Revoke all sessions |
| PATCH | `/api/session/:sessionId/activity` | Yes | Update session activity |
| GET | `/api/session/stats` | Yes | Get session statistics |
| GET | `/api/session/admin/user/:userId` | Admin | Get sessions for user |

---

## 🧱 SYSTEM (7 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Health check |
| GET | `/api/health` | No | Health check (API version) |
| GET | `/api/rate-limit/status` | No | Get rate limit status |
| GET | `/api/system/version` | No | Get system version information |
| GET | `/api/system/info` | Admin | Get detailed system information |
| GET | `/api/system/health` | No | Get system health check |
| GET | `/api/system/status` | No | Get API status |
| GET | `/api/system/metrics` | Admin | Get system metrics |

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

## 🔑 Authentication

- **No Auth** - Public endpoint, no authentication required
- **Yes** - Requires JWT Bearer token: `Authorization: Bearer {token}`
- **Admin** - Requires authentication + admin role
- **Dev/Admin** - Development mode or admin role required

---

## 📚 Related Documentation

- **Complete List:** `ALL_ENDPOINTS_LIST.md`
- **Complete Reference:** `ALL_API_ENDPOINTS_COMPLETE.md`
- **Socket.IO & Payment:** `SOCKET_IO_PAYMENT_ALL_ENDPOINTS.md`
- **Enterprise Endpoints:** `ENTERPRISE_ENDPOINTS.md`
- **Quick Reference:** `API_ENDPOINTS_QUICK_REFERENCE.md`

---

**Last Updated:** 2024-01-15


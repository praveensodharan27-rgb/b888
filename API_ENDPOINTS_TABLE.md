# All API Endpoints - Complete Table
## Quick Reference Guide

**Base URL:** `http://localhost:5000/api`

---

## 🔐 AUTHENTICATION

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login with email/phone + password |
| POST | `/api/auth/login-otp` | ❌ | Login with OTP |
| POST | `/api/auth/send-otp` | ❌ | Send OTP code |
| POST | `/api/auth/verify-otp` | ❌ | Verify OTP |
| POST | `/api/auth/forgot-password` | ❌ | Request password reset |
| POST | `/api/auth/verify-reset-otp` | ❌ | Verify reset OTP |
| POST | `/api/auth/reset-password` | ❌ | Reset password |
| POST | `/api/auth/refresh-token` | ✅ | Refresh token |
| POST | `/api/auth/change-password` | ✅ | Change password |
| GET | `/api/auth/me` | ✅ | Get current user |
| GET | `/api/auth/google` | ❌ | Google OAuth |
| GET | `/api/auth/google/callback` | ❌ | Google callback |
| GET | `/api/auth/facebook` | ❌ | Facebook OAuth |
| GET | `/api/auth/facebook/callback` | ❌ | Facebook callback |

---

## 👤 USER MANAGEMENT

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/user/public/:userId` | ❌ | Public profile |
| GET | `/api/users/:id/public-profile` | ❌ | Public profile (alt) |
| GET | `/api/user/profile` | ✅ | Get own profile |
| GET | `/api/profile/stats` | ✅ | Profile statistics |
| PUT | `/api/user/profile` | ✅ | Update profile |
| PUT | `/api/user/avatar` | ✅ | Update avatar |
| PUT | `/api/user/password` | ✅ | Change password |
| GET | `/api/user/free-ads-status` | ✅ | Free ads remaining |
| GET | `/api/user/ads` | ✅ | User's ads |
| GET | `/api/user/favorites` | ✅ | User's favorites |
| GET | `/api/user/notifications` | ✅ | Get notifications |
| POST | `/api/user/notifications/read` | ✅ | Mark read (POST) |
| PUT | `/api/user/notifications/:id/read` | ✅ | Mark read (PUT) |
| PUT | `/api/user/notifications/read-all` | ✅ | Mark all read |
| PUT | `/api/user/notification-settings` | ✅ | Update settings |
| GET | `/api/user/orders` | ✅ | Get orders |
| GET | `/api/user/orders/:orderId/invoice` | ✅ | Get invoice |
| GET | `/api/user/activity-log` | ✅ | Activity log |
| GET | `/api/user/recent-views` | ✅ | Recent views |
| POST | `/api/user/deactivate` | ✅ | Deactivate account |
| POST | `/api/user/reactivate` | ✅ | Reactivate account |
| DELETE | `/api/user/account` | ✅ | Delete account |
| POST | `/api/user/logout-all-devices` | ✅ | Logout all devices |
| GET | `/api/user/deactivation-status` | ✅ | Deactivation status |

---

## 📦 ADS

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/ads` | ❌ | Get all ads |
| GET | `/api/ads/check-limit` | ✅ | Check ad limit |
| GET | `/api/ads/price-suggestion` | ❌ | Price suggestion |
| GET | `/api/ads/live-location` | ❌ | Ads by location |
| GET | `/api/ads/:id` | ❌ | Get ad details |
| POST | `/api/ads` | ✅ | Create ad |
| PUT | `/api/ads/:id` | ✅ | Update ad |
| DELETE | `/api/ads/:id` | ✅ | Delete ad |
| POST | `/api/ads/:id/favorite` | ✅ | Toggle favorite |
| GET | `/api/ads/:id/favorite` | ✅ | Check favorite |
| POST | `/api/ads/:id/mark-sold` | ✅ | Mark as sold |
| POST | `/api/ads/:id/mark-expired` | ✅ | Mark as expired |
| POST | `/api/ads/:id/report` | ✅ | Report ad |

---

## 🏷️ CATEGORIES

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/categories` | ❌ | Get all categories |
| GET | `/api/categories/:slug` | ❌ | Get category |
| GET | `/api/categories/:id/subcategories` | ❌ | Get subcategories |
| GET | `/api/categories/:catSlug/:subSlug` | ❌ | Category ads |
| GET | `/api/categories/:catSlug/:subSlug/:prodSlug` | ❌ | Single ad |

---

## 📍 LOCATIONS

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/locations` | ❌ | Get all locations |
| GET | `/api/locations/:slug` | ❌ | Get location |

---

## 💳 PAYMENT GATEWAY

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/payment-gateway/status` | ❌ | Gateway status |
| POST | `/api/payment-gateway/order` | ✅ | Create order |
| POST | `/api/payment-gateway/verify` | ✅ | Verify payment |
| POST | `/api/payment-gateway/refund` | ✅ | Process refund |
| POST | `/api/payment-gateway/cancel` | ✅ | Cancel order |
| POST | `/api/payment-gateway/capture` | ✅ | Capture payment |
| GET | `/api/payment-gateway/order/:orderId` | ✅ | Get order status |
| GET | `/api/payment-gateway/payments` | ✅ | Payment history |
| GET | `/api/payment-gateway/payment/:paymentId` | ✅ | Payment details |
| GET | `/api/payment-gateway/razorpay-order/:orderId` | ✅ | Razorpay order |
| POST | `/api/payment-gateway/webhook` | ❌ | Webhook handler |
| POST | `/api/payment-gateway/reinitialize` | 🔐 Admin | Reinitialize |
| GET | `/api/payment-gateway/test-users` | ✅ | Test users |
| GET | `/api/payment-gateway/test-user/:userId` | ✅ | Test user info |

---

## ⭐ PREMIUM ADS

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/premium/offers` | ❌ | Premium offers |
| POST | `/api/premium/order` | ✅ | Purchase premium |
| POST | `/api/premium/verify` | ✅ | Verify payment |
| GET | `/api/premium/orders` | ✅ | Premium orders |
| POST | `/api/premium/ad-posting/order` | ✅ | Ad posting order |
| POST | `/api/premium/ad-posting/verify` | ✅ | Verify ad posting |

---

## 💼 BUSINESS PACKAGES

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/business-package/info` | ❌ | Package info |
| GET | `/api/business-package/status` | ✅ | User status |
| POST | `/api/business-package/order` | ✅ | Create order |
| POST | `/api/business-package/verify` | ✅ | Verify payment |
| GET | `/api/business-package/history` | ✅ | Purchase history |

---

## 🔍 SEARCH

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/search` | ❌ | Search ads |
| GET | `/api/search/autocomplete` | ❌ | Autocomplete |
| GET | `/api/search/trending` | ❌ | Trending searches |

---

## 🔔 SEARCH ALERTS

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/search-alerts` | ✅ | Get alerts |
| POST | `/api/search-alerts` | ✅ | Create alert |
| PUT | `/api/search-alerts/:id` | ✅ | Update alert |
| DELETE | `/api/search-alerts/:id` | ✅ | Delete alert |
| GET | `/api/search-alerts/:id/matches` | ✅ | Get matches |

---

## 💬 CHAT

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/chat/room` | ✅ | Create/get room |
| GET | `/api/chat/rooms` | ✅ | Get rooms |
| GET | `/api/chat/rooms/:roomId/messages` | ✅ | Get messages |
| GET | `/api/chat/unread-count` | ✅ | Unread count |
| POST | `/api/chat/block/:userId` | ✅ | Block user |
| GET | `/api/chat/online-users` | ✅ | Online users |

---

## 👥 FOLLOW

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/follow/:userId` | ✅ | Follow user |
| DELETE | `/api/follow/:userId` | ✅ | Unfollow |
| GET | `/api/follow/check/:userId` | ✅ | Check status |
| GET | `/api/follow/followers/:userId` | ❌ | Get followers |
| GET | `/api/follow/following/:userId` | ❌ | Get following |
| GET | `/api/follow/stats/:userId` | ❌ | Get stats |

---

## 🚫 BLOCK

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/block/:userId` | ✅ | Block user |
| DELETE | `/api/block/:userId` | ✅ | Unblock |
| GET | `/api/block/check/:userId` | ✅ | Check status |
| GET | `/api/block/list` | ✅ | Blocked list |

---

## 📞 CONTACT REQUESTS

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/contact-request` | ✅ | Request contact |
| GET | `/api/contact-request/check/:userId` | ✅ | Check status |
| GET | `/api/contact-request/pending` | ✅ | Pending requests |
| POST | `/api/contact-request/:requestId/approve` | ✅ | Approve |
| POST | `/api/contact-request/:requestId/reject` | ✅ | Reject |

---

## 💰 WALLET

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/wallet/balance` | ✅ | Get balance |
| GET | `/api/wallet/transactions` | ✅ | Transactions |
| POST | `/api/wallet/add` | ✅ | Add money |
| POST | `/api/wallet/withdraw` | ✅ | Withdraw |
| POST | `/api/wallet/transfer` | ✅ | Transfer |

---

## 🎁 REFERRAL

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/referral/my-referral` | ✅ | Get referral code |
| GET | `/api/referral/history` | ✅ | Referral history |

---

## 🧠 AI SERVICES

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ai/generate-description` | ✅ | Generate description |
| POST | `/api/ai/ad-description` | ✅ | Ad description (alt) |
| POST | `/api/ai/ad-price-suggestion` | ❌ | Price suggestion |
| POST | `/api/ai/image-moderation` | ✅ | Moderate image |

---

## 📍 GEOCODING

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/geocoding/detect-location` | ✅ | Detect location |
| POST | `/api/geocoding/geocode-address` | ✅ | Geocode address |

---

## 🎨 BANNERS

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/banners` | ❌ | Get banners |
| POST | `/api/banners/:id/click` | ❌ | Track click |

---

## 📱 INTERSTITIAL ADS

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/interstitial-ads` | ❌ | Get ads |
| POST | `/api/interstitial-ads/:id/view` | ❌ | Track view |
| POST | `/api/interstitial-ads/:id/click` | ❌ | Track click |

---

## 🔔 PUSH NOTIFICATIONS

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/push/vapid-key` | ❌ | Get VAPID key |
| POST | `/api/push/subscribe` | ✅ | Subscribe |
| POST | `/api/push/unsubscribe` | ✅ | Unsubscribe |

---

## 🛠️ ADMIN

### Dashboard
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/dashboard` | 🔐 | Dashboard stats |
| GET | `/api/admin/analytics` | 🔐 | Analytics |
| GET | `/api/admin/recent-activity` | 🔐 | Recent activity |
| GET | `/api/admin/active-users` | 🔐 | Active users |

### Users
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/users` | 🔐 | Users list |
| PUT | `/api/admin/users/:id/role` | 🔐 | Update role |
| POST | `/api/admin/users/:id/block` | 🔐 | Block user |
| POST | `/api/admin/users/:id/unblock` | 🔐 | Unblock user |

### Ads
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/ads` | 🔐 | Ads list |
| GET | `/api/admin/ads/flagged` | 🔐 | Flagged ads |
| PUT | `/api/admin/ads/:id/status` | 🔐 | Update status |

### Categories
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/categories` | 🔐 | Categories |
| POST | `/api/admin/categories` | 🔐 | Create |
| PUT | `/api/admin/categories/:id` | 🔐 | Update |
| DELETE | `/api/admin/categories/:id` | 🔐 | Delete |

### Locations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/locations` | 🔐 | Locations |
| POST | `/api/admin/locations` | 🔐 | Create |
| PUT | `/api/admin/locations/:id` | 🔐 | Update |
| DELETE | `/api/admin/locations/:id` | 🔐 | Delete |

### Banners
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/banners` | 🔐 | Banners |
| POST | `/api/admin/banners` | 🔐 | Create |
| PUT | `/api/admin/banners/:id` | 🔐 | Update |
| DELETE | `/api/admin/banners/:id` | 🔐 | Delete |

### Interstitial Ads
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/interstitial-ads` | 🔐 | Interstitial ads |
| POST | `/api/admin/interstitial-ads` | 🔐 | Create |
| PUT | `/api/admin/interstitial-ads/:id` | 🔐 | Update |
| DELETE | `/api/admin/interstitial-ads/:id` | 🔐 | Delete |

### Premium
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/premium/settings` | 🔐 | Premium settings |
| PUT | `/api/admin/premium/settings` | 🔐 | Update settings |
| GET | `/api/admin/premium/premium-ads` | 🔐 | Premium ads |
| POST | `/api/admin/premium/ads/:id/make-top` | 🔐 | Make top |
| POST | `/api/admin/premium/ads/:id/make-featured` | 🔐 | Make featured |
| POST | `/api/admin/premium/ads/:id/bump` | 🔐 | Bump ad |
| POST | `/api/admin/premium/ads/:id/make-urgent` | 🔐 | Make urgent |
| POST | `/api/admin/premium/ads/:id/remove-premium` | 🔐 | Remove premium |

### Business Packages
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/premium/business-packages` | 🔐 | Packages |
| PUT | `/api/admin/premium/business-packages` | 🔐 | Update |
| GET | `/api/admin/premium/business-packages/orders` | 🔐 | Orders |

### System
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/roles` | 🔐 | Get roles |
| POST | `/api/admin/roles` | 🔐 | Create role |
| GET | `/api/admin/audit-logs` | 🔐 | Audit logs |

---

## 🔍 MODERATION

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/moderation/statistics` | 🔐 | Moderation stats |
| GET | `/api/moderation/flagged-ads` | 🔐 | Flagged ads |
| POST | `/api/moderation/ads/:id/remoderate` | 🔐 | Remoderate |
| GET | `/api/moderation/settings` | 🔐 | Settings |

---

## ⚙️ AUTH SETTINGS

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/auth-settings/:page` | ❌ | Get settings |
| PUT | `/api/auth-settings/:page` | 🔐 | Update settings |
| POST | `/api/auth-settings/upload-image` | 🔐 | Upload image |

---

## 🧪 TEST

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/test/test-email` | 🔐 | Send test email |

---

## 🧱 SYSTEM

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | ❌ | Health check |
| GET | `/api/health` | ❌ | Health check (API) |
| GET | `/api/rate-limit/status` | ❌ | Rate limit status |

---

## 📊 Legend

- ❌ = Public (No Auth)
- ✅ = Authenticated (User)
- 🔐 = Admin Only

---

## 📈 Total Count

- **Total Endpoints:** 220+
- **Public:** ~42
- **Authenticated:** ~178
- **Admin:** ~35

---

**Complete documentation available in:**
- `ALL_API_ENDPOINTS_COMPLETE.md` - Full details
- `COMPLETE_API_ENDPOINTS_A_TO_Z.md` - A-Z organized
- `API_ENDPOINTS_QUICK_REFERENCE.md` - Quick lookup


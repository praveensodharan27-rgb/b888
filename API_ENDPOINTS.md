# Complete API Endpoints Reference

**Base URL:** `http://localhost:5000/api`

**Authentication:** Most endpoints require JWT token in header: `Authorization: Bearer {token}`

---

## 🔐 Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new user (email/phone/password) |
| POST | `/api/auth/send-otp` | No | Send OTP to phone/email |
| POST | `/api/auth/verify-otp` | No | Verify OTP code |
| POST | `/api/auth/login` | No | Login with email/phone and password |
| POST | `/api/auth/login-otp` | No | Login with OTP |
| POST | `/api/auth/forgot-password` | No | Request password reset OTP |
| POST | `/api/auth/verify-reset-otp` | No | Verify reset password OTP |
| POST | `/api/auth/reset-password` | No | Reset password with OTP |
| GET | `/api/auth/me` | Yes | Get current user info |

### OAuth (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/auth/google` | No | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | No | Google OAuth callback |
| GET | `/api/auth/facebook` | No | Initiate Facebook OAuth |
| GET | `/api/auth/facebook/callback` | No | Facebook OAuth callback |

---

## 👤 User (`/api/user`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/user/public/:userId` | No | Get public user profile |
| GET | `/api/user/profile` | Yes | Get own profile |
| PUT | `/api/user/profile` | Yes | Update profile (name, email, phone, bio, locationId) |
| PUT | `/api/user/avatar` | Yes | Upload/update avatar |
| PUT | `/api/user/password` | Yes | Change password |
| GET | `/api/user/free-ads-status` | Yes | Check free ads remaining |
| GET | `/api/user/ads` | Yes | Get user's ads |
| GET | `/api/user/favorites` | Yes | Get user's favorite ads |
| GET | `/api/user/notifications` | Yes | Get user notifications |
| PUT | `/api/user/notifications/:id/read` | Yes | Mark notification as read |
| PUT | `/api/user/notifications/read-all` | Yes | Mark all notifications as read |
| GET | `/api/user/orders` | Yes | Get user's orders |
| GET | `/api/user/orders/:orderId/invoice` | Yes | Get order invoice PDF |
| POST | `/api/user/deactivate` | Yes | Deactivate account |
| POST | `/api/user/reactivate` | Yes | Reactivate account |
| POST | `/api/user/logout-all-devices` | Yes | Logout from all devices |
| GET | `/api/user/deactivation-status` | Yes | Check account deactivation status |

---

## 📦 Ads (`/api/ads`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/ads` | No | Get all ads (with filters, search, pagination) |
| GET | `/api/ads/check-limit` | Yes | Check if user can post more ads |
| GET | `/api/ads/price-suggestion` | No | Get AI price suggestion |
| GET | `/api/ads/live-location` | No | Get ads by live location (lat/lng) |
| GET | `/api/ads/:id` | No | Get ad details |
| POST | `/api/ads` | Yes | Create new ad |
| PUT | `/api/ads/:id` | Yes | Update ad |
| DELETE | `/api/ads/:id` | Yes | Delete ad |
| POST | `/api/ads/:id/favorite` | Yes | Toggle favorite ad |
| GET | `/api/ads/:id/favorite` | Yes | Check if ad is favorited |

**Query Parameters for GET `/api/ads`:**
- `page` - Page number
- `limit` - Items per page
- `category` - Category slug
- `subcategory` - Subcategory slug
- `location` - Location slug
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `search` - Search query
- `condition` - NEW, USED, LIKE_NEW, REFURBISHED
- `sort` - newest, oldest, price_low, price_high, featured, bumped
- `latitude` - Latitude for location-based search
- `longitude` - Longitude for location-based search
- `radius` - Radius in kilometers

---

## 🏷️ Categories (`/api/categories`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/categories` | No | Get all categories |
| GET | `/api/categories/:slug` | No | Get category by slug |
| GET | `/api/categories/:id/subcategories` | No | Get subcategories for category |

---

## 📍 Locations (`/api/locations`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/locations` | No | Get all locations |
| GET | `/api/locations/:slug` | No | Get location by slug |

---

## 💬 Chat (`/api/chat`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/chat/room` | Yes | Create chat room |
| GET | `/api/chat/rooms` | Yes | Get user's chat rooms |
| GET | `/api/chat/rooms/:roomId/messages` | Yes | Get messages in room |
| GET | `/api/chat/online-users` | Yes | Get online users |

---

## 👥 Follow (`/api/follow`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/follow/:userId` | Yes | Follow user |
| DELETE | `/api/follow/:userId` | Yes | Unfollow user |
| GET | `/api/follow/check/:userId` | Yes | Check if following user |
| GET | `/api/follow/followers/:userId` | No | Get user's followers |
| GET | `/api/follow/following/:userId` | No | Get users being followed |
| GET | `/api/follow/stats/:userId` | No | Get follow statistics |

---

## 🚫 Block (`/api/block`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/block/:userId` | Yes | Block user |
| DELETE | `/api/block/:userId` | Yes | Unblock user |
| GET | `/api/block/check/:userId` | Yes | Check if user is blocked |
| GET | `/api/block/list` | Yes | Get blocked users list |

---

## 📞 Contact Request (`/api/contact-request`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/contact-request` | Yes | Send contact request |
| GET | `/api/contact-request/check/:userId` | Yes | Check contact request status |
| GET | `/api/contact-request/pending` | Yes | Get pending contact requests |
| POST | `/api/contact-request/:requestId/approve` | Yes | Approve contact request |
| POST | `/api/contact-request/:requestId/reject` | Yes | Reject contact request |

---

## 💎 Premium (`/api/premium`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/premium/offers` | No | Get premium offers |
| POST | `/api/premium/order` | Yes | Create premium order |
| POST | `/api/premium/verify` | Yes | Verify premium payment |
| GET | `/api/premium/orders` | Yes | Get user's premium orders |
| POST | `/api/premium/ad-posting/order` | Yes | Create ad posting order |
| POST | `/api/premium/ad-posting/verify` | Yes | Verify ad posting payment |
| GET | `/api/premium/test-razorpay` | No | Test Razorpay connection |

---

## 🏢 Business Package (`/api/business-package`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/business-package/info` | No | Get business package info |
| GET | `/api/business-package/status` | Yes | Get user's business package status |
| POST | `/api/business-package/order` | Yes | Create business package order |
| POST | `/api/business-package/verify` | Yes | Verify business package payment |
| GET | `/api/business-package/orders` | Yes | Get business package orders |
| POST | `/api/business-package/extra-slots/order` | Yes | Order extra ad slots |
| POST | `/api/business-package/extra-slots/verify` | Yes | Verify extra slots payment |

---

## 💰 Wallet (`/api/wallet`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/wallet/balance` | Yes | Get wallet balance |
| GET | `/api/wallet/transactions` | Yes | Get wallet transactions |

---

## 🎁 Referral (`/api/referral`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/referral/my-referral` | Yes | Get referral code and stats |
| GET | `/api/referral/history` | Yes | Get referral history |

---

## 🔔 Push Notifications (`/api/push`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/push/vapid-key` | No | Get VAPID public key |
| POST | `/api/push/subscribe` | Yes | Subscribe to push notifications |
| POST | `/api/push/unsubscribe` | Yes | Unsubscribe from push notifications |

---

## 🔍 Search (`/api/search`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/search` | No | Search ads (Meilisearch) |
| GET | `/api/search/autocomplete` | No | Search autocomplete suggestions |

---

## 📧 Search Alerts (`/api/search-alerts`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/search-alerts/settings` | Yes (Admin) | Get search alert settings |
| PUT | `/api/search-alerts/settings` | Yes (Admin) | Update search alert settings |
| GET | `/api/search-alerts/statistics` | Yes (Admin) | Get search alert statistics |
| GET | `/api/search-alerts/queries` | Yes (Admin) | Get search alert queries |
| DELETE | `/api/search-alerts/queries/cleanup` | Yes (Admin) | Cleanup old queries |
| POST | `/api/search-alerts/test-email` | Yes (Admin) | Test search alert email |

---

## 🤖 AI (`/api/ai`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ai/generate-description` | Yes | Generate ad description using AI |

---

## 🗺️ Geocoding (`/api/geocoding`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/geocoding/detect-location` | Yes | Detect location from coordinates |
| POST | `/api/geocoding/geocode-address` | Yes | Geocode address to coordinates |

---

## 🎨 Banners (`/api/banners`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/banners` | No | Get active banners |
| POST | `/api/banners/:id/click` | No | Track banner click |

---

## 📱 Interstitial Ads (`/api/interstitial-ads`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/interstitial-ads` | No | Get active interstitial ads |
| POST | `/api/interstitial-ads/:id/view` | No | Track ad view |
| POST | `/api/interstitial-ads/:id/click` | No | Track ad click |

---

## ⚙️ Auth Settings (`/api/auth-settings`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/auth-settings/:page` | No | Get auth settings page content |
| PUT | `/api/auth-settings/:page` | Yes (Admin) | Update auth settings page |
| POST | `/api/auth-settings/upload-image` | Yes (Admin) | Upload image for auth pages |

---

## 🛡️ Moderation (`/api/moderation`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/moderation/statistics` | Yes (Admin) | Get moderation statistics |
| GET | `/api/moderation/flagged-ads` | Yes (Admin) | Get flagged ads |
| POST | `/api/moderation/ads/:id/remoderate` | Yes (Admin) | Remoderate ad |
| GET | `/api/moderation/settings` | Yes (Admin) | Get moderation settings |

---

## 👨‍💼 Admin (`/api/admin`)

### Dashboard
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/dashboard` | Yes (Admin) | Get admin dashboard stats |
| GET | `/api/admin/recent-activity` | Yes (Admin) | Get recent activity |
| GET | `/api/admin/active-users` | Yes (Admin) | Get active users |

### Ads Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/ads` | Yes (Admin) | Get all ads (admin view) |
| GET | `/api/admin/ads/flagged` | Yes (Admin) | Get flagged ads |
| PUT | `/api/admin/ads/:id/status` | Yes (Admin) | Update ad status (APPROVE/REJECT) |

### Users Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/users` | Yes (Admin) | Get all users |
| PUT | `/api/admin/users/:id/role` | Yes (Admin) | Update user role |
| POST | `/api/admin/users/:id/block` | Yes (Admin) | Block user |
| POST | `/api/admin/users/:id/unblock` | Yes (Admin) | Unblock user |

### Banners Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/banners` | Yes (Admin) | Get all banners |
| POST | `/api/admin/banners` | Yes (Admin) | Create banner |
| PUT | `/api/admin/banners/:id` | Yes (Admin) | Update banner |
| DELETE | `/api/admin/banners/:id` | Yes (Admin) | Delete banner |

### Interstitial Ads Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/interstitial-ads` | Yes (Admin) | Get all interstitial ads |
| POST | `/api/admin/interstitial-ads` | Yes (Admin) | Create interstitial ad |
| PUT | `/api/admin/interstitial-ads/:id` | Yes (Admin) | Update interstitial ad |
| DELETE | `/api/admin/interstitial-ads/:id` | Yes (Admin) | Delete interstitial ad |

### Categories Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/categories` | Yes (Admin) | Get all categories |
| POST | `/api/admin/categories` | Yes (Admin) | Create category |
| PUT | `/api/admin/categories/:id` | Yes (Admin) | Update category |
| PUT | `/api/admin/categories/pricing/bulk` | Yes (Admin) | Bulk update category pricing |
| DELETE | `/api/admin/categories/:id` | Yes (Admin) | Delete category |

### Subcategories Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/subcategories` | Yes (Admin) | Get all subcategories |
| POST | `/api/admin/subcategories` | Yes (Admin) | Create subcategory |
| PUT | `/api/admin/subcategories/:id` | Yes (Admin) | Update subcategory |
| DELETE | `/api/admin/subcategories/:id` | Yes (Admin) | Delete subcategory |

### Locations Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/locations` | Yes (Admin) | Get all locations |
| GET | `/api/admin/locations/:id` | Yes (Admin) | Get location by ID |
| POST | `/api/admin/locations` | Yes (Admin) | Create location |
| PUT | `/api/admin/locations/:id` | Yes (Admin) | Update location |
| POST | `/api/admin/locations/:id/update-from-geocoding` | Yes (Admin) | Update location from geocoding |
| POST | `/api/admin/locations/bulk-update-geocoding` | Yes (Admin) | Bulk update locations geocoding |
| DELETE | `/api/admin/locations/:id` | Yes (Admin) | Delete location |

### Orders Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/orders` | Yes (Admin) | Get all orders |

---

## 💎 Admin Premium (`/api/admin/premium`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/premium/settings` | Yes (Admin) | Get premium settings |
| PUT | `/api/admin/premium/settings` | Yes (Admin) | Update premium settings |
| GET | `/api/admin/premium/premium-ads` | Yes (Admin) | Get premium ads |
| POST | `/api/admin/premium/ads/:id/make-top` | Yes (Admin) | Make ad top |
| POST | `/api/admin/premium/ads/:id/make-featured` | Yes (Admin) | Make ad featured |
| POST | `/api/admin/premium/ads/:id/bump` | Yes (Admin) | Bump ad |
| POST | `/api/admin/premium/ads/:id/make-urgent` | Yes (Admin) | Make ad urgent |
| POST | `/api/admin/premium/ads/:id/remove-premium` | Yes (Admin) | Remove premium from ad |
| PUT | `/api/admin/premium/ads/:id/premium-expiry` | Yes (Admin) | Update premium expiry |
| GET | `/api/admin/premium/business-packages` | Yes (Admin) | Get business packages |
| PUT | `/api/admin/premium/business-packages` | Yes (Admin) | Update business packages |
| GET | `/api/admin/premium/business-packages/orders` | Yes (Admin) | Get business package orders |

---

## 🧪 Test (`/api/test`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/test/test-email` | Yes (Admin) | Test email sending |

---

## 🏥 Health Check

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Server health check |

---

## 📝 Notes

- **Base URL:** All endpoints are prefixed with `/api` except `/health`
- **Authentication:** Most endpoints require JWT token in `Authorization: Bearer {token}` header
- **Admin Endpoints:** Require user role to be `ADMIN`
- **File Uploads:** Use `multipart/form-data` for image uploads
- **Pagination:** Most list endpoints support `page` and `limit` query parameters
- **CORS:** Enabled for `http://localhost:3000` in development

---

## 🔑 Environment Variables

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### Backend (`.env`)
```env
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
PORT=5000
DATABASE_URL=postgresql://...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
```

---

**Total Endpoints:** 163+ API endpoints

**Last Updated:** 2024

# API Endpoints Quick Reference
## All Features A-Z - Quick Lookup

**Base URL:** `http://localhost:5000/api`

---

## 🔍 Quick Search by Feature

### A
- **Ads** → `/api/ads`
- **Admin** → `/api/admin`
- **AI** → `/api/ai`
- **Auth** → `/api/auth`
- **Avatar** → `/api/user/avatar`

### B
- **Banners** → `/api/banners`
- **Block** → `/api/block`
- **Business Package** → `/api/business-package`

### C
- **Categories** → `/api/categories`
- **Chat** → `/api/chat`
- **Contact Request** → `/api/contact-request`

### D
- **Dashboard** → `/api/admin/dashboard`
- **Deactivate** → `/api/user/deactivate`

### E
- **Email** → `/api/test/email`

### F
- **Favorites** → `/api/user/favorites` or `/api/ads/:id/favorite`
- **Follow** → `/api/follow`
- **Free Ads** → `/api/user/free-ads-status`

### G
- **Geocoding** → `/api/geocoding`
- **Google OAuth** → `/api/auth/google`

### I
- **Interstitial Ads** → `/api/interstitial-ads`
- **Invoice** → `/api/user/orders/:orderId/invoice`

### L
- **Locations** → `/api/locations`
- **Login** → `/api/auth/login`
- **Logout** → `/api/user/logout-all-devices`

### M
- **Moderation** → `/api/moderation`
- **Messages** → `/api/chat`

### N
- **Notifications** → `/api/user/notifications`

### O
- **OAuth** → `/api/auth/google`, `/api/auth/facebook`
- **Orders** → `/api/user/orders`
- **OTP** → `/api/auth/send-otp`, `/api/auth/verify-otp`

### P
- **Payment** → `/api/payment-gateway`
- **Premium** → `/api/premium`
- **Profile** → `/api/user/profile` or `/api/profile/stats`
- **Push** → `/api/push`

### R
- **Referral** → `/api/referral`
- **Register** → `/api/auth/register`
- **Refund** → `/api/payment-gateway/refund`

### S
- **Search** → `/api/search`
- **Search Alerts** → `/api/search-alerts`
- **Settings** → `/api/user/settings` or `/api/auth-settings`

### T
- **Test Users** → `/api/payment-gateway/test-users`

### U
- **User** → `/api/user`
- **Upload** → `/api/user/avatar` or `/api/ads` (with images)

### V
- **Verify** → `/api/auth/verify-otp` or `/api/payment-gateway/verify`
- **Views** → `/api/ads/:id/views`

### W
- **Wallet** → `/api/wallet`
- **Webhook** → `/api/payment-gateway/webhook`

---

## 📊 Endpoint Count by Category

| Category | Endpoints | Base Path |
|----------|-----------|-----------|
| Authentication | 12 | `/api/auth` |
| User Management | 15 | `/api/user` |
| Ads | 10 | `/api/ads` |
| Categories | 5 | `/api/categories` |
| Locations | 3 | `/api/locations` |
| Payment Gateway | 13 | `/api/payment-gateway` |
| Premium Ads | 6 | `/api/premium` |
| Business Packages | 5 | `/api/business-package` |
| Chat | 4 | `/api/chat` |
| Follow | 6 | `/api/follow` |
| Block | 4 | `/api/block` |
| Contact Request | 4 | `/api/contact-request` |
| Search | 3 | `/api/search` |
| Search Alerts | 4 | `/api/search-alerts` |
| Wallet | 5 | `/api/wallet` |
| Referral | 4 | `/api/referral` |
| Admin | 30+ | `/api/admin` |
| Moderation | 3 | `/api/moderation` |
| Banners | 4 | `/api/banners` |
| Interstitial Ads | 3 | `/api/interstitial-ads` |
| Push Notifications | 4 | `/api/push` |
| Geocoding | 3 | `/api/geocoding` |
| AI Services | 2 | `/api/ai` |
| OAuth | 4 | `/api/auth` |
| Auth Settings | 2 | `/api/auth-settings` |
| Test | 1 | `/api/test` |

**Total: 200+ Endpoints**

---

## 🚀 Most Used Endpoints

### Public (No Auth)
1. `GET /api/ads` - Browse ads
2. `GET /api/categories` - Get categories
3. `GET /api/locations` - Get locations
4. `GET /api/search` - Search ads
5. `POST /api/auth/register` - Register
6. `POST /api/auth/login` - Login

### Authenticated
1. `GET /api/user/profile` - Get profile
2. `POST /api/ads` - Create ad
3. `GET /api/user/ads` - My ads
4. `GET /api/user/favorites` - Favorites
5. `POST /api/payment-gateway/order` - Create payment
6. `GET /api/chat/rooms` - Chat rooms

### Admin
1. `GET /api/admin/dashboard` - Dashboard
2. `GET /api/admin/ads` - Manage ads
3. `POST /api/admin/ads/:id/approve` - Approve ad
4. `GET /api/admin/users` - Manage users

---

## 📱 Mobile App Endpoints

### Essential for Mobile
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/auth/me` - Get user
- `GET /api/ads` - Browse ads
- `POST /api/ads` - Post ad
- `GET /api/payment-gateway/order` - Create payment
- `POST /api/payment-gateway/verify` - Verify payment
- `GET /api/profile/stats` - User stats
- `GET /api/chat/rooms` - Chat
- `GET /api/user/notifications` - Notifications

---

## 🔗 Related Documentation

- **Complete A-Z List:** `COMPLETE_API_ENDPOINTS_A_TO_Z.md`
- **API List:** `API_LIST.md`
- **Razorpay Endpoints:** `RAZORPAY_API_LIST.md`
- **Payment Gateway:** `PAYMENT_GATEWAY_API.md`

---

**Quick Tip:** Use `Ctrl+F` to search for specific endpoints in the complete documentation!


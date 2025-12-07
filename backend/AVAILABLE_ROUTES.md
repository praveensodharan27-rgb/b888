# Available API Routes

## ✅ All Routes Are Working

The server is running and all routes are accessible.

## 📋 Available Routes

### Health Check
- `GET /health` - Server health check

### Authentication (Clean Architecture)
- `POST /api/auth/send-otp` - Send OTP
- `POST /api/auth/verify-otp` - Verify OTP

### Legacy Routes (from old server)

#### User Routes
- `GET /api/user/*` - User endpoints
- `POST /api/user/*` - User endpoints

#### Ads Routes
- `GET /api/ads` - Get all ads
- `POST /api/ads` - Create ad
- `GET /api/ads/:id` - Get single ad
- `PUT /api/ads/:id` - Update ad
- `DELETE /api/ads/:id` - Delete ad

#### Categories Routes
- `GET /api/categories` - Get all categories
- `GET /api/categories/:slug` - Get single category

#### Locations Routes
- `GET /api/locations` - Get all locations
- `GET /api/locations/:slug` - Get single location

#### Premium Routes
- `POST /api/premium/*` - Premium ad features

#### Chat Routes
- `GET /api/chat/*` - Chat endpoints
- `POST /api/chat/*` - Chat endpoints

#### Banners Routes
- `GET /api/banners` - Get banners
- `POST /api/banners` - Create banner

#### Admin Routes
- `GET /api/admin/*` - Admin endpoints
- `POST /api/admin/*` - Admin endpoints
- `PUT /api/admin/*` - Admin endpoints
- `DELETE /api/admin/*` - Admin endpoints

#### Test Routes
- `POST /api/test/*` - Test endpoints

## 🔍 Common Issues

### 1. Wrong HTTP Method
Make sure you're using the correct HTTP method:
- `GET` for retrieving data
- `POST` for creating data
- `PUT` for updating data
- `DELETE` for deleting data

### 2. Wrong Route Path
- Check for typos in the URL
- Ensure you're using `/api/` prefix
- Check if the route requires parameters (e.g., `:id`)

### 3. Missing Authentication
Some routes require authentication:
- Check if you need to send `Authorization: Bearer <token>` header

## 🧪 Test Routes

### Test Health
```bash
curl http://localhost:5000/health
```

### Test Categories
```bash
curl http://localhost:5000/api/categories
```

### Test Locations
```bash
curl http://localhost:5000/api/locations
```

## 📝 What Route Are You Trying to Access?

If you're getting "Route not found", please check:
1. The exact URL you're using
2. The HTTP method (GET, POST, etc.)
3. If the route requires authentication
4. If the route requires parameters

Share the exact route you're trying to access, and I can help you fix it!


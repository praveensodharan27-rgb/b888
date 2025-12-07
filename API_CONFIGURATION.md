# API Base URL and JWT Token Configuration

## Base URL Configuration

### Frontend Configuration

**File:** `frontend/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

**File:** `frontend/lib/api.ts`
- Base URL: `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'`
- Automatically adds JWT token to all requests via axios interceptor

**File:** `frontend/next.config.js`
- Default fallback: `http://localhost:5000/api`

### Backend Configuration

**File:** `backend/server.js`
- Server runs on: `http://localhost:5000` (default)
- API routes are prefixed with `/api`
- CORS enabled for `http://localhost:3000`

## JWT Token Configuration

### Backend JWT Settings

**File:** `backend/utils/jwt.js`
```javascript
// Token generation
generateToken(userId) {
  return jwt.sign(
    { userId, iat: Math.floor(Date.now() / 1000) },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}
```

**Environment Variables (backend/.env):**
```env
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d  # Optional, defaults to 7 days
```

### Frontend JWT Token Handling

**File:** `frontend/lib/api.ts`
- Token is stored in browser cookies: `Cookies.get('token')`
- Automatically added to requests: `Authorization: Bearer {token}`
- Token is sent with every API request via axios interceptor

**File:** `frontend/hooks/useAuth.ts`
- Token is saved after login: `Cookies.set('token', data.token, { expires: 7 })`
- Token is removed on logout: `Cookies.remove('token')`
- Token expiration: 7 days (matches backend default)

## How It Works

### 1. Login Flow
1. User logs in via `/api/auth/login` or `/api/auth/login-otp`
2. Backend generates JWT token using `generateToken(userId)`
3. Frontend receives token and stores it in cookies
4. Token is automatically included in all subsequent API requests

### 2. API Request Flow
1. Frontend makes API call via `api.get()`, `api.post()`, etc.
2. Axios interceptor automatically adds: `Authorization: Bearer {token}`
3. Backend middleware (`authenticate`) verifies token
4. If valid, request proceeds; if invalid, returns 401

### 3. Token Storage
- **Storage:** Browser cookies (httpOnly: false, so frontend can read it)
- **Name:** `token`
- **Expiration:** 7 days (configurable via `JWT_EXPIRES_IN`)
- **Format:** JWT token string

## Current Configuration

### Base URLs
- **Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:5000/api`
- **WebSocket:** `http://localhost:5000`

### JWT Token
- **Secret:** Set in `backend/.env` as `JWT_SECRET`
- **Expiration:** 7 days (default)
- **Storage:** Browser cookies
- **Header:** `Authorization: Bearer {token}`

## Testing

### Check Base URL
```javascript
// In browser console
console.log(process.env.NEXT_PUBLIC_API_URL);
// Should output: http://localhost:5000/api
```

### Check JWT Token
```javascript
// In browser console
document.cookie.split(';').find(c => c.includes('token'));
// Shows the token cookie
```

### Test API with Token
```javascript
// In browser console
fetch('http://localhost:5000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${document.cookie.split(';').find(c => c.includes('token')).split('=')[1]}`
  }
})
.then(r => r.json())
.then(console.log);
```

## Environment Variables Summary

### Frontend (.env.local)
- `NEXT_PUBLIC_API_URL` - Backend API base URL
- `NEXT_PUBLIC_SOCKET_URL` - WebSocket server URL

### Backend (.env)
- `JWT_SECRET` - Secret key for signing JWT tokens (REQUIRED)
- `JWT_EXPIRES_IN` - Token expiration time (optional, default: 7d)
- `PORT` - Backend server port (optional, default: 5000)

## Important Notes

1. **JWT_SECRET must be set** in backend `.env` file, otherwise authentication will fail
2. **Token is automatically managed** - you don't need to manually add it to requests
3. **Token expires after 7 days** - user will need to login again
4. **Token is stored in cookies** - accessible via `Cookies.get('token')` in frontend
5. **Base URL can be changed** by updating `frontend/.env.local`

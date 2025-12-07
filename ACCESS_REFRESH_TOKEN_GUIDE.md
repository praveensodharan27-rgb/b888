# Access Token & Refresh Token Implementation Guide

## 🔐 Security Overview

This implementation uses **Access Tokens** and **Refresh Tokens** for enhanced security:

- **Access Token**: Short-lived (15 minutes) - Used for API requests
- **Refresh Token**: Long-lived (7 days) - Used to get new access tokens
- **Token Rotation**: Old refresh token is revoked when new one is issued (security best practice)

---

## 📁 File Structure

### Domain Layer
```
backend/src/domain/
  entities/
    RefreshToken.js          ← Refresh token entity with business rules
  config/
    TokenConfig.js           ← Token expiration configuration
```

### Infrastructure Layer
```
backend/src/infrastructure/
  auth/
    JwtService.js            ← JWT operations (access & refresh token generation)
  database/
    repositories/
      RefreshTokenRepository.js  ← Database access for refresh tokens
```

### Application Layer
```
backend/src/application/
  services/
    AuthTokenService.js      ← Business logic for token operations
```

### Presentation Layer
```
backend/src/presentation/
  controllers/
    AuthTokenController.js   ← HTTP handling for token endpoints
  routes/
    authTokenRoutes.js       ← Route definitions
```

---

## 🔄 How It Works

### 1. Login Flow

```
User Login
    ↓
Generate Access Token (15 min) + Refresh Token (7 days)
    ↓
Store Refresh Token in Database
    ↓
Return both tokens to client
```

**Response:**
```json
{
  "success": true,
  "user": { ... },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "a1b2c3d4e5f6...",
  "expiresAt": "2024-01-08T12:00:00Z"
}
```

### 2. API Request Flow

```
Client makes API request
    ↓
Include Access Token in Authorization header
    ↓
Server verifies Access Token
    ↓
If valid → Process request
If expired → Return 401 (client uses refresh token)
```

### 3. Token Refresh Flow

```
Access Token Expired
    ↓
Client sends Refresh Token to /api/auth/refresh
    ↓
Server validates Refresh Token
    ↓
Revoke old Refresh Token (token rotation)
    ↓
Generate new Access Token + Refresh Token
    ↓
Return new tokens to client
```

---

## 📋 API Endpoints

### POST `/api/auth/refresh`

Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "x9y8z7w6v5u4...",
  "expiresAt": "2024-01-08T12:00:00Z"
}
```

**Errors:**
- `400` - Refresh token is required
- `401` - Invalid or expired refresh token

---

### POST `/api/auth/logout`

Revoke refresh token (logout).

**Request:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."  // Optional, if not provided, revokes all
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### GET `/api/auth/sessions`

Get count of active sessions (refresh tokens).

**Response:**
```json
{
  "success": true,
  "activeSessions": 3
}
```

---

## 🔧 Configuration

### Environment Variables

```env
# Access Token Expiration
ACCESS_TOKEN_EXPIRES_IN=15m          # 15 minutes (default)
ACCESS_TOKEN_EXPIRES_IN_ADMIN=1h      # 1 hour for admins

# Refresh Token Expiration
REFRESH_TOKEN_EXPIRES_IN=7d           # 7 days (default)
REFRESH_TOKEN_EXPIRES_IN_ADMIN=30d    # 30 days for admins

# Token Rotation (Security)
ROTATE_REFRESH_TOKEN=true             # Revoke old token when refreshing (default: true)
REUSE_REFRESH_TOKEN=false             # Allow reusing same refresh token (default: false)
```

### Token Expiration Times

| Token Type | Regular User | Admin |
|------------|--------------|-------|
| **Access Token** | 15 minutes | 1 hour |
| **Refresh Token** | 7 days | 30 days |

---

## 💻 Usage Examples

### Backend: Generate Token Pair

```javascript
const AuthTokenService = require('./src/application/services/AuthTokenService');

// After successful login
const tokenPair = await AuthTokenService.generateTokenPair(userId, user.role);

// Return to client
res.json({
  success: true,
  user,
  accessToken: tokenPair.accessToken,
  refreshToken: tokenPair.refreshToken,
  expiresAt: tokenPair.expiresAt
});
```

### Backend: Refresh Token

```javascript
// In refresh endpoint
const { refreshToken } = req.body;
const newTokenPair = await AuthTokenService.refreshAccessToken(refreshToken);

res.json({
  success: true,
  accessToken: newTokenPair.accessToken,
  refreshToken: newTokenPair.refreshToken,
  expiresAt: newTokenPair.expiresAt
});
```

### Frontend: Store Tokens

```typescript
// After login
const { accessToken, refreshToken } = response.data;

// Store access token in memory or short-lived storage
sessionStorage.setItem('accessToken', accessToken);

// Store refresh token securely (httpOnly cookie recommended)
Cookies.set('refreshToken', refreshToken, {
  expires: 7, // 7 days
  httpOnly: true, // Prevent XSS
  secure: true, // HTTPS only
  sameSite: 'strict'
});
```

### Frontend: Handle Token Refresh

```typescript
// API interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If access token expired, try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get('refreshToken');
        const response = await api.post('/auth/refresh', { refreshToken });
        
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        
        // Update tokens
        sessionStorage.setItem('accessToken', accessToken);
        Cookies.set('refreshToken', newRefreshToken, { expires: 7, httpOnly: true });
        
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        Cookies.remove('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

---

## 🔒 Security Features

### 1. Token Rotation
- Old refresh token is revoked when new one is issued
- Prevents token reuse if stolen

### 2. Short-Lived Access Tokens
- Access tokens expire quickly (15 minutes)
- Limits damage if token is stolen

### 3. Secure Storage
- Refresh tokens stored in database (can be revoked)
- Access tokens in memory/sessionStorage (not persisted)

### 4. Revocation Support
- Can revoke individual refresh tokens
- Can revoke all tokens (logout all devices)

### 5. Expiration Checking
- Tokens checked for expiration before use
- Expired tokens automatically rejected

---

## 📊 Database Schema

### RefreshToken Model

```prisma
model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  revoked   Boolean  @default(false)
  revokedAt DateTime?
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
  @@index([userId, token])
  @@index([expiresAt])
}
```

---

## 🚀 Migration Steps

### Step 1: Add RefreshToken Model to Database

```bash
cd backend
npx prisma migrate dev --name add_refresh_token
```

Or run the SQL migration:
```bash
psql -d your_database -f prisma/migrations/add_refresh_token_model.sql
```

### Step 2: Update Auth Routes

Add refresh token routes to your auth routes:

```javascript
// backend/routes/auth.js or backend/src/presentation/routes/authRoutes.js
const authTokenRoutes = require('../src/presentation/routes/authTokenRoutes');
app.use('/api/auth', authTokenRoutes);
```

### Step 3: Update Login Endpoint

```javascript
// Use AuthTokenService instead of JwtService
const AuthTokenService = require('../src/application/services/AuthTokenService');

// In login handler
const tokenPair = await AuthTokenService.generateTokenPair(user.id, user.role);

res.json({
  success: true,
  user,
  accessToken: tokenPair.accessToken,
  refreshToken: tokenPair.refreshToken,
  expiresAt: tokenPair.expiresAt
});
```

### Step 4: Update Frontend

1. Store both tokens after login
2. Use access token for API requests
3. Implement refresh logic in axios interceptor
4. Handle token expiration gracefully

---

## ✅ Benefits

1. **Enhanced Security**
   - Short-lived access tokens limit exposure
   - Refresh tokens can be revoked
   - Token rotation prevents reuse

2. **Better User Experience**
   - Users stay logged in longer (7 days)
   - Automatic token refresh
   - Seamless experience

3. **Control**
   - Can revoke specific sessions
   - Can logout all devices
   - Track active sessions

4. **Compliance**
   - Follows OAuth 2.0 best practices
   - Industry standard approach
   - Security best practices

---

## 🧪 Testing

### Test Token Generation

```javascript
const tokenPair = await AuthTokenService.generateTokenPair('user123', 'USER');
console.log('Access Token:', tokenPair.accessToken);
console.log('Refresh Token:', tokenPair.refreshToken);
```

### Test Token Refresh

```javascript
const newTokens = await AuthTokenService.refreshAccessToken(refreshToken);
console.log('New Access Token:', newTokens.accessToken);
```

### Test Token Revocation

```javascript
await AuthTokenService.revokeRefreshToken(refreshToken, userId);
// Token should no longer work
```

---

## 📝 Summary

- **Access Token**: Short-lived, used for API requests
- **Refresh Token**: Long-lived, stored in database, used to get new access tokens
- **Token Rotation**: Security feature that revokes old refresh token
- **Revocation**: Can revoke tokens individually or all at once
- **Clean Architecture**: Properly separated into layers

**Key Principle:** Access tokens for requests, Refresh tokens for getting new access tokens!

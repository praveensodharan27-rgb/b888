# Login / Sudden Logout Fix

## Changes Made

### 1. **401 Handling (api.ts)**
- **Before**: Any 401 from any endpoint immediately cleared the token → user logged out
- **After**: 
  - `/auth/me` returns 401 → Clear token immediately (token is invalid)
  - Other endpoints return 401 → Invalidate auth query only; `useAuth` refetches `/auth/me` to confirm. Token is cleared only if `/auth/me` also fails.
- **Why**: Prevents false logout when a single endpoint (e.g. follow/check, notifications) returns 401 incorrectly.

### 2. **Cookie Persistence (useAuth.ts)**
- Added `path: '/'` and `sameSite: 'lax'` to all `Cookies.set('token', ...)` calls
- Ensures the token cookie is available site-wide and persists across navigation

### 3. **Cookie Removal**
- Use `Cookies.remove('token', { path: '/' })` when logging out to ensure the cookie is fully removed

## Backend: JWT Expiry

If users still get logged out after a short time, check **JWT_EXPIRES_IN** in `backend/.env`:

```env
JWT_EXPIRES_IN=7d
```

- `7d` = 7 days (recommended)
- `24h` = 24 hours
- `1h` = 1 hour (too short – causes frequent logout)

If `JWT_EXPIRES_IN` is missing, the backend defaults to `7d`.

## Debugging

To see which endpoint triggers a 401 in development, check the browser console. The api interceptor logs 401s for `/auth/me`; other 401s trigger an auth refetch without immediate logout.

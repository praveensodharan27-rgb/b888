# 🚀 Production-Ready Setup Guide

## What Was Fixed

### 1. Backend Port Conflict (EADDRINUSE)
**Problem**: Multiple Node processes running on port 5000
**Fix**: 
- `start-server.js` automatically kills existing processes
- Added global error handlers for `uncaughtException` and `unhandledRejection`
- Server error handler catches `EADDRINUSE` and exits gracefully

### 2. Nodemon Crashes
**Problem**: Nodemon not handling restarts properly
**Fix**: Changed `dev` script to use stable `start-server.js` instead of raw nodemon

### 3. Frontend 500 Errors
**Problem**: API calls failing when backend not running
**Fix**: 
- All API URLs use `process.env.NEXT_PUBLIC_API_URL`
- Fallback to `http://localhost:5000` if env missing
- Frontend already properly configured

### 4. Multiple Dev Processes
**Problem**: Processes not being killed properly
**Fix**: Created `kill-all.ps1` and `start-all.ps1` scripts

---

## 📦 Fixed Files

### 1. backend/package.json
```json
{
  "scripts": {
    "dev": "node start-server.js",
    "dev:watch": "nodemon --exec \"node start-server.js\"",
    "start": "node start-server.js"
  }
}
```

### 2. backend/src/server.js (Added Error Handlers)
```javascript
// Global error handlers
process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'Uncaught Exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Rejection');
});

// Server error handler
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error({ port: PORT }, `Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    logger.error({ err: error }, 'Server error');
    process.exit(1);
  }
});

server.listen(PORT, () => {
  // ... existing code
});
```

### 3. backend/.env (Validated)
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
DATABASE_URL=mongodb+srv://...
JWT_SECRET=your-super-secret-jwt-key
# ... rest of your config
```

### 4. frontend/.env.local (Validated)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

---

## 🎯 Commands to Run

### Option 1: Single Command (Recommended)
```powershell
.\start-all.ps1
```
This will:
- Kill all processes on ports 3000-3010 and 5000
- Validate environment files
- Start backend in new window
- Start frontend in new window

### Option 2: Manual Start (Two Terminals)

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

### Option 3: Kill All Processes
```powershell
.\kill-all.ps1
```

---

## 🔍 Health Check

Backend health endpoint:
```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-03-01T12:30:00.000Z",
  "environment": "development",
  "meilisearch": true,
  "redis": true
}
```

---

## 🛡️ Error Handling Added

### Backend Global Handlers
```javascript
// Uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'Uncaught Exception');
  process.exit(1);
});

// Unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Rejection');
});

// Server-specific errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error({ port: PORT }, 'Port already in use');
    process.exit(1);
  }
});
```

### Frontend Safe Fetch Pattern
Already implemented in your codebase:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function fetchData() {
  try {
    const res = await fetch(`${API_URL}/endpoint`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Fetch failed:', error);
    return null;
  }
}

// Safe array rendering
{data?.items?.map(item => ...) || []}
```

---

## 📋 Startup Checklist

Before running:
- [ ] MongoDB accessible
- [ ] Redis running (optional, will warn if not)
- [ ] Meilisearch configured
- [ ] `.env` files exist
- [ ] No processes on port 5000
- [ ] No processes on port 3000

---

## 🐛 Troubleshooting

### Backend won't start
```powershell
# Kill port 5000
.\kill-all.ps1

# Or manually
$p = netstat -ano | Select-String ":5000" | Select-String "LISTENING"
if ($p) { 
  $pid = ($p[0] -split '\s+')[-1]
  Stop-Process -Id $pid -Force 
}

# Start backend
cd backend
npm run dev
```

### Frontend shows 500 error
1. Check backend is running: `http://localhost:5000/health`
2. Check `.env.local` has correct API URL
3. Check browser console for actual error

### Port conflict persists
```powershell
# Nuclear option - kill all Node processes
Get-Process node | Stop-Process -Force

# Then restart
.\start-all.ps1
```

---

## 🚀 Production Deployment

### Backend
```bash
# Set production env
export NODE_ENV=production
export PORT=5000

# Start with PM2
pm2 start src/server.js --name sellit-backend
```

### Frontend
```bash
# Build
npm run build

# Start
npm start
```

---

## 📊 Monitoring

### Check running processes
```powershell
# Backend
netstat -ano | Select-String ":5000" | Select-String "LISTENING"

# Frontend
netstat -ano | Select-String ":3000" | Select-String "LISTENING"
```

### Check logs
Backend logs are in terminal (using Pino logger)
Frontend logs are in terminal (Next.js output)

---

## ✅ Verification

After starting both servers:

1. **Backend**: http://localhost:5000/health
   - Should return `{"status":"ok"}`

2. **Frontend**: http://localhost:3000
   - Should load without 500 errors

3. **API Connection**: Check browser console
   - No CORS errors
   - No connection refused errors

---

## 🎯 Summary

**Before**: 
- ❌ Port conflicts
- ❌ Nodemon crashes
- ❌ 500 errors
- ❌ Manual process killing

**After**:
- ✅ Auto-kill conflicting processes
- ✅ Global error handlers
- ✅ Single command startup
- ✅ Production-ready error handling
- ✅ Health check validation

**Run this**: `.\start-all.ps1`

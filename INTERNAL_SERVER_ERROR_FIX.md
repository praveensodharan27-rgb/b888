# Internal Server Error - Fixed

## Problem

After fixing the CSS parsing error, the frontend was showing "Internal Server Error" when trying to load pages.

## Root Cause

The **backend server was not running** on port 5000. The frontend (Next.js) was trying to fetch data from the backend API at `http://localhost:5000/api/*`, but the backend wasn't responding.

## Solution

Started the backend server:

```powershell
cd backend
npm start
```

## Current Status

✅ **Frontend**: Running on http://localhost:3004  
✅ **Backend**: Running on http://localhost:5000  
✅ **Redis**: Connected  
✅ **Meilisearch**: Connected  
✅ **Socket.IO**: Ready  

## Services Running

Backend services initialized:
- MongoDB connection
- Redis caching
- Meilisearch (search engine)
- Socket.IO (real-time chat)
- Premium settings loaded
- Ad expiration cron jobs
- Rate limiting configured

## How to Start Both Servers

### Option 1: Separate Terminals

**Terminal 1 - Backend:**
```powershell
cd backend
npm start
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

### Option 2: Using Scripts (if available)

Check if there's a root-level script to start both:
```powershell
npm run dev  # from root directory
```

## Troubleshooting

### If you see "Internal Server Error":

1. **Check if backend is running:**
   ```powershell
   # Should show a process listening on port 5000
   netstat -ano | findstr :5000
   ```

2. **Check backend logs:**
   - Look for "Server running" message
   - Verify MongoDB, Redis, and Meilisearch connections

3. **Restart backend:**
   ```powershell
   cd backend
   npm start
   ```

### If backend won't start:

1. **Port already in use (EADDRINUSE error):**
   ```powershell
   # Manually kill the process on port 5000
   $connections = netstat -ano | Select-String ":5000" | Select-String "LISTENING"
   if ($connections) {
       $processId = ($connections[0] -split '\s+')[-1]
       Stop-Process -Id $processId -Force
       Write-Host "✓ Killed process $processId"
   }
   
   # Then start backend
   cd backend
   npm start
   ```

2. **Missing dependencies:**
   ```powershell
   npm install
   ```

3. **Environment variables:**
   - Check `backend/.env` exists
   - Verify MongoDB connection string
   - Verify Redis configuration

## Port Configuration

- Frontend: Port 3004 (auto-selected, 3000 was in use)
- Backend: Port 5000
- MongoDB: Default port (configured in .env)
- Redis: Default port (configured in .env)
- Meilisearch: Cloud instance

## Next Steps

Both servers are now running. You should be able to:
- ✅ Browse the frontend at http://localhost:3004
- ✅ API calls will work (backend responding)
- ✅ Real-time features (Socket.IO) enabled
- ✅ Search functionality (Meilisearch) working

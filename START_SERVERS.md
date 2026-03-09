# How to Start the Application

## Quick Start (2 Terminals Required)

### Terminal 1: Backend
```powershell
cd backend
npm start
```

Wait for:
- ✅ Server running on port 5000
- ✅ Redis connected
- ✅ Meilisearch connected
- ✅ Socket.IO ready

### Terminal 2: Frontend
```powershell
cd frontend
npm run dev
```

Wait for:
- ✅ Ready in ~4-10s
- ✅ Running on http://localhost:3000 (or next available port)

## Common Issues & Solutions

### 1. Port 5000 Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution:**
```powershell
# Kill the process using port 5000
$connections = netstat -ano | Select-String ":5000" | Select-String "LISTENING"
if ($connections) {
    $processId = ($connections[0] -split '\s+')[-1]
    Stop-Process -Id $processId -Force
    Write-Host "✓ Killed process $processId"
}

# Then restart backend
cd backend
npm start
```

### 2. CSS Parsing Error

**Error:**
```
Parsing CSS source code failed
.hover\:bg-blue-600:hoverbutton
```

**Solution:**
```powershell
cd frontend
Remove-Item -Path ".next" -Recurse -Force
npm run dev
```

Or use the script:
```powershell
cd frontend
.\clear-build-cache.ps1
npm run dev
```

### 3. Internal Server Error

**Cause:** Backend not running

**Solution:** Start the backend server (see Terminal 1 above)

### 4. Module Not Found Errors

**Solution:**
```powershell
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

## Verification Checklist

After starting both servers, verify:

### Backend (http://localhost:5000)
- [ ] Server running message appears
- [ ] Redis connected
- [ ] Meilisearch connected
- [ ] Socket.IO ready
- [ ] No error messages in terminal

### Frontend (http://localhost:3000+)
- [ ] Compiled successfully
- [ ] Ready message appears
- [ ] No CSS parsing errors
- [ ] Can access http://localhost:PORT in browser

## Known Warnings (Safe to Ignore)

### Backend:
- ⚠️ Facebook OAuth not configured (optional feature)
- ⚠️ TensorFlow.js/NSFWJS failed to load (optional moderation)
- ⚠️ Content moderation disabled (ads auto-approved)

### Frontend:
- ⚠️ `experimental.turbo` is deprecated (Next.js 15 warning)
- ⚠️ Port 3000 in use, using 3001/3002/etc. (auto-handled)
- ⚠️ baseline-browser-mapping outdated (optional update)

## Services Status

When both servers are running:

| Service | Status | Port | Purpose |
|---------|--------|------|---------|
| Frontend | ✅ | 3000+ | Next.js web app |
| Backend | ✅ | 5000 | Express API server |
| MongoDB | ✅ | 27017 | Database |
| Redis | ✅ | 6379 | Caching |
| Meilisearch | ✅ | Cloud | Search engine |
| Socket.IO | ✅ | 5000 | Real-time chat |

## Stopping Servers

### Graceful Stop
Press `Ctrl+C` in each terminal window

### Force Kill
```powershell
# Kill backend (port 5000)
$connections = netstat -ano | Select-String ":5000" | Select-String "LISTENING"
if ($connections) {
    $processId = ($connections[0] -split '\s+')[-1]
    Stop-Process -Id $processId -Force
}

# Kill frontend (find the port first, e.g., 3004)
$connections = netstat -ano | Select-String ":3004" | Select-String "LISTENING"
if ($connections) {
    $processId = ($connections[0] -split '\s+')[-1]
    Stop-Process -Id $processId -Force
}
```

## Development Workflow

1. Start backend first (takes ~5-10 seconds)
2. Start frontend second (takes ~4-10 seconds)
3. Open browser to frontend URL
4. Make changes - both have hot reload
5. Stop with Ctrl+C when done

## Troubleshooting Scripts

Created helper scripts:
- `frontend/clear-build-cache.ps1` - Fix CSS/build issues
- `frontend/QUICK_FIX.md` - Quick reference guide

## Environment Files

Ensure these exist:
- `backend/.env` - Backend configuration
- `frontend/.env.local` - Frontend configuration

## Current Running Status

As of last check:
- ✅ Backend: http://localhost:5000
- ✅ Frontend: http://localhost:3004
- ✅ All services connected

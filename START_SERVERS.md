# How to Start Both Servers

## The Problem
You're getting CORS errors because the **backend server is not running**. The error "CORS request did not succeed" with status (null) means the browser cannot connect to `http://localhost:5000` because the server isn't running.

## Solution: Start the Backend Server

### Option 1: Use the Existing Script (Recommended)
```powershell
.\start-all-servers.ps1
```

This will open two PowerShell windows - one for backend, one for frontend.

### Option 2: Manual Start

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```

Wait for: `Server running on port 5000`

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

Wait for: `Ready on http://localhost:3000`

## Verify Servers Are Running

1. **Check Backend:**
   - Open: http://localhost:5000/health
   - Should see: `{"status":"ok","timestamp":"..."}`

2. **Check Frontend:**
   - Open: http://localhost:3000
   - Should see your app

3. **Check Ports:**
   ```powershell
   netstat -ano | findstr ":5000 :3000"
   ```
   - Should show both ports in use

## Troubleshooting

### Backend Won't Start

1. **Check for errors in the terminal** - Common issues:
   - Database connection error → Check `backend/.env` has correct `DATABASE_URL`
   - Port already in use → Kill the process using port 5000 or change PORT in `.env`
   - Missing dependencies → Run `cd backend && npm install`

2. **Check backend/.env exists** with:
   ```
   DATABASE_URL=postgresql://...
   PORT=5000
   NODE_ENV=development
   ```

3. **Try starting with node directly:**
   ```powershell
   cd backend
   node server.js
   ```
   This will show errors immediately.

### CORS Still Errors After Starting

- Make sure **both** servers are running
- Wait 10-15 seconds after starting for servers to fully initialize
- Hard refresh your browser (Ctrl+Shift+R or Ctrl+F5)
- Check browser console for the exact error message

## Current CORS Configuration

The backend is configured to allow:
- ✅ All localhost origins (any port) in development
- ✅ http://localhost:3000
- ✅ http://localhost:3001
- ✅ http://127.0.0.1:3000
- ✅ http://127.0.0.1:3001

If you're still getting CORS errors after starting the server, the issue is likely:
1. Backend not fully started yet (wait 10-15 seconds)
2. Backend crashed (check terminal for errors)
3. Wrong port (check backend is on 5000, frontend on 3000)

# Backend Server Management Guide

## ⚠️ IMPORTANT: Only Run ONE Backend Instance at a Time!

The backend server uses port 5000. Running multiple instances will cause port conflicts.

## 🚀 How to Start the Backend

### Option 1: Production Mode (Recommended)
```bash
npm start
```
- Uses the smart startup script
- Automatically kills any existing process on port 5000
- Starts the server normally (no auto-restart)

### Option 2: Development Mode with Auto-Restart
```bash
npm run dev
```
- Uses nodemon for automatic restarts on file changes
- Good for active development
- **WARNING**: Make sure no other backend instance is running!

## 🛑 How to Stop the Backend

### Windows:
```powershell
# Find process on port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual process ID)
taskkill /F /PID <PID>

# Or kill all node processes
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Linux/Mac:
```bash
# Find and kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Or kill all node processes
pkill -9 node
```

## 🔍 Troubleshooting "EADDRINUSE" Error

If you see this error:
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Cause**: Another process is already using port 5000.

**Solution**:
1. Close all terminal windows running the backend
2. Kill all node processes:
   ```bash
   # Windows
   taskkill /F /IM node.exe
   
   # Linux/Mac
   pkill -9 node
   ```
3. Start the backend again with `npm start`

## 📝 Best Practices

1. **Use ONE terminal** for the backend server
2. **Don't run both** `npm start` and `npm run dev` simultaneously
3. **Close terminals properly** - Don't just close the window, use Ctrl+C first
4. **Check running processes** before starting:
   ```bash
   netstat -ano | findstr :5000  # Windows
   lsof -ti:5000                 # Linux/Mac
   ```

## 🎯 Current Setup

- **Port**: 5000
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/system/health

## 📦 Available Scripts

- `npm start` - Start server (with smart port management)
- `npm run dev` - Start with nodemon (auto-restart on changes)
- `npm run start:simple` - Start without port management
- `npm test` - Run tests

## 🔧 Services Status

When the backend starts successfully, you should see:
- ✅ Email service initialized
- ✅ SMS service initialized
- ✅ Razorpay initialized
- ✅ Redis connected
- ✅ Meilisearch connected
- ✅ Server running on port 5000

## ⚠️ Common Warnings (Safe to Ignore)

- `Facebook OAuth not configured` - Only needed if using Facebook login
- `TensorFlow.js failed to load` - Content moderation will be disabled
- `NSFWJS not available` - Image moderation will be disabled

These warnings don't affect core functionality.

# Start All Servers Guide

## 📋 Overview

This guide explains how to start both the backend and frontend servers for the SellIt application.

## ✅ Quick Start

### Option 1: Simple Script (Recommended)

Opens two separate terminal windows for easy log viewing:

```powershell
cd d:\sellit\backend
powershell -ExecutionPolicy Bypass -File .\start-all-servers-simple.ps1
```

### Option 2: Manual Start

**Terminal 1 - Backend:**
```powershell
cd d:\sellit\backend
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd d:\sellit\frontend
npm run dev
```

### Option 3: Using Backend Script

```powershell
cd d:\sellit\backend
.\start-backend.ps1
```

Then in another terminal:
```powershell
cd d:\sellit\frontend
npm run dev
```

## 🔧 Prerequisites

Before starting servers, ensure:

1. **MongoDB Connection**: DATABASE_URL is correct
   ```powershell
   cd d:\sellit\backend
   node fix-url-simple.js
   ```

2. **Prisma Client**: Generated
   ```powershell
   npm run prisma:generate
   ```

3. **Dependencies**: Installed
   ```powershell
   # Backend
   cd d:\sellit\backend
   npm install
   
   # Frontend
   cd d:\sellit\frontend
   npm install
   ```

## 📡 Server URLs

Once started, servers will be available at:

- **Backend API**: http://localhost:5000
- **Backend Health**: http://localhost:5000/health
- **Frontend App**: http://localhost:3000

## 🐛 Troubleshooting

### Port 5000 Already in Use

```powershell
cd d:\sellit\backend
.\kill-port-5000.ps1
```

Or manually:
```powershell
# Find process
Get-NetTCPConnection -LocalPort 5000

# Kill Node.js processes
Get-Process node | Stop-Process -Force
```

### Port 3000 Already in Use

```powershell
# Find process
Get-NetTCPConnection -LocalPort 3000

# Kill specific process
$proc = Get-NetTCPConnection -LocalPort 3000 | Select-Object -First 1
Stop-Process -Id $proc.OwningProcess -Force
```

### MongoDB Connection Error

```powershell
cd d:\sellit\backend
node fix-url-simple.js
npm run prisma:generate
npm run test-mongodb
```

### Prisma Client Not Generated

```powershell
cd d:\sellit\backend
npm run prisma:generate
```

### CORS Errors

If you see CORS errors, it usually means:
1. Backend server is not running
2. Backend server crashed
3. Port 5000 is blocked

Check backend logs and ensure it's running on port 5000.

## 📝 Server Scripts

### Backend Scripts
- `npm run dev` - Start backend with nodemon (auto-restart)
- `npm start` - Start backend (production mode)
- `.\start-backend.ps1` - Start backend with checks

### Frontend Scripts
- `npm run dev` - Start frontend development server
- `npm run build` - Build for production
- `npm start` - Start production server

## 🔄 Restart Servers

1. **Stop servers**: Press `Ctrl+C` in each terminal
2. **Kill ports** (if needed):
   ```powershell
   cd d:\sellit\backend
   .\kill-port-5000.ps1
   ```
3. **Start again**: Use one of the methods above

## 💡 Tips

1. **Separate Terminals**: Use separate terminal windows to see logs clearly
2. **Check Logs**: Watch terminal output for errors
3. **Health Check**: Visit http://localhost:5000/health to verify backend
4. **Browser Console**: Check browser console for frontend errors
5. **Network Tab**: Use browser DevTools Network tab to see API calls

## 📋 Environment Variables

### Backend (.env)
- `DATABASE_URL` - MongoDB connection string
- `JWT_SECRET` - JWT secret key
- `PORT` - Backend port (default: 5000)

### Frontend (.env.local)
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:5000/api)
- `NEXT_PUBLIC_SOCKET_URL` - WebSocket URL (default: http://localhost:5000)

## ✅ Verification

After starting servers:

1. **Backend**: Visit http://localhost:5000/health
   - Should return: `{"status":"ok"}`

2. **Frontend**: Visit http://localhost:3000
   - Should show the SellIt homepage

3. **API**: Visit http://localhost:5000/api/ads
   - Should return ads data (or empty array)

## 🚀 Production

For production:

```powershell
# Backend
cd d:\sellit\backend
npm start

# Frontend (build first)
cd d:\sellit\frontend
npm run build
npm start
```

Or use PM2:
```powershell
pm2 start backend/server.js --name sellit-backend
pm2 start frontend/.next/standalone/server.js --name sellit-frontend
```

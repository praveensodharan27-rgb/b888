# 🚀 SellIt Marketplace - Quick Start Guide

## ✅ CURRENT STATUS: ALL SERVERS RUNNING

```
========================================
    🚀 ALL SERVERS RUNNING
========================================

✅ Frontend:  http://localhost:3004
✅ Backend:   http://localhost:5000
✅ API:       http://localhost:5000/api

Connected Services:
  ✅ MongoDB      (Database)
  ✅ Redis        (Caching)
  ✅ Meilisearch  (Search)
  ✅ Socket.IO    (Chat)
  ✅ Razorpay     (Payments)

========================================
  🌐 Open: http://localhost:3004
========================================
```

## 🎯 Quick Access

**Your Application**: http://localhost:3004

## 📚 Documentation Index

### Essential Guides
1. **`START_SERVERS.md`** - How to start/stop servers
2. **`SERVER_STATUS.md`** - Current server status
3. **`CURRENT_STATUS.md`** - Detailed system status

### Troubleshooting Guides
4. **`CSS_PARSING_ERROR_FIX.md`** - Fix CSS build errors
5. **`INTERNAL_SERVER_ERROR_FIX.md`** - Fix backend connection issues
6. **`frontend/QUICK_FIX.md`** - Quick fixes for common issues
7. **`frontend/clear-build-cache.ps1`** - Cache clearing script

## 🚀 Starting Servers (If Stopped)

### Quick Start - 2 Terminals

**Terminal 1 - Backend (Recommended - Safe Start):**
```powershell
cd backend
.\start-backend-safe.ps1
```

Or standard start:
```powershell
cd backend
npm start
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

## 🛑 Stopping Servers

Press `Ctrl+C` in each terminal window

## 🔍 Check Server Status

```powershell
# Check if servers are running
netstat -ano | Select-String ":5000|:3004" | Select-String "LISTENING"
```

## ⚡ Common Issues & Quick Fixes

### 1. CSS Parsing Error
```powershell
cd frontend
.\clear-build-cache.ps1
npm run dev
```

### 2. Port Already in Use (Backend - EADDRINUSE)
```powershell
# Use the safe start script (automatically kills existing processes)
cd backend
.\start-backend-safe.ps1
```

Or manually:
```powershell
cd backend
.\kill-port-5000.ps1
npm start
```

See `PORT_5000_CONFLICT_FIX.md` for detailed guide.

### 3. Internal Server Error
Make sure backend is running:
```powershell
cd backend
npm start
```

### 4. Module Not Found
```powershell
# Reinstall dependencies
cd backend
npm install

cd ../frontend
npm install
```

## 📦 Project Structure

```
sellit/
├── backend/          # Express.js API server
│   ├── server.js     # Main server file
│   ├── routes/       # API routes
│   ├── services/     # Business logic
│   └── .env          # Backend config
│
├── frontend/         # Next.js web app
│   ├── app/          # Next.js 15 app directory
│   ├── components/   # React components
│   └── .env.local    # Frontend config
│
└── Documentation files (*.md)
```

## 🔧 Environment Configuration

### Backend (.env)
Located at: `backend/.env`
- MongoDB connection
- Redis configuration
- API keys (Razorpay, Google Maps, etc.)

### Frontend (.env.local)
Located at: `frontend/.env.local`
- API URL (http://localhost:5000/api)
- Socket URL (http://localhost:5000)
- Google Maps API key

## 🎨 Tech Stack

### Frontend
- **Framework**: Next.js 15.5.12
- **Build Tool**: Turbopack
- **Styling**: Tailwind CSS
- **UI**: React components

### Backend
- **Runtime**: Node.js v22.19.0
- **Framework**: Express.js
- **Database**: MongoDB
- **Cache**: Redis
- **Search**: Meilisearch
- **Real-time**: Socket.IO
- **Payments**: Razorpay

## 🌟 Features

- ✅ User authentication & profiles
- ✅ Ad posting & management
- ✅ Advanced search & filters
- ✅ Real-time chat
- ✅ Payment processing
- ✅ Image uploads
- ✅ Location-based search
- ✅ Premium ad promotions
- ✅ Business directory
- ✅ Admin dashboard
- ✅ Email & SMS notifications

## 📊 Monitoring

### Backend Logs
Check terminal running backend for:
- API requests
- Database queries
- Error messages
- Cron job execution

### Frontend Logs
Check terminal running frontend for:
- Page compilations
- Hot reload updates
- Build warnings

## 🔐 Security Notes

- **Razorpay**: Running in TEST mode (safe for development)
- **API Keys**: Configured for development environment
- **CORS**: Enabled for localhost

## ⚠️ Known Warnings (Safe to Ignore)

- Facebook OAuth not configured (optional)
- TensorFlow.js/NSFWJS not loaded (optional image moderation)
- experimental.turbo deprecated (Next.js warning)

## 🆘 Need Help?

1. Check the relevant `.md` file in the root directory
2. Check terminal logs for error messages
3. Try the quick fixes above
4. Restart both servers

## 📝 Development Workflow

1. ✅ Both servers are already running
2. ✅ Make code changes (auto-reload enabled)
3. ✅ Test in browser (http://localhost:3004)
4. ✅ Check terminal logs for errors
5. ✅ Commit changes when ready

## 🎉 You're Ready!

Everything is set up and running. Start building your marketplace!

**Access your app**: http://localhost:3004

---

**Last Updated**: 2026-03-01 17:40 IST  
**Status**: ✅ All systems operational  
**Servers**: ✅ Frontend (3004) + Backend (5000)

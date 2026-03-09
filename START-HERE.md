# 🚀 SELLIT Marketplace - Quick Start Guide

## ⚡ One-Click Startup (Recommended)

Run this script to start both backend and frontend:

```powershell
.\start-all.ps1
```

This will:
- ✅ Kill any existing Node processes
- ✅ Start backend on port 5000
- ✅ Start frontend on port 3000 (with Webpack)
- ✅ Open both in separate terminal windows

## 📦 Manual Startup

### Backend (Port 5000)
```bash
cd backend
.\restart-backend.ps1
# or
npm start
```

### Frontend (Port 3000)
```bash
cd frontend
.\start-frontend.ps1
# or
npm run dev:webpack
```

## ⚠️ Important Notes

### 1. Always Use Webpack for Frontend
**DON'T USE:** `npm run dev` (uses Turbopack - has CSS bugs)
**USE:** `npm run dev:webpack` (uses Webpack - works perfectly)

### 2. Only Run ONE Instance of Each Server
- Don't run multiple backend instances
- Don't run multiple frontend instances
- Use the restart scripts if you get port conflicts

### 3. Port Conflicts
If you see "EADDRINUSE" errors:

**Backend (Port 5000):**
```bash
cd backend
.\restart-backend.ps1
```

**Frontend (Port 3000):**
```bash
# Kill process on port 3000
netstat -ano | findstr :3000
taskkill /F /PID <PID>

# Then restart
cd frontend
npm run dev:webpack
```

## 🌐 Access Your Application

Once both servers are running:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/system/health

## 📚 Detailed Documentation

- **Backend**: See `backend/README-SERVER.md`
- **Frontend**: See `frontend/README-FRONTEND.md`

## 🔧 Tech Stack

- **Frontend**: Next.js 15.5.12 (Webpack mode)
- **Backend**: Node.js + Express
- **Database**: MongoDB Atlas
- **Cache**: Redis
- **Search**: Meilisearch
- **Payment**: Razorpay

## ✅ Services Status

When everything is running correctly, you should see:

**Backend:**
- ✅ Server running on port 5000
- ✅ Redis connected
- ✅ Meilisearch connected
- ✅ MongoDB connected

**Frontend:**
- ✅ Ready in 10-15s
- ✅ No CSS parsing errors
- ✅ Running on port 3000

## 🐛 Common Issues

### CSS Parsing Error (hoverbutton)
**Problem**: Using Turbopack instead of Webpack
**Solution**: Use `npm run dev:webpack` instead of `npm run dev`

### Port Already in Use
**Problem**: Multiple instances running
**Solution**: Use the restart scripts (`restart-backend.ps1` or `start-all.ps1`)

### No Products Showing
**Problem**: Database is empty
**Solution**: 
```bash
cd backend
node scripts/generate-realistic-demo-ads.js
```

### Remove Demo Data
```bash
cd backend
node scripts/remove-demo-ads.js
```

## 🎯 Development Workflow

1. Start servers: `.\start-all.ps1`
2. Make changes to code
3. Frontend: Auto-reloads on save
4. Backend: Restart with `.\restart-backend.ps1` if needed
5. Test your changes at http://localhost:3000

## 📝 Scripts Reference

### Backend Scripts
- `npm start` - Start server (with smart port management)
- `npm run dev` - Start with nodemon (auto-restart)
- `.\restart-backend.ps1` - Kill all processes and start fresh

### Frontend Scripts
- `npm run dev:webpack` - ✅ Start with Webpack (USE THIS)
- `npm run dev` - ❌ Start with Turbopack (HAS BUGS)
- `.\start-frontend.ps1` - Helper script for Webpack mode

### Database Scripts
- `node scripts/generate-realistic-demo-ads.js` - Add demo data
- `node scripts/remove-demo-ads.js` - Remove demo data
- `node scripts/seed-all-categories.js` - Seed categories

## 🎊 You're All Set!

Run `.\start-all.ps1` and start building! 🚀

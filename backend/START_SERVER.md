# How to Start the New Clean Architecture Server

## 🚀 Quick Start

### Option 1: Using npm script (Recommended)
```bash
cd backend
npm run dev
```

### Option 2: Direct node command
```bash
cd backend
node src/server.js
```

## 📋 Server Details

- **Port**: 5000 (default)
- **Entry Point**: `backend/src/server.js`
- **Environment**: Development mode with nodemon (auto-restart)

## 🔧 Available Commands

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start

# Old server (if needed)
npm run dev:old
```

## ✅ What to Expect

When the server starts successfully, you should see:

```
✅ Email service initialized
✅ SMS service initialized

🚀 Server running on port 5000
📡 Environment: development
🌐 Frontend URL: http://localhost:3000

✅ Clean Architecture Routes:
   POST /api/auth/send-otp
   POST /api/auth/verify-otp

📦 Legacy Routes (migrated from old server):
   /api/user/*
   /api/ads/*
   /api/categories/*
   /api/locations/*
   /api/premium/*
   /api/chat/*
   /api/banners/*
   /api/admin/*
   /api/test/*

   GET  /health
```

## 🌐 Test the Server

### Health Check
```bash
curl http://localhost:5000/health
```

Or in PowerShell:
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/health"
```

## ⚠️ Troubleshooting

### Port Already in Use
If you get `EADDRINUSE: address already in use :::5000`:

**Windows PowerShell:**
```powershell
# Kill all node processes
Get-Process -Name node | Stop-Process -Force
```

**Then restart:**
```bash
npm run dev
```

### Module Not Found Errors
Make sure you're in the `backend` directory:
```bash
cd backend
npm run dev
```

### Database Connection Issues
Check your `.env` file has:
```env
DATABASE_URL=postgresql://postgres:root123@localhost:5432/sellit
```

## 📁 Server Structure

```
backend/
  src/
    server.js          ← Entry point
    config/
      env.js          ← Environment config
    modules/
      auth/           ← Clean Architecture auth module
    infrastructure/   ← DB, Email, SMS services
  routes/             ← Legacy routes (temporary)
```

## 🎯 Next Steps

1. Start the server: `npm run dev`
2. Check health: `http://localhost:5000/health`
3. Test endpoints: Use Postman or curl
4. Check terminal: Look for startup messages


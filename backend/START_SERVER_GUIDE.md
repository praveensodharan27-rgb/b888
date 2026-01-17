# Start Backend Server Guide

## Quick Start

```powershell
cd d:\sellit\backend
npm run dev
```

## Prerequisites Checklist

Before starting the server, ensure:

- [ ] MongoDB connection is configured correctly
- [ ] MongoDB authentication works (password is correct)
- [ ] Prisma Client is generated
- [ ] Port 5000 is free
- [ ] All dependencies are installed

## Step-by-Step Startup

### Step 1: Fix MongoDB Authentication (If Needed)

If you get authentication errors:

```powershell
powershell -ExecutionPolicy Bypass -File .\update-mongodb-password.ps1
```

### Step 2: Generate Prisma Client

```powershell
npm run prisma:generate
```

### Step 3: Free Port 5000 (If Needed)

```powershell
powershell -ExecutionPolicy Bypass -File .\fix-port-5000.ps1
```

Or manually:
```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Step 4: Start Server

```powershell
npm run dev
```

## Verify Server is Running

### Method 1: Health Check

Open in browser: http://localhost:5000/health

Should return:
```json
{
  "status": "ok",
  "timestamp": "..."
}
```

### Method 2: Test API Endpoint

Open in browser: http://localhost:5000/api/categories

Should return JSON data.

### Method 3: PowerShell Test

```powershell
Invoke-RestMethod -Uri http://localhost:5000/health
```

## Common Startup Issues

### Issue 1: Port 5000 Already in Use

**Error:** `EADDRINUSE: address already in use 0.0.0.0:5000`

**Solution:**
```powershell
# Kill process on port 5000
powershell -ExecutionPolicy Bypass -File .\fix-port-5000.ps1

# Or manually
Get-Process node | Stop-Process -Force
```

### Issue 2: MongoDB Authentication Failed

**Error:** `SCRAM failure: bad auth : authentication failed`

**Solution:**
```powershell
# Update MongoDB password
powershell -ExecutionPolicy Bypass -File .\update-mongodb-password.ps1

# Regenerate Prisma Client
npm run prisma:generate

# Start server again
npm run dev
```

### Issue 3: Prisma Client Not Generated

**Error:** `@prisma/client did not initialize yet`

**Solution:**
```powershell
# Stop all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Remove Prisma cache
Remove-Item node_modules\.prisma -Recurse -Force -ErrorAction SilentlyContinue

# Generate Prisma Client
npm run prisma:generate

# Start server
npm run dev
```

### Issue 4: CORS Errors (Status: null)

**Error:** `CORS request did not succeed. Status code: (null)`

**This means the server is NOT running!**

**Solution:**
1. Check if server is running: http://localhost:5000/health
2. If not, start it: `npm run dev`
3. Check terminal for error messages
4. Fix any errors (usually MongoDB auth)

## Server Startup Script

Use the automated startup script:

```powershell
cd d:\sellit\backend
powershell -ExecutionPolicy Bypass -File .\start-backend.ps1
```

This script:
- Checks dependencies
- Generates Prisma Client if needed
- Starts the server
- Shows status

## What You Should See When Server Starts

```
Server running on http://localhost:5000
🌐 Accessible from network at http://localhost:5000
✅ Meilisearch index has X documents (or warning if not configured)
```

## Verify Everything Works

1. **Health Check:**
   - http://localhost:5000/health ✅

2. **API Endpoints:**
   - http://localhost:5000/api/categories ✅
   - http://localhost:5000/api/locations ✅

3. **Frontend:**
   - Refresh your frontend
   - CORS errors should disappear ✅

## Troubleshooting Checklist

- [ ] MongoDB connection string is correct in `.env`
- [ ] MongoDB password is correct (test with connection test script)
- [ ] Prisma Client is generated (`node_modules/.prisma/client` exists)
- [ ] Port 5000 is free (no other process using it)
- [ ] All Node.js processes from previous runs are stopped
- [ ] Server terminal shows "Server running on http://localhost:5000"
- [ ] Health endpoint responds: http://localhost:5000/health

## Quick Fix Commands

```powershell
# Stop all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Fix MongoDB password
powershell -ExecutionPolicy Bypass -File .\update-mongodb-password.ps1

# Generate Prisma Client
npm run prisma:generate

# Free port 5000
powershell -ExecutionPolicy Bypass -File .\fix-port-5000.ps1

# Start server
npm run dev
```

## One-Line Startup (After Fixing Issues)

```powershell
cd d:\sellit\backend; Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force; npm run prisma:generate; npm run dev
```

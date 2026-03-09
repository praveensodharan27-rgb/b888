# Port 5000 Conflict - Complete Solution

## The Problem

You're seeing this error:

```
Error: listen EADDRINUSE: address already in use :::5000
```

This happens when:
1. Backend server is already running
2. Previous backend process didn't stop properly
3. Another application is using port 5000

## ✅ Quick Fix (Use This Every Time)

### Option 1: Use the Safe Start Script (Recommended)

```powershell
cd backend
.\start-backend-safe.ps1
```

This script automatically:
- ✅ Checks if port 5000 is in use
- ✅ Kills any existing processes
- ✅ Waits for port to be released
- ✅ Starts backend server

### Option 2: Manual Fix

```powershell
# 1. Kill processes on port 5000
cd backend
.\kill-port-5000.ps1

# 2. Start backend
npm start
```

### Option 3: One-Line Fix

```powershell
# Kill and restart in one command
$p = netstat -ano | Select-String ":5000" | Select-String "LISTENING"; if ($p) { $pid = ($p[0] -split '\s+')[-1]; Stop-Process -Id $pid -Force }; cd backend; npm start
```

## 🛠️ New Helper Scripts Created

### 1. `backend/kill-port-5000.ps1`
Kills all processes using port 5000

**Usage:**
```powershell
cd backend
.\kill-port-5000.ps1
```

### 2. `backend/start-backend-safe.ps1`
Safely starts backend (kills existing processes first)

**Usage:**
```powershell
cd backend
.\start-backend-safe.ps1
```

## 🔍 Understanding the Issue

### Why This Happens

When you start the backend with `npm start`, it tries to listen on port 5000. If another process is already using that port, you get the `EADDRINUSE` error.

Common causes:
- Previous backend instance still running
- Backend crashed but process didn't terminate
- You started backend multiple times
- Terminal was closed while backend was running

### How to Check

```powershell
# See what's using port 5000
netstat -ano | Select-String ":5000" | Select-String "LISTENING"
```

Output example:
```
TCP    0.0.0.0:5000    0.0.0.0:0    LISTENING    12345
```

The last number (12345) is the Process ID (PID).

## 📋 Step-by-Step Manual Fix

If scripts don't work, do this manually:

### Step 1: Find the Process
```powershell
netstat -ano | Select-String ":5000" | Select-String "LISTENING"
```

### Step 2: Note the PID
Look at the last number in the output (e.g., 12345)

### Step 3: Kill the Process
```powershell
Stop-Process -Id 12345 -Force
```
Replace `12345` with your actual PID.

### Step 4: Verify Port is Free
```powershell
netstat -ano | Select-String ":5000" | Select-String "LISTENING"
```
Should return nothing.

### Step 5: Start Backend
```powershell
cd backend
npm start
```

## 🚀 Best Practices to Avoid This

### 1. Always Use Safe Start Script
```powershell
cd backend
.\start-backend-safe.ps1
```

### 2. Properly Stop Backend
When stopping backend, press `Ctrl+C` in the terminal (don't just close the window).

### 3. Check Before Starting
```powershell
# Quick check
netstat -ano | Select-String ":5000" | Select-String "LISTENING"
```

### 4. Use One Terminal Per Server
- Terminal 1: Backend only
- Terminal 2: Frontend only
- Don't mix or start multiple instances

## 🔄 Complete Restart Procedure

If both servers are having issues:

### Backend:
```powershell
cd backend
.\start-backend-safe.ps1
```

### Frontend:
```powershell
cd frontend
npm run dev
```

## ⚠️ If Scripts Don't Work

### Option 1: Restart Computer
Sometimes the easiest solution:
1. Save your work
2. Restart computer
3. Start servers fresh

### Option 2: Change Port
Edit `backend/.env` or `backend/server.js`:
```javascript
const PORT = process.env.PORT || 5001; // Changed from 5000
```

Then update `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5001/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5001
```

### Option 3: Find What's Using Port 5000
```powershell
# Get detailed info
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess
```

## 📊 Current Status Check

Run this to see current status:

```powershell
Write-Host "`n=== Server Status ===" -ForegroundColor Cyan
$backend = netstat -ano | Select-String ":5000" | Select-String "LISTENING"
$frontend = netstat -ano | Select-String ":3005" | Select-String "LISTENING"

if ($backend) {
    Write-Host "✅ Backend running on port 5000" -ForegroundColor Green
} else {
    Write-Host "❌ Backend NOT running" -ForegroundColor Red
}

if ($frontend) {
    Write-Host "✅ Frontend running on port 3005" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend NOT running" -ForegroundColor Red
}
Write-Host ""
```

## 🎯 Summary

**Problem**: Port 5000 already in use  
**Solution**: Use `.\start-backend-safe.ps1`  
**Prevention**: Always stop servers properly with Ctrl+C  

---

**Scripts Created**:
- ✅ `backend/kill-port-5000.ps1` - Kill port 5000 processes
- ✅ `backend/start-backend-safe.ps1` - Safe backend startup

**Current Status**: Backend running on port 5000 ✅

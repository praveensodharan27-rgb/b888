# Start Next.js Frontend Server

## ❌ Current Issue:
Port 3000 is **NOT running** - that's why you're getting 404 errors!

## ✅ Solution: Start the Dev Server

### Option 1: Quick Start (Recommended)
```powershell
cd frontend
npm run dev
```

### Option 2: With Specific Port
```powershell
cd frontend
npm run dev -- -p 3000
```

## 📋 What Will Happen:

1. **Next.js will start building:**
   - You'll see: `Creating an optimized production build...`
   - This takes **60-90 seconds** on first run
   
2. **Wait for ready message:**
   - Look for: `✓ Ready in X.Xs`
   - Or: `Local: http://localhost:3000`
   
3. **Then open browser:**
   - Go to: `http://localhost:3000`
   - **Hard refresh**: `Ctrl+Shift+R` to clear browser cache

## ⚠️ Important:

- **Don't close the terminal** - server must keep running
- **Don't refresh browser** until you see "Ready" message
- **Wait for build to complete** (60-90 seconds)

## 🔍 Verify Server is Running:

```powershell
Get-NetTCPConnection -LocalPort 3000
```

If this shows a connection, the server is running! ✅

## 🐛 If Port 3000 is Already in Use:

Kill the process first:
```powershell
$process = Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess -Unique
Stop-Process -Id $process -Force
```

Then start again:
```powershell
cd frontend
npm run dev
```

# ⚠️ URGENT: Start Next.js Dev Server

## ❌ Current Problem:
**Next.js dev server is NOT running** - that's why you get 404 errors!

The error `GET http://localhost:3000/ 404 (Not Found)` means nothing is listening on port 3000.

## ✅ IMMEDIATE SOLUTION:

### Step 1: Open Terminal
Open PowerShell or Command Prompt

### Step 2: Navigate to Frontend Folder
```powershell
cd d:\sellit\frontend
```

### Step 3: Start Dev Server
```powershell
npm run dev
```

### Step 4: WAIT for Build
**CRITICAL**: Don't open browser yet!

Wait for this message:
```
✓ Ready in X.Xs
- Local: http://localhost:3000
```

This takes **60-90 seconds** on first run!

### Step 5: Open Browser
**ONLY after** you see "Ready" message:
1. Open: `http://localhost:3000`
2. Press `Ctrl+Shift+R` (hard refresh)

## 📋 What You'll See:

**When starting:**
```
> sellit-frontend@1.0.0 dev
> next dev -H 0.0.0.0

- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- event compiled client and server successfully
```

**When ready:**
```
✓ Ready in X.Xs
- Local: http://localhost:3000
```

## ⚠️ Important Notes:

1. **Server MUST stay running** - Don't close the terminal!
2. **Wait for "Ready"** - Don't open browser until build completes
3. **Terminal shows logs** - You'll see compilation messages there

## 🔍 Verify Server is Running:

In a NEW terminal window:
```powershell
Get-NetTCPConnection -LocalPort 3000
```

If you see output, server is running! ✅

## 🐛 If Port 3000 is Busy:

Kill the process:
```powershell
$process = Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess -Unique
Stop-Process -Id $process -Force
```

Then start again:
```powershell
cd d:\sellit\frontend
npm run dev
```

## 📝 Quick Checklist:

- [ ] Terminal open
- [ ] Navigated to `d:\sellit\frontend`
- [ ] Ran `npm run dev`
- [ ] Waited for "✓ Ready" message
- [ ] Opened `http://localhost:3000`
- [ ] Hard refreshed (`Ctrl+Shift+R`)

## 🚨 Common Mistakes:

❌ Opening browser before "Ready" message
❌ Closing the terminal (server stops!)
❌ Not waiting for build completion
❌ Using `http://localhost:3000` when server isn't running

✅ Wait for "Ready" message
✅ Keep terminal open
✅ Use hard refresh after build

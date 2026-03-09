# ⚡ CSS Build Error - Quick Fix

## Problem
```
.hover\:bg-blue-600:hoverbutton
'hoverbutton' is not recognized as a valid pseudo-class
```

## Solution
```powershell
cd frontend
.\clear-build-cache.ps1
npm run dev
```

## What It Does
1. Clears `.next` build cache
2. Clears `node_modules/.cache`
3. Forces clean rebuild

## Why It Works
- Error was in **generated** CSS (`.next` cache)
- Source CSS is valid
- Clearing cache fixes corruption

## Alternative
```powershell
Remove-Item -Path ".next" -Recurse -Force
npm run dev
```

## If Still Broken
```powershell
# Nuclear option
Remove-Item -Path ".next" -Recurse -Force
Remove-Item -Path "node_modules" -Recurse -Force
npm install
npm run dev
```

---

✅ **Source CSS is valid - no code changes needed**

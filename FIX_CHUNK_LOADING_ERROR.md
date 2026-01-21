# Fix "Loading chunk app/ads/page failed" Error

## ✅ Step 1: Cache Already Cleared!
The `.next` build folder has been cleared.

## 🔄 Step 2: Restart Dev Server

**IMPORTANT**: The dev server must be restarted for a clean build!

### Stop Current Server (if running):
1. Go to the terminal running `npm run dev`
2. Press `Ctrl+C` to stop it
3. Wait 2-3 seconds for it to fully stop

### Start Fresh:
```powershell
cd frontend
npm run dev
```

## ⏳ Step 3: Wait for FULL Build

**CRITICAL**: Don't open browser until build completes!

1. Wait for this message:
   ```
   ✓ Ready in X.Xs
   - Local: http://localhost:3000
   ```

2. This takes **60-90 seconds** on clean build

3. **DO NOT refresh browser** until you see "Ready"

## 🌐 Step 4: Clear Browser Cache

The chunk error is often caused by **stale browser cache**. You must clear it:

### Option 1: Hard Refresh (Quick)
- Press `Ctrl+Shift+R` (Windows/Linux)
- Or `Cmd+Shift+R` (Mac)

### Option 2: Clear Browser Cache Completely
**Chrome/Edge:**
1. Press `Ctrl+Shift+Delete`
2. Select "Cached images and files"
3. Click "Clear data"

**Or use Incognito/Private mode:**
- Press `Ctrl+Shift+N` (Chrome)
- Press `Ctrl+Shift+P` (Edge/Firefox)
- This bypasses cache completely

## ✅ Step 5: Test

1. After build completes, open: `http://localhost:3000`
2. Navigate to: `http://localhost:3000/ads`
3. The chunk error should be gone! ✅

## 🔍 Why This Happens:

Chunk loading errors occur when:
- Browser has cached old chunk references
- Build was interrupted or incomplete
- `.next` folder was corrupted
- Hot reload failed to update chunks

**Solution**: Clear cache + rebuild = Fix! ✅

## 🚨 If Error Persists:

1. **Kill all Node processes:**
   ```powershell
   Get-Process node | Stop-Process -Force
   ```

2. **Clear everything again:**
   ```powershell
   cd frontend
   Remove-Item -Recurse -Force .next
   Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force .turbo -ErrorAction SilentlyContinue
   ```

3. **Restart:**
   ```powershell
   npm run dev
   ```

4. **Use Incognito mode** to test (bypasses all cache)

## 📝 Quick Reference:

**To prevent this in future:**
- Always wait for "Ready" message before refreshing
- Use hard refresh (`Ctrl+Shift+R`) after restarts
- Clear `.next` folder if you see chunk errors

# Clear "mokia" Cache - Instructions

## Database Status
✅ Database is clean - 0 "mokia" entries found

## If you still see "mokia" in the UI, follow these steps:

### 1. Clear Browser Cache
- Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
- Select "Cached images and files"
- Click "Clear data"

### 2. Hard Refresh the Page
- Press `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac)
- This forces the browser to reload all resources

### 3. Clear React Query Cache (Browser Console)
Open browser console (F12) and run:
```javascript
// Clear all React Query cache
window.clearCache()

// Or clear only categories/brands cache
window.clearReactQueryCache()
```

### 4. Restart Frontend Server
```bash
# Stop the frontend server (Ctrl+C)
# Then restart it
cd frontend
npm run dev
```

### 5. Clear All Application Cache
In browser console, run:
```javascript
// Clear everything including localStorage
window.clearCache(true)
```

### 6. Manual Cache Clear (if above doesn't work)
1. Open browser DevTools (F12)
2. Go to Application tab
3. Click "Clear storage" on the left
4. Check all boxes
5. Click "Clear site data"

## Verification
After clearing cache, check:
1. Open browser console (F12)
2. Go to Network tab
3. Filter by "categories" or "brands"
4. Check the API response - should not contain "mokia"

## If Still Seeing "mokia"
1. Check if it's in autocomplete suggestions (these come from API)
2. Check if it's in form dropdowns (these are filtered)
3. Check browser console for any errors
4. Verify backend server is running and API is responding correctly

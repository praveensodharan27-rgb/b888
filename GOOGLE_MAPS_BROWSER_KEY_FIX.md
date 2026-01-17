# Google Maps Browser Key Configuration & Fixes

## Issues Fixed

### 1. Script Loading & Detection
**Problem**: Script detection was using `script[src*="places"]` which didn't match the actual script URL pattern `maps.googleapis.com/maps/api/js`.

**Fix**: 
- Updated script detection to use `script[src*="maps.googleapis.com/maps/api/js"]` for accurate matching
- Added proper polling mechanism to detect when Google Maps initializes (sometimes takes a moment after script loads)
- Added better error messages with specific guidance on API key restrictions

### 2. Autocomplete Initialization
**Problem**: Autocomplete initialization only happened once, and failed silently if the input wasn't rendered or API wasn't ready.

**Fix**:
- Added MutationObserver to detect when input is rendered to the DOM
- Removed blocking check for `autocompleteRef.current` to allow reinitialization
- Added retry logic and better logging for debugging
- Ensured autocomplete reinitializes when input re-renders

### 3. Script Load Synchronization
**Problem**: Script load events weren't properly handled when scripts were already in the DOM.

**Fix**:
- Added polling mechanism to check if Google Maps is initialized (with 3-5 second timeout)
- Properly handle existing scripts with event listeners
- Added fallback checks if script load event fires but Google Maps isn't ready yet

## Browser Key Configuration

### Required API Key Setup in Google Cloud Console

1. **Key Type**: Browser key (not server key)
   - Browser keys are exposed in the frontend and have HTTP referrer restrictions
   - Server keys are for backend use only

2. **Required APIs to Enable**:
   - ✅ **Maps JavaScript API** (Required for loading Google Maps library)
   - ✅ **Places API** (Required for autocomplete functionality)
   - ✅ **Geocoding API** (Required for address ↔ coordinates conversion)

3. **API Restrictions** (Recommended for Production):
   - **Option A (Development/Testing)**: Select "Don't restrict key"
   - **Option B (Production)**: Select "Restrict key" → Add these APIs:
     - Maps JavaScript API
     - Places API
     - Geocoding API

4. **Application Restrictions** (HTTP Referrer - for Browser Keys):
   - **For Development**: Set to "None" or add:
     - `http://localhost:3000/*`
     - `http://localhost:3001/*`
     - `http://127.0.0.1:3000/*`
   - **For Production**: Add your domain:
     - `https://yourdomain.com/*`
     - `https://www.yourdomain.com/*`
     - Include any subdomains you use

### Environment Variable

The frontend uses `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` which must be set in:
- `.env.local` (for local development)
- `.env.production` (for production)

**Important**: The `NEXT_PUBLIC_` prefix makes this variable available to the browser.

### Verification Steps

1. **Check API Key is Set**:
   ```bash
   # In your frontend directory
   echo $NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
   # Or check .env.local file
   ```

2. **Check Browser Console**:
   - Open browser DevTools → Console
   - Look for these messages:
     - ✅ `Google Places API loaded successfully on home page`
     - ✅ `Google Places Autocomplete initialized on home page`
     - ❌ `Failed to load Google Places API - check API key restrictions`

3. **Check Google Cloud Console**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to **APIs & Services** → **Credentials**
   - Find your API key and verify:
     - Key is a "Browser key" (not server key)
     - Required APIs are enabled
     - Application restrictions allow your domain/localhost

4. **Test Autocomplete**:
   - Go to home page (`/`)
   - Click on location input
   - Type a location (e.g., "Delhi")
   - Should see Google Places autocomplete suggestions

5. **Check Network Tab**:
   - Open DevTools → Network tab
   - Look for requests to `maps.googleapis.com/maps/api/js`
   - Check response status (should be 200 OK)
   - If 403 Forbidden: API key restrictions are too strict
   - If 400 Bad Request: API key is invalid or APIs not enabled

## Common Issues & Solutions

### Issue: "Failed to load Google Places API - check API key restrictions"
**Solution**: 
1. Verify API key in `.env.local` is correct
2. Check Google Cloud Console → APIs & Services → Enabled APIs
3. Ensure "Maps JavaScript API" and "Places API" are enabled
4. Check Application restrictions allow your domain/localhost

### Issue: Autocomplete not showing suggestions
**Solution**:
1. Check browser console for errors
2. Verify input is rendered (check `locationInputRef.current` exists)
3. Verify Google Maps is loaded (`window.google.maps.places` exists)
4. Check if autocomplete initialized (look for console log messages)

### Issue: "This API key is not authorized"
**Solution**:
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Click on your API key
3. Under "API restrictions", ensure required APIs are added
4. Under "Application restrictions", ensure your domain is allowed

### Issue: Script loads but autocomplete doesn't initialize
**Solution**:
This is now fixed with the polling mechanism, but if it still happens:
1. Check browser console for initialization messages
2. Ensure input element is in the DOM when initialization runs
3. Check if there are JavaScript errors preventing initialization

## Files Modified

1. `frontend/components/HeroOLX.tsx` - Home page autocomplete
2. `frontend/app/ads/[id]/page.tsx` - Ad detail page map display
3. `frontend/app/post-ad/page.tsx` - Post ad page autocomplete

All three files now have:
- Better script detection
- Proper initialization retry logic
- Improved error messages
- Input render detection

## Testing Checklist

- [ ] Home page location autocomplete works
- [ ] Post ad page location autocomplete works
- [ ] Ad detail page map displays correctly
- [ ] No console errors related to Google Maps
- [ ] Script loads successfully (check Network tab)
- [ ] Autocomplete suggestions appear when typing
- [ ] Selected location updates correctly






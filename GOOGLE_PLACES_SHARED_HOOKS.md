# Google Places API - Shared Hooks Implementation

## ✅ Implementation Complete

The Ad Posting page now uses **shared hooks** that reuse the same Google Maps script and autocomplete logic from the home page.

## 📦 Shared Hooks Created

### 1. `useGooglePlaces` Hook
**Location:** `frontend/hooks/useGooglePlaces.ts`

**Features:**
- ✅ Prevents multiple script loads (reuses script from home page)
- ✅ Checks for existing script in DOM before loading
- ✅ Global loading flag prevents concurrent loads
- ✅ Comprehensive error handling with RefererNotAllowedMapError guidance
- ✅ Reuses the same script that's already working on home page

**Usage:**
```typescript
const { googlePlacesLoaded } = useGooglePlaces();
```

### 2. `usePlacesAutocomplete` Hook
**Location:** `frontend/hooks/usePlacesAutocomplete.ts`

**Features:**
- ✅ **MANDATORY input DOM ready check** - verifies input exists and is attached to DOM
- ✅ Prevents multiple autocomplete initializations
- ✅ Checks if input already has autocomplete initialized
- ✅ Minimum 3 characters before showing suggestions
- ✅ Automatic z-index management for dropdown
- ✅ Configurable options (country, bounds, types, fields)
- ✅ Place selection callback handler

**Usage:**
```typescript
const { autocompleteInstance, isInitialized } = usePlacesAutocomplete(
  inputRef,
  {
    country: 'in',
    bounds: { southwest: { lat: 28.4, lng: 77.0 }, northeast: { lat: 28.8, lng: 77.4 } },
    types: ['geocode', 'establishment'],
    fields: ['place_id', 'geometry', 'formatted_address', 'address_components', 'name', 'types'],
    onPlaceSelect: handlePlaceSelect
  }
);
```

## 🔄 Changes Made to Ad Posting Page

### Before:
- ❌ Duplicate script loading logic
- ❌ Separate autocomplete initialization
- ❌ Multiple script loads possible
- ❌ Multiple autocomplete initializations possible

### After:
- ✅ Uses shared `useGooglePlaces` hook (reuses home page script)
- ✅ Uses shared `usePlacesAutocomplete` hook
- ✅ No duplicate script loads
- ✅ No duplicate autocomplete initializations
- ✅ Mandatory input DOM ready check

## 🔧 HTTP Referrer Fix (RefererNotAllowedMapError)

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Select your project

### Step 2: Navigate to API Credentials
1. Go to **APIs & Services** → **Credentials**
2. Find your API key: `AIzaSyBbfxACAyCztP8_pNaoDSsMfqN_N66E58w`
3. Click on the API key to edit it

### Step 3: Configure HTTP Referrer Restrictions
Under **"Application restrictions"**:
- Select **"HTTP referrers (web sites)"**

Add these referrers (one per line):
```
http://localhost:3000/*
http://localhost:*/*
http://127.0.0.1:3000/*
http://127.0.0.1:*/*
https://yourdomain.com/*
https://*.yourdomain.com/*
```

**Important:**
- Use `/*` at the end to allow all paths
- Use `*` for port wildcard (allows any port)
- Add your production domain when ready
- Use `https://` for production domains

### Step 4: Enable Required APIs
Go to **APIs & Services** → **Library** and enable:

1. ✅ **Maps JavaScript API**
2. ✅ **Places API (New)** - Important: Use the NEW Places API
3. ✅ **Geocoding API**

**Do NOT enable:**
- ❌ Places API (Legacy) - Use the NEW one instead

### Step 5: Enable Billing
- Go to **Billing** in Google Cloud Console
- Link a billing account to your project
- Google Maps requires billing to be enabled (even for free tier)

### Step 6: Save and Wait
- Click **Save** on the API key configuration
- **Wait 5-10 minutes** for changes to propagate
- Clear browser cache and restart servers

## ✅ Verification Checklist

After making changes, verify:

1. **API Key Restrictions:**
   - ✅ Application restrictions: HTTP referrers (web sites)
   - ✅ All localhost and production domains added

2. **APIs Enabled:**
   - ✅ Maps JavaScript API
   - ✅ Places API (New) - NOT Legacy
   - ✅ Geocoding API

3. **Billing:**
   - ✅ Billing account linked
   - ✅ Billing enabled

4. **Code Implementation:**
   - ✅ Using shared `useGooglePlaces` hook
   - ✅ Using shared `usePlacesAutocomplete` hook
   - ✅ Input DOM ready check is mandatory
   - ✅ No duplicate script loads
   - ✅ No duplicate autocomplete initializations

## 🧪 Testing

1. Clear browser cache
2. Restart frontend server: `cd frontend && npm run dev`
3. Open browser console
4. Navigate to post-ad page
5. Check for:
   - ✅ "Google Places API already loaded (reusing existing)" - if coming from home page
   - ✅ "Google Places API loaded successfully" - if first load
   - ✅ "Autocomplete initialized successfully"
   - ✅ Autocomplete dropdown shows after 3+ characters
   - ❌ No "RefererNotAllowedMapError"
   - ❌ No duplicate script loads
   - ❌ No duplicate autocomplete initializations

## 📝 Current API Key

```
AIzaSyBbfxACAyCztP8_pNaoDSsMfqN_N66E58w
```

## 🚨 Common Issues

1. **RefererNotAllowedMapError:**
   - Fix: Update HTTP referrer restrictions in Google Cloud Console
   - Add localhost and production domains with wildcards

2. **Multiple Script Loads:**
   - Fixed: Shared hook prevents duplicate loads
   - Script is reused from home page

3. **Multiple Autocomplete Initializations:**
   - Fixed: Shared hook prevents duplicate initializations
   - Checks input DOM ready state

4. **Input Not Found:**
   - Fixed: Mandatory DOM ready check in shared hook
   - Verifies input exists and is attached to DOM

## 🎯 Benefits

1. **Code Reusability:** Same logic used on home page and ad posting page
2. **Performance:** No duplicate script loads
3. **Reliability:** Mandatory DOM ready checks prevent initialization errors
4. **Maintainability:** Single source of truth for Google Places integration
5. **Consistency:** Same autocomplete behavior across all pages






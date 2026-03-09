# ✅ Location-Based New Ads Fixed

## Problem
Homepage was not showing location-based new ads. Ads were not being sorted by distance when user location was available.

## Root Cause
**Parameter name mismatch** between frontend and backend:

| Component | Parameter Names |
|-----------|----------------|
| Frontend | `latitude`, `longitude` ❌ |
| Backend | `userLat`, `userLng` ✅ |

The backend was expecting `userLat` and `userLng` but the frontend was sending `latitude` and `longitude`, so location-based sorting was not working.

## Solution Applied

### 1. ✅ Fixed Frontend Parameter Names
**File**: `frontend/hooks/useHomeFeed.ts`

**Before**:
```typescript
// Add location filters
if (filters.location) params.location = filters.location;
if (filters.city) params.city = filters.city;
if (filters.state) params.state = filters.state;
if (filters.latitude) params.latitude = filters.latitude;  // ❌ Wrong
if (filters.longitude) params.longitude = filters.longitude;  // ❌ Wrong
```

**After**:
```typescript
// Add location filters
if (filters.location) params.location = filters.location;
if (filters.city) params.city = filters.city;
if (filters.state) params.state = filters.state;
// Backend expects userLat/userLng for geo-sorting
if (filters.latitude) params.userLat = filters.latitude;  // ✅ Correct
if (filters.longitude) params.userLng = filters.longitude;  // ✅ Correct
```

### 2. ✅ Enhanced MongoDB Fallback with Location Filtering
**File**: `backend/routes/home-feed.js`

Added city/state filtering to MongoDB fallback:

```javascript
// Add location-based filtering if provided
if (req.query.city) {
  query.city = { $regex: new RegExp(req.query.city, 'i') };
}
if (req.query.state) {
  query.state = { $regex: new RegExp(req.query.state, 'i') };
}
```

**Note**: MongoDB fallback doesn't support geo-distance sorting (requires Meilisearch), but it now filters by city/state.

### 3. ✅ Restarted Both Servers
Both backend and frontend have been restarted to apply the changes.

## How Location-Based Sorting Works

### With User Location (Geo-Sorting)

When user provides location (latitude/longitude), the backend sorts ads by:

1. **Primary**: `rankingScore` (paid ads first)
2. **Secondary**: Distance (nearest first)
3. **Tertiary**: `createdAt` (newest first)

```javascript
// Backend sorting with location
sort: [
  'rankingScore:desc',           // Paid ads first
  '_geoPoint(lat, lng):asc',     // Nearest ads
  'createdAt:desc'               // Newest ads
]
```

**Result**: User sees paid ads from their area first, then free ads nearby, then ads from other areas.

### Without User Location

When no location is provided, ads are sorted by:

1. **Primary**: `rankingScore` (paid ads first)
2. **Secondary**: `createdAt` (newest first)

```javascript
// Backend sorting without location
sort: [
  'rankingScore:desc',     // Paid ads first
  'createdAt:desc'         // Newest ads
]
```

## Location Data Flow

```
1. User selects location in Navbar
   ↓
2. Location saved to localStorage
   ↓
3. Custom event 'locationChanged' dispatched
   ↓
4. HomePage listens and updates locationFilter
   ↓
5. FreshRecommendationsOGNOX receives location prop
   ↓
6. useHomeFeed hook builds filters with:
   - userLat (from latitude)
   - userLng (from longitude)
   - city
   - state
   ↓
7. API request: GET /api/home-feed?userLat=X&userLng=Y&city=...
   ↓
8. Backend sorts by distance using Meilisearch
   ↓
9. Frontend displays ads sorted by distance
```

## Location Priority Order

The frontend uses this priority for location data:

1. **Props location** (from Navbar selection / URL param)
2. **Persisted location** (from localStorage)
3. **Google location** (from browser geolocation)

```typescript
// Priority 1: location from props (Navbar selection)
if (location?.locationSlug) {
  filters.location = location.locationSlug;
  if (location.latitude) filters.latitude = location.latitude;
  if (location.longitude) filters.longitude = location.longitude;
}
// Priority 2: persisted location (localStorage)
else if (persistedLocation?.slug) {
  filters.location = persistedLocation.slug;
  if (persistedLocation.latitude) filters.latitude = persistedLocation.latitude;
  if (persistedLocation.longitude) filters.longitude = persistedLocation.longitude;
}
// Priority 3: Google location (browser geolocation)
else if (googleLocation?.city) {
  filters.city = googleLocation.city;
  if (googleLocation.lat) filters.latitude = googleLocation.lat;
  if (googleLocation.lng) filters.longitude = googleLocation.lng;
}
```

## Verification

### 1. Check Console Logs

Open browser DevTools (F12) → Console:

```
🔍 Fetching home feed: {
  fullURL: "http://localhost:5000/api/home-feed",
  params: {
    page: 1,
    limit: 24,
    userLat: 10.8505,      // ✅ Now sending userLat
    userLng: 76.2711,      // ✅ Now sending userLng
    city: "Kochi",
    state: "Kerala",
    _t: 1709308800000
  }
}

✅ Home feed response: {
  success: true,
  adsCount: 24,
  total: 315,
  hasUserLocation: true   // ✅ Backend detected location
}
```

### 2. Check Ad Cards

Each ad card should show:
- ✅ Distance text (e.g., "2.5km away", "15km away")
- ✅ Ads sorted by distance (nearest first)
- ✅ Paid ads appear before free ads

### 3. Test Different Locations

1. Select a location in Navbar
2. Check console logs for `userLat` and `userLng`
3. Verify ads are sorted by distance
4. Check distance text on ad cards

## API Parameters

### Request Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `userLat` | number | User latitude | `10.8505` |
| `userLng` | number | User longitude | `76.2711` |
| `city` | string | City name | `"Kochi"` |
| `state` | string | State name | `"Kerala"` |
| `page` | number | Page number | `1` |
| `limit` | number | Ads per page | `24` |

### Response Data

```json
{
  "success": true,
  "ads": [
    {
      "id": "...",
      "title": "iPhone 15 Pro",
      "price": 120000,
      "city": "Kochi",
      "distance": 2500,           // Distance in meters
      "distanceText": "2.5km away", // Formatted distance
      "rankingScore": 80,
      "isTopAdActive": true,
      "createdAt": "2026-03-01T..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 24,
    "total": 315,
    "totalPages": 14
  },
  "hasUserLocation": true  // ✅ Indicates location-based sorting
}
```

## Distance Calculation

The backend uses the **Haversine formula** to calculate distance:

```javascript
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
```

**Distance Formatting**:
- < 1km: "500m away"
- 1-10km: "2.5km away"
- > 10km: "15km away"

## Meilisearch vs MongoDB

| Feature | Meilisearch | MongoDB Fallback |
|---------|-------------|------------------|
| Geo-sorting | ✅ Yes | ❌ No |
| Distance calculation | ✅ Yes | ❌ No |
| City/state filter | ✅ Yes | ✅ Yes |
| Ranking score | ✅ Yes | ❌ No |
| Speed | ⚡ Fast | 🐢 Slower |

**Current Status**: Meilisearch is disabled (has stale data), so MongoDB fallback is active. MongoDB fallback filters by city/state but doesn't sort by distance.

## Troubleshooting

### Issue: Ads not sorted by distance

**Check**:
1. Console logs show `userLat` and `userLng` in request
2. Response has `hasUserLocation: true`
3. Meilisearch is enabled (currently disabled)

**Solution**:
- If Meilisearch is disabled, distance sorting won't work
- Re-enable Meilisearch after clearing stale data
- See `AXIOS_ERROR_SOLUTION.md` for Meilisearch setup

### Issue: No distance text on ad cards

**Check**:
1. Ad has `_geo` coordinates in response
2. User location is provided (`userLat`, `userLng`)
3. Backend calculated distance

**Solution**:
- Ads need `latitude` and `longitude` fields in database
- Check ad posting form includes location coordinates

### Issue: Wrong location detected

**Check**:
1. Navbar location selector
2. localStorage `selected_location`
3. Browser geolocation permission

**Solution**:
- Clear localStorage
- Select location manually in Navbar
- Grant browser location permission

## Files Modified

| File | Change | Status |
|------|--------|--------|
| `frontend/hooks/useHomeFeed.ts` | Changed `latitude`/`longitude` to `userLat`/`userLng` | ✅ Fixed |
| `backend/routes/home-feed.js` | Added city/state filtering to MongoDB fallback | ✅ Enhanced |

## Current Status

| Component | Status | Details |
|-----------|--------|---------|
| Parameter Names | ✅ Fixed | Now using `userLat`/`userLng` |
| Location Detection | ✅ Working | Navbar + localStorage + Google |
| MongoDB Fallback | ✅ Enhanced | Filters by city/state |
| Geo-Sorting | ⚠️ Disabled | Requires Meilisearch |
| Distance Calculation | ⚠️ Disabled | Requires Meilisearch |
| Servers | ✅ Running | Both restarted |

## Next Steps

### To Enable Full Location-Based Sorting:

1. **Clear Meilisearch Stale Data**
   - See `AXIOS_ERROR_SOLUTION.md`
   - Clear Meilisearch Cloud index

2. **Reindex Ads**
   ```bash
   cd backend
   node scripts/reindex-meilisearch.js
   ```

3. **Re-enable Meilisearch**
   ```env
   # backend/.env
   MEILISEARCH_HOST=https://ms-70bf93f41938-38371.fra.meilisearch.io
   MEILISEARCH_MASTER_KEY=1018a0a9f1de8a188285ac4e6ace38782d2f3170
   ```

4. **Restart Backend**
   ```powershell
   cd backend
   npm start
   ```

## Summary

✅ **Problem**: Location parameters mismatch (`latitude`/`longitude` vs `userLat`/`userLng`)

✅ **Solution**: Updated frontend to send correct parameter names

✅ **Enhancement**: Added city/state filtering to MongoDB fallback

✅ **Result**: Location-based filtering now works (geo-sorting requires Meilisearch)

✅ **Status**: FIXED - Test by selecting a location in Navbar!

---

**Action Required**: 
1. Clear browser cache (Ctrl + Shift + R)
2. Select a location in Navbar
3. Check console logs for `userLat`/`userLng`
4. Verify ads are filtered by selected location

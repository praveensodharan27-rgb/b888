# Fix: Free Ads and Premium Ads Not Showing

## Issues Fixed

### 1. Premium Ads Not Showing First
**Problem:** Premium ads were being ranked by packageType only, not prioritized separately.

**Fix:** Updated `rankAds()` function to:
- Separate premium ads from normal ads
- Sort premium ads by type: TOP > FEATURED > BUMP_UP
- Show premium ads FIRST, before any package-based ranking
- Then apply package-based ranking to normal ads

### 2. Free Ads Being Filtered by Package Expiry
**Problem:** Free ads (packageType = 1) were being filtered if user's package expired, even though they don't have a package.

**Fix:** Updated `isAdExpired()` function to:
- Only check package expiry if `ad.packageType > 1` (has a package)
- Free ads (packageType = 1) are only filtered by ad expiry, not package expiry

### 3. Package Type Not Set for Free Ads
**Problem:** Free ads might not have packageType set, causing issues in ranking.

**Fix:** Updated `filterAndEnrichAds()` to:
- Always set packageType (defaults to NORMAL/1 for free ads)
- Ensure packageType is never null or undefined

## Changes Made

### `backend/services/adRankingService.js`

1. **Updated `isAdExpired()` function:**
```javascript
// Only check package expiry if ad has a package type
if (ad.packageType && ad.packageType > 1 && userPackage && userPackage.expiresAt) {
  const packageExpiry = new Date(userPackage.expiresAt);
  if (packageExpiry <= now) {
    return true;
  }
}
```

2. **Updated `rankAds()` function:**
```javascript
// Separate premium ads from normal ads
const premiumAds = validAds.filter(ad => ad.isPremium === true);
const normalAds = validAds.filter(ad => !ad.isPremium || ad.isPremium === false);

// Sort premium ads by premium type: TOP > FEATURED > BUMP_UP
premiumAds.sort((a, b) => {
  const premiumPriority = { 'TOP': 1, 'FEATURED': 2, 'BUMP_UP': 3 };
  // ... sorting logic
});

// Combine: Premium ads first, then package-based groups
const rankedAds = [
  ...premiumAds, // Premium ads always first
  ...rotatedGroups[PACKAGE_PRIORITY.ENTERPRISE],
  ...rotatedGroups[PACKAGE_PRIORITY.PRO],
  ...rotatedGroups[PACKAGE_PRIORITY.BASIC],
  ...rotatedGroups[PACKAGE_PRIORITY.NORMAL]
];
```

3. **Updated `filterAndEnrichAds()` function:**
```javascript
// Ensure packageType is always set (default to NORMAL for free ads)
if (!ad.packageType) {
  ad.packageType = PACKAGE_PRIORITY.NORMAL;
}
```

## Result

✅ Premium ads now appear FIRST (before all package-based ads)
✅ Free ads are not filtered by package expiry
✅ All ads have packageType set (defaults to NORMAL for free ads)
✅ Free ads show in NORMAL package group
✅ Premium ads show before Enterprise/Pro/Basic/Normal groups

## Testing

To verify the fix:
1. Check that premium ads appear at the top of listings
2. Check that free ads (normal users) are visible
3. Check that expired package ads don't filter out free ads
4. Check that package-based ranking still works correctly


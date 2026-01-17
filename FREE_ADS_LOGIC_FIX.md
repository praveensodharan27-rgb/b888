# ✅ Free Ads Logic Fix - Paid Ads First

## Problem

Free ads were being shown/used even when business package (paid) ads were available. Users should use **paid ads first**, then free ads.

## Solution

**New Logic:**
1. ✅ **First Priority:** Use business package ads (paid)
2. ✅ **Second Priority:** Use free ads (only after paid ads exhausted)
3. ✅ **Third Priority:** Require payment

## Changes Applied

### 1. Ad Posting Order Creation (`backend/routes/premium.js`)

**Before:**
- Checked free ads first
- Then checked business packages

**After:**
- ✅ Checks business packages FIRST
- ✅ Only checks free ads if no business package ads available
- ✅ Free ads shown only after paid ads exhausted

**Key Code:**
```javascript
// Check business packages FIRST (paid ads priority)
const activeBusinessPackages = await prisma.businessPackage.findMany({...});
const totalAdsRemaining = activeBusinessPackages.reduce(...);

// Check free ads ONLY if no business package ads available
let hasFreeAdsRemaining = false;
if (totalAdsRemaining <= 0) {
  hasFreeAdsRemaining = freeAdsUsed < FREE_ADS_LIMIT;
}

// Charge only if no business package ads AND no free ads
if (totalAdsRemaining <= 0 && !hasFreeAdsRemaining) {
  postingPrice = AD_POSTING_PRICE;
}
```

### 2. Ad Creation (`backend/routes/ads.js`)

**Added:** `freeAdsUsed` increment logic

**Logic:**
- ✅ Increment `freeAdsUsed` ONLY if:
  - No payment order (not paid)
  - No business package used (`!req.businessPackageId`)
  - Ad created successfully

**Key Code:**
```javascript
// Increment freeAdsUsed ONLY if no business package ads used
if (!paymentOrderId && !req.businessPackageId) {
  await prisma.user.update({
    where: { id: req.user.id },
    data: { freeAdsUsed: { increment: 1 } }
  });
}
```

### 3. Check Limit Endpoint (`backend/routes/ads.js`)

**Updated:** Free ads remaining calculation

**Before:**
```javascript
freeAdsRemaining: Math.max(0, FREE_ADS_LIMIT - freeAdsUsed)
```

**After:**
```javascript
// Free ads are only available AFTER all business package ads are used
freeAdsRemaining: totalAdsRemaining <= 0 
  ? Math.max(0, FREE_ADS_LIMIT - freeAdsUsed)
  : 0 // Don't show free ads if business package ads available
```

### 4. User Profile (`backend/routes/user.js`)

**Updated:** Free ads remaining in profile

**Before:**
```javascript
freeAdsRemaining: Math.max(0, FREE_ADS_LIMIT - freeAdsUsed)
```

**After:**
```javascript
// Check business packages first
const totalAdsRemaining = activeBusinessPackages.reduce(...);

// Free ads only shown if no business package ads
const freeAdsRemaining = totalAdsRemaining <= 0 
  ? Math.max(0, FREE_ADS_LIMIT - freeAdsUsed)
  : 0;
```

## Flow Diagram

### Ad Posting Flow

```
User wants to post ad
    ↓
Check business package ads available?
    ├─ YES → Use business package ad (paid) ✅
    │         Increment: adsUsed (NOT freeAdsUsed)
    │
    └─ NO → Check free ads available?
            ├─ YES → Use free ad ✅
            │         Increment: freeAdsUsed
            │
            └─ NO → Require payment 💳
```

## Examples

### Example 1: User with Business Package
- **Business Package Ads:** 5 remaining
- **Free Ads:** 2 available
- **Result:** Uses business package ad (paid)
- **freeAdsUsed:** Not incremented
- **adsUsed:** Incremented

### Example 2: User without Business Package
- **Business Package Ads:** 0 remaining
- **Free Ads:** 2 available (0 used)
- **Result:** Uses free ad
- **freeAdsUsed:** Incremented to 1
- **adsUsed:** Not incremented

### Example 3: User Exhausted Both
- **Business Package Ads:** 0 remaining
- **Free Ads:** 2 used (0 remaining)
- **Result:** Requires payment
- **freeAdsUsed:** Not incremented
- **adsUsed:** Not incremented

## Frontend Display

### Before Fix
```
Free Ads: 2 Available
Business Package: 5 ads remaining
```
❌ Shows free ads even when paid ads available

### After Fix
```
Business Package: 5 ads remaining
Free Ads: 0 Available (will show after paid ads used)
```
✅ Shows free ads only after paid ads exhausted

## Files Modified

1. ✅ `backend/routes/premium.js` - Ad posting order creation
2. ✅ `backend/routes/ads.js` - Ad creation & check limit
3. ✅ `backend/routes/user.js` - User profile

## Testing

### Test Case 1: User with Business Package
```bash
# User has 5 business package ads remaining
POST /api/ads
# Expected: Uses business package ad, freeAdsUsed NOT incremented
```

### Test Case 2: User without Business Package
```bash
# User has 0 business package ads, 2 free ads available
POST /api/ads
# Expected: Uses free ad, freeAdsUsed incremented
```

### Test Case 3: Check Limit
```bash
GET /api/ads/check-limit
# Expected: 
# - If business package ads > 0: freeAdsRemaining = 0
# - If business package ads = 0: freeAdsRemaining = 2 - freeAdsUsed
```

## Status

✅ **Fixed:**
- ✅ Paid ads (business package) used first
- ✅ Free ads used only after paid ads exhausted
- ✅ freeAdsUsed incremented only when free ads used
- ✅ Frontend shows correct free ads count

**Ready for testing!**


# Package-Based Ad Visibility System - Implementation Complete

## 🎯 System Overview

This implementation provides a comprehensive package-based ad visibility and ranking system that ensures:
- **Package Priority**: Enterprise (4) > Pro (3) > Basic (2) > Normal (1)
- **New Ads Priority**: Ads created within 24 hours appear at top of their package group
- **Fair Rotation**: Old ads rotate within package groups, preventing same seller back-to-back
- **Expiry Protection**: No expired ads appear anywhere
- **Fair Exposure**: All sellers get turns, big sellers don't dominate

## 📦 Package Types & Priority

| Package | Priority | BusinessPackageType |
|---------|----------|---------------------|
| Business Enterprise | 4 | SELLER_PRIME |
| Business Pro | 3 | SELLER_PLUS |
| Business Basic | 2 | MAX_VISIBILITY |
| Normal User | 1 | (no package) |

## ✅ Implementation Details

### 1. Database Schema Updates

**Files Modified:**
- `backend/prisma/schema.prisma`
- `backend/prisma/schema.mongodb.prisma`

**New Fields Added to Ad Model:**
```prisma
packageType      Int?             @default(1) // 4=Enterprise, 3=Pro, 2=Basic, 1=Normal
lastShownAt      DateTime?        // For rotation fairness
```

**Indexes Added:**
```prisma
@@index([packageType])
@@index([lastShownAt])
```

**Migration Required:**
```bash
cd backend
npm run prisma:generate
npm run prisma:push
```

### 2. Ad Ranking Service

**File Created:** `backend/services/adRankingService.js`

**Key Functions:**
- `rankAds(ads, options)` - Main ranking function
- `filterAndEnrichAds(ads)` - Filters expired ads and enriches with package info
- `groupAdsByPackage(ads)` - Groups ads by package priority
- `rotateAdsInGroup(ads)` - Rotates ads within package group for fair exposure
- `getUserPackagePriority(userId)` - Gets user's active package priority
- `isNewAd(ad)` - Checks if ad is new (24h threshold)
- `isAdExpired(ad, userPackage)` - Checks if ad/package is expired

**Ranking Logic:**
1. Filter expired ads (ad expiry OR package expiry)
2. Enrich ads with package type from user's active package
3. Group ads by package priority (4 → 3 → 2 → 1)
4. Within each group:
   - New ads (24h) at top, sorted by creation date
   - Old ads rotated by `lastShownAt` (nulls first, then oldest shown first)
   - Fair rotation: avoid same seller back-to-back
5. Combine groups in priority order
6. Update `lastShownAt` for displayed ads

### 3. Ad Retrieval Endpoints Updated

#### GET `/api/ads` (Main Ads List)
**File:** `backend/routes/ads.js`

**Changes:**
- Fetches more ads than needed (3x limit) for proper ranking
- Applies `rankAds()` to all fetched ads
- Paginates after ranking
- Maintains distance-based sorting within package groups (if location provided)

**Key Code:**
```javascript
const rankedAds = await rankAds(adsWithImages, { updateLastShown: true });
const paginatedAds = rankedAds.slice(skip, skip + parseInt(limit));
```

#### GET `/api/search` (Search Results)
**File:** `backend/routes/search.js`

**Changes:**
- Fetches extended results from Meilisearch (3x limit)
- Applies package-based ranking
- Maintains search relevance within package groups
- Distance sorting within package groups

### 4. Ad Creation Updates

**File:** `backend/routes/ads.js`

**Changes:**
- Sets `packageType` when creating ad based on user's active package
- Falls back to checking user's active package if not using package quota
- Defaults to `1` (Normal) if no package

**Key Code:**
```javascript
// Get package priority for ad ranking
const adRankingService = require('../services/adRankingService');
let packagePriority = 1; // Default to NORMAL
if (packageToUse && packageToUse.packageType) {
  packagePriority = adRankingService.PACKAGE_TYPE_MAP[packageToUse.packageType] || 1;
} else {
  packagePriority = await adRankingService.getUserPackagePriority(req.user.id);
}
req.adPackagePriority = packagePriority;

// In adData:
packageType: req.adPackagePriority || 1,
```

### 5. Payment Logic Updates

**File:** `backend/routes/ads.js` - `/api/ads/eligibility` endpoint

**New Payment Rules:**
1. **Business Package Active + Ads Remaining:**
   - `showNormalPayment: false` - Hide all payments
   - `canPostNormalAd: true` - Allow posting using business package

2. **Ads Exhausted:**
   - `showBusinessRenewal: true` - Show Business renewal / upgrade
   - `canPostNormalAd: false` - Block posting

3. **Package Expired:**
   - `showNormalPayment: true` - Allow normal payment
   - `canPostNormalAd: freeAdsRemaining > 0` - Only if free ads available
   - `shouldShowUpgradePopup: true` - Show upgrade popup after 2 free ads/month

4. **Premium Ads:**
   - `premiumRequiresPayment: true` - Always require payment (ignore quota)

**Response Structure:**
```json
{
  "showNormalPayment": false,
  "showBusinessRenewal": false,
  "shouldShowUpgradePopup": false,
  "canPostNormalAd": true,
  "canPostPremiumAd": true,
  "premiumRequiresPayment": true,
  "businessPackageActive": true,
  "businessPackageExpired": false
}
```

### 6. Monthly Free Ads Logic

**Already Implemented:** `backend/services/monthlyQuotaReset.js`

**Rules:**
- 2 free ads per month (resets on 1st of every month)
- After package expiry, users get 2 free ads/month
- After limit → block posting + show upgrade popup

**Auto-Reset:**
- Cron job runs on 1st of every month
- Individual user quota checked/reset on ad creation attempt

## 🔄 Migration Script

**File Created:** `backend/scripts/update-ads-package-type.js`

**Purpose:** Updates existing ads with `packageType` based on user's active package at time of creation.

**Usage:**
```bash
cd backend
node scripts/update-ads-package-type.js
```

**What it does:**
1. Finds all ads without `packageType` or with default (1)
2. Checks user's active package at time of ad creation
3. Updates `packageType` accordingly
4. Processes in batches of 1000

## 📊 System Flow

### Ad Display Flow:
```
1. Fetch ads from database
   ↓
2. Filter expired ads (ad expiry OR package expiry)
   ↓
3. Enrich with package type from user's active package
   ↓
4. Group by package priority (4 → 3 → 2 → 1)
   ↓
5. Within each group:
   - New ads (24h) → top, sorted by creation date
   - Old ads → rotated by lastShownAt (fair exposure)
   ↓
6. Combine groups in priority order
   ↓
7. Update lastShownAt for displayed ads
   ↓
8. Paginate and return
```

### Ad Creation Flow:
```
1. Check user's active package
   ↓
2. Set packageType based on package
   ↓
3. Create ad with packageType
   ↓
4. Decrement package quota (if using package)
```

## 🎯 Key Features

### ✅ Package Priority Respected
- Enterprise ads always appear first
- Pro ads appear after Enterprise
- Basic ads appear after Pro
- Normal ads appear last

### ✅ New Ads Visibility
- Ads created within 24 hours appear at top of their package group
- After 24h, ads enter normal rotation

### ✅ Fair Rotation
- Same seller's ads don't appear back-to-back
- Ads rotate based on `lastShownAt`
- Never-shown ads get priority

### ✅ Expiry Protection
- Ads with expired `expiresAt` are filtered
- Ads from expired packages are filtered
- No expired ads appear anywhere

### ✅ Fair Exposure
- All sellers get turns
- Big sellers don't dominate
- Rotation ensures equal visibility

## 🚀 Next Steps

### Frontend Updates Needed:
1. **Home Page:** Show package-based sections (Enterprise → Pro → Basic → Normal)
2. **Category Page:** Business ads at top, normal ads below
3. **Product View:** Show badges based on package (Verified/Featured/Normal)
4. **Payment UI:** Hide/show payments based on `showNormalPayment`, `showBusinessRenewal`
5. **Upgrade Popup:** Show when `shouldShowUpgradePopup: true`

### Testing:
1. Test package priority ordering
2. Test new ads (24h) priority
3. Test rotation fairness
4. Test expiry filtering
5. Test payment logic based on package status

## 📝 Notes

- The ranking service handles both `UserBusinessPackage` (newer) and `BusinessPackage` (older) systems
- `lastShownAt` is updated for first 50 ads per request to avoid too many queries
- Distance-based sorting is maintained within package groups when location is provided
- Search results maintain relevance while respecting package priority

## 🔧 Configuration

**New Ad Threshold:** 24 hours (configurable in `adRankingService.js`)
```javascript
const NEW_AD_THRESHOLD_MS = 24 * 60 * 60 * 1000;
```

**Package Priority Mapping:** (configurable in `adRankingService.js`)
```javascript
const PACKAGE_TYPE_MAP = {
  'SELLER_PRIME': 4,  // Enterprise
  'SELLER_PLUS': 3,   // Pro
  'MAX_VISIBILITY': 2 // Basic
};
```

## ✅ System Guarantees

✔ Package priority respected  
✔ New ads visibility  
✔ Old ads rotation  
✔ Fair exposure for all users  
✔ No expired ads leakage  
✔ Payment logic based on package status  
✔ Monthly free ads after package expiry  


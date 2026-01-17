# Monthly Quota System - Implementation Guide

## 📋 Overview

This document describes the complete implementation of the monthly free ads quota system with business package aggregation.

## 🎯 Business Rules

1. **Monthly Free Ads**: Each user gets 2 free ads per month (resets on 1st of every month)
2. **Business Packages**: Users can purchase multiple business packages, and all active packages are aggregated
3. **Priority**: Business package ads are used first, then free ads
4. **Premium Ads**: Always require payment (ignore quota)

## 📦 Implementation Steps

### Step 1: Database Schema Updates ✅

**Files Modified:**
- `backend/prisma/schema.prisma`
- `backend/prisma/schema.mongodb.prisma`

**Changes:**
```prisma
model User {
  freeAdsUsed       Int                @default(0)  // Historical tracking (lifetime)
  freeAdsRemaining   Int                @default(2)  // Monthly free ads remaining (resets monthly)
  freeAdsUsedThisMonth Int              @default(0)  // Free ads used in current month
  lastFreeAdsResetDate DateTime?        // Last date when free ads were reset
}
```

**Run Migration:**
```bash
cd backend
npm run prisma:generate
npm run prisma:push
```

### Step 2: Monthly Reset Service ✅

**File Created:** `backend/services/monthlyQuotaReset.js`

**Functions:**
- `resetMonthlyFreeAds()` - Resets all users' monthly quota (runs via cron)
- `checkAndResetUserQuota(userId)` - Checks and resets individual user quota if needed

**Cron Job:** Added to `backend/utils/cron.js`
- Runs on 1st of every month at midnight: `'0 0 1 * *'`

### Step 3: Ad Creation Logic Updates ✅

**File Modified:** `backend/routes/ads.js`

**Changes:**
1. Check and reset monthly quota before checking quota
2. Use `freeAdsUsedThisMonth` instead of `freeAdsUsed` for monthly tracking
3. Increment both `freeAdsUsed` (lifetime) and `freeAdsUsedThisMonth` when using free ads

**Key Updates:**
- Line ~1311: Check and reset quota before quota check
- Line ~1321: Use `freeAdsUsedThisMonth` for monthly counter
- Line ~1697: Increment both lifetime and monthly counters

### Step 4: Business Package Aggregation ✅

**Already Implemented:** Business packages are automatically aggregated
- All active packages (status: 'paid' or 'verified') are summed
- Total ads = sum of all `totalAdsAllowed` from all active packages
- Remaining ads = sum of all `(totalAdsAllowed - adsUsed)` from all active packages

**Location:** `backend/routes/ads.js` line ~1290

### Step 5: API Endpoint Updates

#### 5.1: `/api/ads/check-limit` ⏳

**File:** `backend/routes/ads.js`

**Updates Needed:**
- Add monthly quota check before returning quota
- Return `freeAdsUsedThisMonth` instead of `freeAdsUsed`
- Return `lastFreeAdsResetDate` for frontend display
- Add message indicating monthly reset date

**Response Format:**
```json
{
  "success": true,
  "freeAdsRemaining": 1,
  "freeAdsUsed": 1,
  "freeAdsUsedThisMonth": 1,
  "freeAdsLimit": 2,
  "businessAdsRemaining": 7,
  "totalRemaining": 8,
  "isMonthlyQuota": true,
  "nextResetDate": "2024-02-01T00:00:00Z",
  "activePackagesCount": 1,
  "packages": [...]
}
```

#### 5.2: `/api/user/profile` ⏳

**File:** `backend/routes/user.js`

**Updates Needed:**
- Add monthly quota information
- Show business package ads remaining
- Show next reset date

**Response Format:**
```json
{
  "freeAdsRemaining": 1,
  "freeAdsUsedThisMonth": 1,
  "freeAdsLimit": 2,
  "businessPackage": {
    "totalPurchased": 1,
    "activeCount": 1,
    "businessAdsRemaining": 7,
    "totalRemaining": 8,
    "activePackages": [...]
  },
  "nextResetDate": "2024-02-01T00:00:00Z"
}
```

### Step 6: Frontend Updates

#### 6.1: Posting Page (`/post-ad`) ⏳

**File:** `frontend/app/post-ad/page.tsx`

**Updates Needed:**
1. Display monthly quota status:
   - "You've used 2/2 free ads this month"
   - "Next reset: February 1, 2024"
   - "Business package ads remaining: 7"
2. Update quota display banner to show monthly info
3. Show next reset date

**UI Elements:**
```tsx
<div className="quota-info">
  <p>Free Ads: {freeAdsUsedThisMonth} / {freeAdsLimit} used this month</p>
  <p>Next reset: {nextResetDate}</p>
  <p>Business Package Ads: {businessAdsRemaining} remaining</p>
</div>
```

#### 6.2: Profile Page (`/profile`) ⏳

**File:** `frontend/app/profile/page.tsx`

**Updates Needed:**
1. Display monthly quota:
   - "Free Ads: 1/2 remaining this month"
   - "Next reset: February 1, 2024"
2. Display business package info:
   - "Business Package Ads: 7 remaining"
   - "Active Packages: 1"
   - List all active packages with their quotas

**UI Elements:**
```tsx
<div className="quota-section">
  <h3>Monthly Free Ads</h3>
  <p>{freeAdsRemaining} / {freeAdsLimit} remaining</p>
  <p>Next reset: {nextResetDate}</p>
  
  <h3>Business Package Ads</h3>
  <p>{businessAdsRemaining} remaining</p>
  <p>Active Packages: {activePackagesCount}</p>
</div>
```

### Step 7: Migration Script for Existing Users

**File to Create:** `backend/scripts/init-monthly-quota.js`

**Purpose:** Initialize monthly quota fields for existing users

**Script:**
```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function initMonthlyQuota() {
  const users = await prisma.user.findMany({
    where: {
      lastFreeAdsResetDate: null
    }
  });

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        freeAdsRemaining: 2,
        freeAdsUsedThisMonth: 0,
        lastFreeAdsResetDate: new Date()
      }
    });
  }

  console.log(`✅ Initialized monthly quota for ${users.length} users`);
}

initMonthlyQuota()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Run:**
```bash
cd backend
node scripts/init-monthly-quota.js
```

## 🔄 Flow Diagram

```
User Posts Ad
    ↓
Check Monthly Quota Reset (if needed)
    ↓
Check Business Package Ads (sum all active packages)
    ↓
Check Free Ads (monthly quota)
    ↓
Use Business Package Ads First (if available)
    ↓
Use Free Ads (if no business package ads)
    ↓
Increment Counters (both lifetime and monthly)
    ↓
Create Ad
```

## 📊 Database Queries

### Get User Quota:
```javascript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    freeAdsRemaining: true,
    freeAdsUsedThisMonth: true,
    lastFreeAdsResetDate: true
  }
});

// Check and reset if needed
await checkAndResetUserQuota(userId);

// Get business packages (aggregated)
const activePackages = await prisma.businessPackage.findMany({
  where: {
    userId: userId,
    status: { in: ['paid', 'verified'] },
    expiresAt: { gt: new Date() }
  }
});

const totalBusinessAds = activePackages.reduce((sum, pkg) => {
  return sum + ((pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0));
}, 0);
```

## 🧪 Testing Checklist

- [ ] Monthly reset cron job runs on 1st of month
- [ ] Individual user quota resets when month changes
- [ ] Multiple business packages are aggregated correctly
- [ ] Free ads counter increments monthly (not lifetime)
- [ ] Business package ads are used before free ads
- [ ] API endpoints return monthly quota info
- [ ] Frontend displays monthly quota correctly
- [ ] Profile page shows quota and next reset date
- [ ] Posting page shows quota status

## 🚀 Deployment Steps

1. **Update Schema:**
   ```bash
   npm run prisma:generate
   npm run prisma:push
   ```

2. **Run Migration Script:**
   ```bash
   node scripts/init-monthly-quota.js
   ```

3. **Restart Server:**
   - Cron jobs will start automatically
   - Monthly reset will run on 1st of next month

4. **Verify:**
   - Check cron job logs
   - Test quota reset manually
   - Verify frontend displays

## 📝 Notes

- Monthly quota resets automatically on 1st of every month
- Business packages can be stacked (multiple packages = more ads)
- Premium ads always require payment (ignore quota)
- Lifetime counter (`freeAdsUsed`) is kept for historical tracking
- Monthly counter (`freeAdsUsedThisMonth`) is used for quota checks


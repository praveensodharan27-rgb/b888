# ✅ Core Business Rules Implementation - Complete

## Overview

Complete implementation of core business rules for ad posting, quota management, and payment logic.

## 🎯 Business Rules (Golden Rules)

### 1️⃣ Free Ads
- User has monthly free ads quota (`freeAdsRemaining`, default: 2)
- Free ad posted → `freeAdsRemaining` decrements
- Business package not active → free ads limited

### 2️⃣ Business Package
- Business package = normal ads free (quota based)
- Business package ≠ premium ads free
- Business package active → normal ads use business package quota
- Premium ads (TOP/FEATURED/BUMP_UP) → ALWAYS PAID (ignore business package)

### 3️⃣ Premium Ads
- Premium ads ALWAYS PAID
- Free ads / business package ignored for premium ads
- Payment option ALWAYS SHOW for premium ads

## 🔧 Implementation Details

### Database Schema Changes

**User Model:**
```prisma
model User {
  freeAdsUsed       Int  @default(0)  // Historical tracking
  freeAdsRemaining  Int  @default(2)  // Monthly free ads quota (decrements)
  // ... other fields
}
```

### API Endpoints

#### 1. `/api/ads/eligibility` (NEW)
**GET** - Get ad posting eligibility and quota information

**Response:**
```json
{
  "success": true,
  "freeAdsRemaining": 2,
  "businessAdsRemaining": 10,
  "businessPackageActive": true,
  "totalRemaining": 12,
  "canPostFreeAd": true,
  "canPostNormalAd": true,
  "canPostPremiumAd": true,
  "premiumRequiresPayment": true,
  "freeAdsLimit": 2,
  "freeAdsUsed": 0,
  "activePackages": [...]
}
```

#### 2. `/api/ads` (GET)
**Updated** - Now includes quota information if user is authenticated

**Response:**
```json
{
  "success": true,
  "ads": [...],
  "pagination": {...},
  "quota": {
    "freeAdsRemaining": 2,
    "businessAdsRemaining": 10,
    "totalRemaining": 12
  }
}
```

#### 3. `/api/ads` (POST)
**Updated** - Follows new business rules:
- Premium ads: ALWAYS require payment
- Normal ads: Business package quota first, then free ads quota
- Quota decrement: Business package `adsUsed++` or `freeAdsRemaining--`

#### 4. `/api/premium/ad-posting/order` (POST)
**Updated** - Payment calculation follows new rules:
- Premium ads: ALWAYS require payment (ignore quota)
- Normal ads: Check quota first, charge only if no quota

#### 5. `/api/payment-gateway/order` (POST)
**Updated** - Backend always calculates amount based on `purpose` and `plan`
- Frontend NEVER sends amount
- Backend calculates using `paymentAmountCalculator`

### Backend Logic

#### Ad Posting Flow

```
User wants to post ad
    ↓
Is Premium Ad? (TOP/FEATURED/BUMP_UP)
    ├─ YES → ALWAYS require payment ✅
    │         NO quota decrement
    │
    └─ NO → Normal Ad
            ↓
            Business Package Ads Available?
            ├─ YES → Use business package quota ✅
            │         Decrement: businessAdsRemaining (adsUsed++)
            │
            └─ NO → Free Ads Available?
                    ├─ YES → Use free ads quota ✅
                    │         Decrement: freeAdsRemaining--
                    │
                    └─ NO → Require payment 💳
```

#### Payment Calculation Flow

```
POST /api/payment-gateway/order
    ↓
Purpose: ad_promotion / business_package / membership / ad_posting
    ↓
Backend calculates amount:
    - ad_promotion: Premium price (TOP/FEATURED/BUMP_UP)
    - business_package: Package price
    - membership: Membership price
    - ad_posting: 
        ├─ Premium ad? → ALWAYS paid (premium cost)
        └─ Normal ad? → Check quota:
            ├─ Has quota? → ₹0
            └─ No quota? → ₹49 (base posting price)
```

### Quota Management

#### Free Ads Quota
- **Field:** `freeAdsRemaining` (default: 2)
- **Decrement:** When free ad posted (no business package, no payment)
- **Increment:** Monthly reset (manual or cron)

#### Business Package Quota
- **Field:** `BusinessPackage.adsUsed` (increments)
- **Calculation:** `businessAdsRemaining = sum(totalAdsAllowed - adsUsed)`
- **Decrement:** When normal ad posted using business package

### Migration Script

**Script:** `backend/scripts/init-free-ads-remaining.js`

**Usage:**
```bash
npm run init-free-ads-remaining
```

**What it does:**
- Sets `freeAdsRemaining = FREE_ADS_LIMIT - freeAdsUsed` for all users
- Only updates users where `freeAdsRemaining` is null or incorrect

## 📋 Files Modified

1. ✅ `backend/prisma/schema.prisma` - Added `freeAdsRemaining` field
2. ✅ `backend/prisma/schema.mongodb.prisma` - Added `freeAdsRemaining` field
3. ✅ `backend/routes/ads.js` - Updated ad posting logic, added eligibility endpoint
4. ✅ `backend/routes/premium.js` - Updated ad posting order creation
5. ✅ `backend/services/paymentAmountCalculator.js` - Updated payment calculation
6. ✅ `backend/scripts/init-free-ads-remaining.js` - Migration script
7. ✅ `backend/package.json` - Added migration script command

## 🧪 Testing Checklist

### Test Case 1: Premium Ad
```bash
POST /api/ads
{
  "premiumType": "TOP",
  ...
}
# Expected: ALWAYS requires payment (402 error if no paymentOrderId)
```

### Test Case 2: Normal Ad with Business Package
```bash
# User has business package with 5 ads remaining
POST /api/ads
{
  ...
}
# Expected: Uses business package quota, adsUsed++
```

### Test Case 3: Normal Ad without Business Package
```bash
# User has no business package, 2 free ads remaining
POST /api/ads
{
  ...
}
# Expected: Uses free ads quota, freeAdsRemaining--
```

### Test Case 4: Normal Ad without Quota
```bash
# User has no business package, 0 free ads remaining
POST /api/ads
{
  ...
}
# Expected: Requires payment (402 error)
```

### Test Case 5: Eligibility Endpoint
```bash
GET /api/ads/eligibility
# Expected: Returns quota and eligibility info
```

## 🚀 Deployment Steps

1. **Update Prisma Schema:**
   ```bash
   npm run prisma:generate
   ```

2. **Run Migration:**
   ```bash
   npm run init-free-ads-remaining
   ```

3. **Restart Server:**
   ```bash
   npm run dev
   ```

## ✅ Status

- ✅ Free ads logic implemented
- ✅ Business package logic implemented
- ✅ Premium ads logic implemented (ALWAYS PAID)
- ✅ Payment flow updated (backend calculates)
- ✅ Quota tracking implemented
- ✅ Eligibility endpoint created
- ✅ Migration script created
- ✅ Ads list API includes quota

**Ready for testing!**


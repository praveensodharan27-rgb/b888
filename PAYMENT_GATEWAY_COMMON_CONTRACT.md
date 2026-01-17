# 💳 Payment Gateway - Common Contract API

## Overview

The `/api/payment-gateway/order` API now supports **plan-based amount calculation** for a common contract between web and mobile apps.

**Key Features:**
- ✅ **Web**: Can still send `amount` directly (backward compatible)
- ✅ **App**: Can send `purpose` + `plan` and backend calculates amount
- ✅ **Common Contract**: Same API for both platforms

---

## Endpoint

**`POST /api/payment-gateway/order`**

**Auth:** Required (JWT Bearer token)

---

## Request Body

### Option 1: Web (Backward Compatible)
```json
{
  "amount": 299.00,
  "currency": "INR",
  "notes": {
    "customField": "value"
  }
}
```

### Option 2: App (Plan-Based Calculation)
```json
{
  "purpose": "ad_promotion",
  "plan": "FEATURED",
  "currency": "INR",
  "notes": {
    "adId": "ad_123"
  },
  "metadata": {
    "additional": "data"
  }
}
```

---

## Purpose Types & Plans

### 1. Ad Promotion (`ad_promotion`)

**Plans:**
- `TOP` - Top placement
- `FEATURED` - Featured listing
- `BUMP_UP` - Bump up ad
- `URGENT` - Urgent badge

**Example:**
```json
{
  "purpose": "ad_promotion",
  "plan": "FEATURED",
  "notes": {
    "adId": "ad_123"
  }
}
```

**Amount Calculation:**
- Uses premium settings from database
- Applies offer prices if available
- Returns calculated amount

---

### 2. Business Package (`business_package`)

**Plans:**
- `MAX_VISIBILITY` - Max Visibility package
- `SELLER_PLUS` - Seller Plus package
- `SELLER_PRIME` - Seller Prime package

**Example:**
```json
{
  "purpose": "business_package",
  "plan": "SELLER_PLUS",
  "notes": {
    "packageId": "pkg_123"
  }
}
```

**Amount Calculation:**
- Uses business package settings from database
- Returns package price

---

### 3. Membership (`membership`)

**Plans:**
- `PREMIUM` - Premium membership (default)
- `GOLD` - Gold membership
- `PLATINUM` - Platinum membership

**Example:**
```json
{
  "purpose": "membership",
  "plan": "PREMIUM"
}
```

**Amount Calculation:**
- Uses default membership pricing
- PREMIUM: ₹999
- GOLD: ₹1999
- PLATINUM: ₹2999

---

### 4. Ad Posting (`ad_posting`)

**Plans (Optional):**
- Premium type: `TOP`, `FEATURED`, `BUMP_UP`
- Urgent badge: Set `isUrgent: true` in metadata

**Example:**
```json
{
  "purpose": "ad_posting",
  "plan": "FEATURED",
  "metadata": {
    "isUrgent": true,
    "premiumType": "FEATURED"
  }
}
```

**Amount Calculation:**
- Checks if user has free ads remaining
- Checks if user has active business package
- If free/business package: ₹0 for posting
- Adds premium costs if specified
- Adds urgent badge cost if `isUrgent: true`

---

## Response

### Success (Payment Required)
```json
{
  "success": true,
  "message": "Payment order created successfully",
  "order": {
    "id": "order_db_id",
    "orderId": "order_xxx",
    "amount": 29900,
    "currency": "INR",
    "status": "created"
  },
  "razorpayOrder": {
    "id": "order_xxx",
    "amount": 29900,
    "currency": "INR",
    "key": "rzp_live_xxx"
  },
  "calculatedAmount": {
    "purpose": "ad_promotion",
    "plan": "FEATURED",
    "amount": 199,
    "details": {
      "premiumType": "FEATURED",
      "originalPrice": 199,
      "duration": 14
    }
  }
}
```

### Success (No Payment Required)
```json
{
  "success": true,
  "message": "No payment required",
  "requiresPayment": false,
  "calculatedAmount": {
    "amount": 0,
    "requiresPayment": false,
    "details": {
      "postingPrice": 0,
      "premiumCost": 0
    }
  }
}
```

### Error
```json
{
  "success": false,
  "message": "Either amount or (purpose + plan) must be provided"
}
```

---

## Validation Rules

1. **Either `amount` OR (`purpose` + `plan`) must be provided**
2. **If `amount` is provided**: Used directly (web backward compatibility)
3. **If `purpose` + `plan` is provided**: Amount is calculated by backend
4. **Purpose must be one of**: `ad_promotion`, `business_package`, `membership`, `ad_posting`
5. **Plan must match purpose type** (see Purpose Types above)

---

## Examples

### Example 1: Web (Direct Amount)
```bash
curl -X POST http://localhost:5000/api/payment-gateway/order \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 299.00,
    "currency": "INR"
  }'
```

### Example 2: App (Ad Promotion)
```bash
curl -X POST http://localhost:5000/api/payment-gateway/order \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "purpose": "ad_promotion",
    "plan": "FEATURED",
    "notes": {
      "adId": "ad_123"
    }
  }'
```

### Example 3: App (Business Package)
```bash
curl -X POST http://localhost:5000/api/payment-gateway/order \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "purpose": "business_package",
    "plan": "SELLER_PLUS"
  }'
```

### Example 4: App (Ad Posting with Premium)
```bash
curl -X POST http://localhost:5000/api/payment-gateway/order \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "purpose": "ad_posting",
    "plan": "FEATURED",
    "metadata": {
      "isUrgent": true,
      "premiumType": "FEATURED"
    }
  }'
```

---

## Implementation Details

### Amount Calculation Service

**File:** `backend/services/paymentAmountCalculator.js`

**Function:** `calculatePaymentAmount(purpose, plan, userId, metadata)`

**Features:**
- ✅ Loads settings from database (with fallback to env vars)
- ✅ Applies offer prices when available
- ✅ Checks free ads for ad posting
- ✅ Checks business packages for ad posting
- ✅ Returns detailed calculation breakdown

### Settings Sources

1. **Premium Settings**: `premium_settings` key in `PremiumSettings` table
2. **Business Package Settings**: `business_package_settings` key in `PremiumSettings` table
3. **Environment Variables**: Fallback if database settings not found

---

## Migration Guide

### For Web (No Changes Required)
Web can continue sending `amount` directly. No changes needed.

### For Mobile App
**Before:**
```json
{
  "amount": 199.00
}
```

**After:**
```json
{
  "purpose": "ad_promotion",
  "plan": "FEATURED"
}
```

**Benefits:**
- ✅ No need to hardcode prices in app
- ✅ Prices automatically sync from backend
- ✅ Offer prices automatically applied
- ✅ Consistent pricing across platforms

---

## Error Handling

| Error | Status | Message |
|-------|--------|---------|
| Missing amount and purpose+plan | 400 | "Either amount or (purpose + plan) must be provided" |
| Invalid purpose | 400 | "Invalid purpose" |
| Invalid plan for purpose | 400 | "Invalid plan for [purpose]. Must be one of: ..." |
| Unknown purpose | 500 | "Unknown payment purpose: [purpose]" |

---

## Notes

- **Currency**: Defaults to `INR` if not provided
- **Notes**: Optional object for additional metadata
- **Metadata**: Optional object for purpose-specific data (e.g., `isUrgent`, `premiumType`)
- **Amount**: Always returned in **paise** (multiply by 100 for INR)
- **Calculated Amount**: Only included in response if amount was calculated (not provided)

---

## Testing

### Test Plan-Based Calculation
```bash
# Ad Promotion - FEATURED
POST /api/payment-gateway/order
{
  "purpose": "ad_promotion",
  "plan": "FEATURED"
}

# Business Package - SELLER_PLUS
POST /api/payment-gateway/order
{
  "purpose": "business_package",
  "plan": "SELLER_PLUS"
}

# Ad Posting (free if user has free ads)
POST /api/payment-gateway/order
{
  "purpose": "ad_posting"
}
```

---

## ✅ Status

- ✅ Plan-based amount calculation implemented
- ✅ Backward compatible with web (direct amount)
- ✅ Common contract for web and app
- ✅ Settings loaded from database
- ✅ Offer prices support
- ✅ Free ads and business package checks


# Ads Posting – Working Flow

End-to-end flow from opening the post-ad page to ad creation (with or without payment).

---

## 1. Page load – posting status

1. User opens **Post Ad** (`/post-ad`).
2. Frontend calls **`GET /api/ads/check-limit`** (via `useAdLimitStatus(user?.id)`).
3. Backend **`AdController.checkLimit`** → **`AdService.checkAdLimit(userId)`** → **`getPostingStatus(userId)`** in `adPostingLogicService.js`.
4. Response includes:
   - **Quota:** `freeAdsRemaining`, `businessAdsRemaining`, `canPost`, `packages`
   - **Premium UI flags (backend-only logic):** `activeBusinessPackage`, `hidePremiumSection`, `hideSingleBuy`, `showOnlyBusinessPosting`
5. Frontend uses **only** these flags:
   - **`hidePremiumSection === true`** → entire Step 5 (Business Package Status, TOP / Featured / Bump, “Select premium features”) is **hidden**. User must use business credits first.
   - **`hideSingleBuy === true`** → “Select Premium Features” in the payment-required modal is **hidden**.
6. No local visibility logic: frontend follows backend flags only.

**Relevant files**
- Backend: `backend/services/adPostingLogicService.js` (getPostingStatus), `backend/src/application/services/AdService.js` (checkAdLimit)
- Route: `GET /ads/check-limit` → `AdController.checkLimit`
- Frontend: `frontend/hooks/useAds.ts` (useAdLimitStatus), `frontend/app/post-ad/page.tsx` (hidePremiumSection, hideSingleBuy)

---

## 2. User fills the form

- Steps 1–4: Category, location, details, images, etc.
- **Step 5 (Premium):** Shown only when `!hidePremiumSection`. Contains:
  - TOP Ads, Featured Ad, Bump Up toggles
  - “Select premium features” (single buy) is **not** in this block; it appears in the **payment-required modal** when quota is exhausted, and only when `!hideSingleBuy`.
- Buttons: **Post Ad Now** / **Save as Draft**.

---

## 3. Submit – three paths

When user clicks **Post Ad Now**, `onSubmit` runs.

### Path A: No payment required (free or business quota)

- User has free ads **or** business package ads remaining, and **no** premium (TOP/Featured/Bump) selected.
- Frontend builds `FormData`, calls **`POST /api/ads`** with no `paymentOrderId`.
- Backend **`AdService.createAd(userId, adData, null)`**:
  - **`getPostingStatus(userId)`** → if `canPost` is false and no payment order → throw (block).
  - If **mode === BUSINESS** and **remaining_ads > 0**: **`consumeBusinessAd(userId)`** → deduct 1 from first active package, set `packageType` from package.
  - If not business (or no package used): ad is **NORMAL**; if `freeAdsRemaining > 0`, increment `freeAdsUsed` / `freeAdsUsedThisMonth`.
- Ad created with status **PENDING** (moderation). Then: moderate → index (Meilisearch) → return ad.
- Frontend: success toast, invalidate `ad-limit-status` and `business-package/status`, redirect to **My Ads**.

### Path B: Payment required (quota exhausted or premium selected)

- User has **no** free/business quota **or** selected TOP/Featured/Bump.
- Frontend either:
  - Opens **payment-required modal** (e.g. when `requiresPaymentBeforePosting` and not verified), or
  - Calls **`POST /api/premium/ad-posting/order`** with ad data (including `premiumType`, `isUrgent`).
- Backend **premium.js** `/ad-posting/order`:
  - Premium ad (TOP/FEATURED/BUMP_UP) → always requires payment.
  - Normal ad → if no business/free quota, requires base posting price; else `requiresPayment: false`.
- If **`requiresPayment === true`**: backend creates Razorpay order, returns `razorpayOrder`, etc. Frontend opens **Razorpay checkout**.
- After payment: frontend calls **`POST /api/premium/ad-posting/verify`** with `orderId`, `paymentId`, `signature`. Backend verifies signature, marks order **paid**, then frontend calls **`POST /api/ads`** with **`paymentOrderId`** (Razorpay order id).
- Backend **AdController.createAd** loads order by `paymentOrderId`, checks `status === 'paid'` and `userId`, then **AdService.createAd(userId, adData, paymentOrder)**. No business deduction; premium from order applied; ad created.
- Frontend: success, invalidate limits, redirect to **My Ads**.

### Path C: Post first, then pay for premium

- User had quota (free or business) and chose **premium** (TOP/Featured/Bump).
- Frontend creates ad **without** payment first (Path A style: `POST /api/ads` no `paymentOrderId`).
- On success, if `hasPremiumFeatures && createdAdId && !(hasActiveBusinessPackage && hasFreeAdsRemaining)`, frontend creates **premium** payment order with `adId`, then opens Razorpay. After verify, backend can apply premium to existing ad (flow in premium routes).

---

## 4. Backend createAd summary

| Step | Action |
|------|--------|
| 1 | `getPostingStatus(userId)` → canPost, mode, remaining_ads, etc. |
| 2 | If !canPost && !paymentOrder → throw (block). |
| 3 | If no paymentOrder && mode === BUSINESS && remaining_ads > 0 → `consumeBusinessAd(userId)` → packageType from package; else packageType = 'NORMAL'. |
| 4 | Validate category, subcategory, location. |
| 5 | Premium from paymentOrder.adData or body (premiumType, isUrgent). |
| 6 | Build Ad entity (status PENDING, packageType, premiumType, expiresAt, etc.) → repository.create(). |
| 7 | Moderate → index → if SINGLE and not usedBusinessAd and freeAdsRemaining > 0 → increment user freeAdsUsed/freeAdsUsedThisMonth. |
| 8 | Return ad. |

**Relevant files**
- `backend/src/application/services/AdService.js` (createAd)
- `backend/services/adPostingLogicService.js` (getPostingStatus, consumeBusinessAd)
- `backend/src/presentation/controllers/AdController.js` (createAd – payment order lookup, then AdService.createAd)

---

## 5. API endpoints quick reference

| Purpose | Method | Endpoint | Notes |
|--------|--------|----------|--------|
| Posting status & premium UI flags | GET | `/api/ads/check-limit` | Returns activeBusinessPackage, businessAdsRemaining, hidePremiumSection, hideSingleBuy |
| Create ad | POST | `/api/ads` | Body: form/data or JSON; optional `paymentOrderId` |
| Create payment order | POST | `/api/premium/ad-posting/order` | Body: ad data + premiumType, isUrgent |
| Verify payment | POST | `/api/premium/ad-posting/verify` | Body: orderId, paymentId, signature |

---

## 6. Flow diagram (simplified)

```
[Post Ad page load]
       │
       ▼
GET /ads/check-limit ──► hidePremiumSection, hideSingleBuy, canPost, businessAdsRemaining, ...
       │
       ▼
[User fills form; Step 5 shown only if !hidePremiumSection]
       │
       ▼
[Submit]
       │
       ├─ Has quota & no premium ──► POST /ads ──► createAd (business or free deduction) ──► My Ads
       │
       ├─ No quota or premium ──► POST /premium/ad-posting/order
       │        │
       │        ├─ requiresPayment: false ──► POST /ads (no paymentOrderId) ──► My Ads
       │        │
       │        └─ requiresPayment: true ──► Razorpay ──► POST /premium/ad-posting/verify
       │                    │
       │                    └─ POST /ads (with paymentOrderId) ──► My Ads
       │
       └─ Had quota + selected premium ──► POST /ads first ──► then payment order + Razorpay ──► My Ads
```

---

See also: **AD_POSTING_LOGIC.md** (rules and implementation mapping), **backend/services/adPostingLogicService.js** (single source for status and visibility flags).

# Ads Promotion, Subscription & Credit System

## Overview

- **Subscription plans** (Business Basic ₹299, Pro ₹399, Enterprise ₹499) give **plan priority** for ad visibility.
- **Credit-based promotions** (TOP Ad, Featured, Bump Up) give **paid boost** on top of plan.
- **Priority order:** TOP Ads > Featured Ad > Bump Up > Subscription (Enterprise > Pro > Basic) > Normal.

---

## 1. Subscription Plans & Priority

| Plan              | Price  | Priority (number) | Use in ranking      |
|-------------------|--------|-------------------|----------------------|
| Normal / Free     | ₹0     | 0                 | Lowest              |
| Business Basic    | ₹299   | 1                 | MAX_VISIBILITY      |
| Business Pro      | ₹399   | 2                 | SELLER_PLUS         |
| Business Enterprise | ₹499 | 3                 | SELLER_PRIME        |

- Priority is stored as `Ad.packageType` (NORMAL, MAX_VISIBILITY, SELLER_PLUS, SELLER_PRIME).
- Ranking uses numeric priority: **Enterprise (3) > Pro (2) > Basic (1) > Normal (0)**.

---

## 2. Credit-Based Promotions

| Promotion  | Credits | Effect                          | Duration   |
|-----------|---------|----------------------------------|------------|
| TOP Ad    | 1000    | Exclusive top section of search | 7 days     |
| Featured  | 2121    | Pin to top of category          | 7 days     |
| Bump Up   | 50      | Move to top                     | 24 hours   |

- Credits are stored on **User**: `creditsBalance`, `creditsUsed`.
- **CreditTransaction** records every credit add/deduct (PURCHASE, TOP_AD, FEATURED_AD, BUMP_UP, REFUND, ADMIN_CREDIT/ADMIN_DEBIT).
- Config in DB: `PremiumSettings` key `promotion_credit_config` (see `services/promotionConfigService.js`).

---

## 3. Promotion Flow

1. User buys credits (future: purchase flow; for now admin can grant via DB or admin API).
2. User calls **POST /api/credits/promote/:adId** with body `{ "type": "TOP" | "FEATURED" | "BUMP_UP" }`.
3. Backend:
   - Checks promotion type is enabled.
   - Loads credit cost from config.
   - Verifies ad exists, belongs to user, status APPROVED.
   - **Deducts credits** in a DB transaction (prevents double spend).
   - Updates ad: `isPremium`, `premiumType`, `promotionStartAt`, `premiumExpiresAt`, `featuredAt` / `bumpedAt` / `lastBumpedAt`, `boostCount` (for Bump).
4. Response returns new `balanceAfter`, transaction summary, and updated ad snippet.

---

## 4. Credit Deduction Logic

- **Server-side only:** All deduction in `creditService.deduct()` inside a Prisma transaction.
- **Atomic:** Read balance → check sufficient → decrement balance, increment `creditsUsed` → insert CreditTransaction.
- **Insufficient credits:** API returns 400 with `code: 'INSUFFICIENT_CREDITS'`.
- No client can “fake” a boost; only this API can deduct and set promotion.

---

## 5. Priority & Rotation Logic

- **Order (same for Home, Category, Search):**
  1. **TOP** (active) – rotated within tier by `lastShownAt` + location.
  2. **Featured** (active, within 7 days) – rotated within tier.
  3. **Bump Up** (active, within 24h) – rotated within tier.
  4. **By plan:** Enterprise → Pro → Basic → Normal; within each plan, ads rotated by `lastShownAt` + location.
- **Rotation:** `adRankingService.rotateAdsInGroup()` sorts by location score, then oldest `lastShownAt`, then random tie-break. Optional `updateLastShown: true` updates `lastShownAt` for returned ads.

---

## 6. Expiry System

- **Featured:** 7 days from `featuredAt`. Cron every hour: `expireFeaturedAds()` clears `isPremium`, `premiumType`, `featuredAt`, etc.
- **Bump Up:** 24h from `lastBumpedAt`. Cron every hour: `expireBumpAds()` clears promotion fields so ad reverts to plan-only ranking until user bumps again.
- **TOP:** By `premiumExpiresAt` (e.g. 7 days). Cron every hour: `expireTopAds()` clears TOP promotion when expired.
- Expired ads keep their **subscription** (packageType); only the **paid promotion** is removed.

---

## 7. Homepage / Category / Search Behavior

- **Homepage:** Same ranking: TOP → Featured → Bump → Enterprise → Pro → Basic → Normal. Optional: limit TOP section to first N slots.
- **Category page:** Featured first (pinned to category), then Enterprise → Pro → Basic → Normal.
- **Search results:** TOP Ads section at top, then Enterprise, then mix of Pro (e.g. 20–30% of first page) and Basic + Normal. Implementation uses same `rankAds()` from `adRankingService.js`; context can be extended later for search-specific caps.

---

## 8. New / Updated DB Fields

**User**

- `creditsBalance` (Int, default 0)
- `creditsUsed` (Int, default 0)

**Ad**

- `promotionType` (PremiumType? – TOP | FEATURED | BUMP_UP)
- `promotionStartAt` (DateTime?)
- `lastBumpedAt` (DateTime?)
- `boostCount` (Int, default 0)

**New model: CreditTransaction**

- id, userId, amount, balanceAfter, type (enum), referenceId, description, createdAt

**New enum: CreditTransactionType**

- PURCHASE, TOP_AD, FEATURED_AD, BUMP_UP, REFUND, ADMIN_CREDIT, ADMIN_DEBIT

---

## 9. Cron Jobs

- **:15 every hour:** Expire Featured and TOP promotions (`expireFeaturedAds`, `expireTopAds`).
- **:45 every hour:** Expire Bump Up promotions (`expireBumpAds`).
- **Every 2.5h:** Ad rotation cycle (update `lastShownAt` for fairness).

---

## 10. API Endpoints

| Method | Path                      | Auth | Description                    |
|--------|---------------------------|------|--------------------------------|
| GET    | /api/credits/balance      | Yes  | Current credit balance & used  |
| GET    | /api/credits/history     | Yes  | Transaction history            |
| GET    | /api/credits/config      | No   | Credit costs, durations, plans |
| POST   | /api/credits/promote/:adId | Yes  | Activate TOP / FEATURED / BUMP_UP (body: `{ "type": "TOP" }`) |

---

## 11. Admin (To Extend)

- **Enable/disable promotions:** Update `promotion_credit_config` in PremiumSettings (`promotionsEnabled.TOP/FEATURED/BUMP_UP`).
- **View credit usage:** Query CreditTransaction by userId or type.
- **Force expiry:** Set ad’s `premiumExpiresAt` to past or call a small admin script that runs `expireFeaturedAds`/`expireBumpAds`/`expireTopAds`.
- **Manual boosts:** Grant credits via `creditService.add(userId, amount, 'ADMIN_CREDIT', null, 'Manual grant')`.

---

## 12. UI Hooks

- **Badges:** Show “TOP”, “Featured”, “Bump” (or “Promoted”) from `ad.premiumType` / `ad.isPremium`.
- **Countdown:** Use `ad.premiumExpiresAt` for “X days left” or “Expires at …”.
- **Credit balance:** GET `/api/credits/balance` and show in navbar or “Promote” modal.
- **Promote button:** Call POST `/api/credits/promote/:adId` with selected type; on success refresh balance and ad.

---

## 13. Security

- All credit deduction and promotion activation are **server-side**.
- Ad ownership checked before any promotion.
- Only APPROVED ads can be promoted.
- Double spending prevented by transactional deduct and single promotion activation per request.

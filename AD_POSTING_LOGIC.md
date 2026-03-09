# Ad Posting Logic – Classifieds Platform

Canonical rules for ad posting, package validation, ranking, repeat visibility, and promotions. **All values must be loaded from backend (DB/config); no hardcoded values in frontend.**

---

## 1. CHECK USER STATUS

When a user tries to post an ad, the backend must expose:

| Field | Source | Description |
|-------|--------|-------------|
| `active_package` | `GET /api/business-package/status` → `hasActivePackage` | User has at least one active (non-expired) business package |
| `remaining_ads` | Same → `adsRemaining` (or sum of `totalAdsAllowed - adsUsed` per package) | Ads left in active package(s) |
| `credits_balance` | User.creditsBalance (e.g. `/api/user/profile` or credits API) | Available promotion credits |

**Backend:** Implement a single “posting status” (e.g. `GET /api/ads/check-limit` or `/api/ads/posting-status`) that returns the above plus `mode`, `canPost`, and costs (see below).

---

## 2. POSTING RULES

| Condition | Mode | Allow post? | UI behaviour |
|-----------|------|-------------|--------------|
| `active_package === true` AND `remaining_ads > 0` | **BUSINESS** | Yes | Show package selector; **hide Single Buy / Premium option** until all business ads are exhausted |
| `active_package === false` | **SINGLE** | Yes | Enable single buy, bump, featured |
| `active_package === true` AND `remaining_ads === 0` | — | **Block** | Show upgrade option; allow single buy (pay per ad) |

- **Package selector:** When mode = BUSINESS, user selects which package slot to use (if multiple).
- **Single buy:** When mode = SINGLE or when blocked (package exhausted), user can pay for one ad (or premium).

---

## 3. AFTER POST ACTIONS

**If Mode = BUSINESS**

- Deduct **1** ad from the chosen (or first available) active package (`adsUsed += 1`).
- Set `ad_type` = **TOP** (or package tier used for ranking; backend defines mapping).
- Apply backend **priority** and **repeat** rules.
- Set **expiry** from backend config (e.g. `AdConfig.AD_EXPIRY_DAYS` or DB).

**If Mode = SINGLE**

- Set `ad_type` = **NORMAL**.
- Apply backend priority.
- Set expiry from backend config.

*(In this codebase, `ad_type` is represented as `packageType` on the Ad model: e.g. NORMAL, MAX_VISIBILITY, SELLER_PLUS, SELLER_PRIME. TOP-style visibility is either packageType from business package or premiumType TOP/FEATURED/BUMP_UP.)*

---

## 4. FEATURED RULE

- **If** user activates **featured** for an ad  
- **And** `credits_balance >= featured_cost` (cost from backend, e.g. `GET /api/credits/config` → `creditsPerPromotion.FEATURED`)  
- **Then:**  
  - Deduct `featured_cost` credits.  
  - Pin ad (featured).  
  - Set `featured_expiry` from backend (e.g. `promotionDurationDays.FEATURED`).

---

## 5. BUMP RULE

- **If** `bump_enabled === true` (from backend config)  
- **And** `credits_balance >= bump_cost` (from `credits/config`)  
- **Then:**  
  - Deduct `bump_cost` credits.  
  - Refresh ad timestamp (e.g. `bumpedAt` / `lastBumpedAt`).  
  - Apply boost in ranking.

---

## 6. REPEAT SYSTEM

Run **daily** (cron/scheduler):

- **If** `repeat_remaining > 0`  
- **And** `today === next_repeat_date`  
- **Then:**  
  - Boost ad (e.g. bump visibility).  
  - Reduce `repeat_remaining` by 1.

*(Repeat config and fields are backend-defined; frontend does not hardcode.)*

---

## 7. RANKING FORMULA

Backend sorts ads by a **final_score** (or equivalent priority order), e.g.:

```
final_score =
  package_priority
  + repeat_weight
  + featured_weight
  + bump_weight
  + freshness_score
  + visibility_multiplier
```

Sort **DESC**. Implemented in: `adRankingService`, `locationWiseAdRankingService`, `promotionConfigService` (plan priority, promotion weights). All weights and multipliers must come from backend config.

---

## 8. EXPIRY RULE

- **If** `today > expiry_date` (ad’s `expiresAt`)  
- **Then:** Deactivate ad (e.g. set status to EXPIRED or exclude from listing).

Backend/cron should run this; frontend can hide expired ads based on API response.

---

## 9. ADMIN CONTROL

- **All** numeric values, limits, costs, and flags (e.g. featured_cost, bump_cost, FREE_ADS_LIMIT, AD_EXPIRY_DAYS, bump_enabled) must be **loaded from backend** (DB or server config).
- Frontend must **not** hardcode limits or prices; it should call APIs such as:
  - `GET /api/credits/config` – credit costs and durations
  - `GET /api/business-package/status` – package and remaining_ads
  - `GET /api/ads/check-limit` or `/api/ads/posting-status` – unified posting status and mode

---

## Implementation mapping

| Rule | Backend | Frontend |
|------|---------|----------|
| 1. User status | `business-package/status`, user profile/credits, `ads/check-limit` (or posting-status) | Call same APIs; no local constants for limits/costs |
| 2. Posting rules | posting-status returns `mode`, `canPost`, `blockReason` | Show/hide package selector, bump, single buy per mode; block and show upgrade when canPost false |
| 3. After post | AdService.createAd: if BUSINESS deduct 1 from package, set ad.packageType; if SINGLE set NORMAL; set expiresAt from config | — |
| 4. Featured | Credits API + promotion activation (deduct, set featured_expiry) | Show “Featured” only if credits ≥ cost; cost from API |
| 5. Bump | Same; deduct credits, update bumpedAt | Same; cost from API |
| 6. Repeat | Cron job; repeat_remaining and next_repeat_date from backend | — |
| 7. Ranking | adRankingService, config-driven weights | — |
| 8. Expiry | Cron or query filter on expiresAt | Filter by API response |
| 9. Admin | All config in DB (e.g. PremiumSettings, promotion_credit_config) | No hardcoded values |

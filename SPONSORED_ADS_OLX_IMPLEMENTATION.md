# Sponsored Ads – OLX-Style Implementation Summary

## Overview

Implementation follows the Malayalam prompt: location + category based sponsored ads with normal ad fallback; no white space; no Google Maps on user side.

---

## 1. Location Handling (OLX-Style)

**User side: NO Google Maps/Places**
- Location from navbar: State → District → City (OSM/static list)
- Stored in `localStorage` (`selected_location`)
- Persists across refresh
- Default: All India

**Google Maps: Admin panel only** (for exact address selection)

**Components updated:**
- `InjectedAdSlot` – removed `useGoogleLocation`, uses `useLocationPersistence` only
- `FreshRecommendationsOGNOX` – removed `useGoogleLocation`, uses `useLocationPersistence` only
- `FreshRecommendationsOLX` – removed `useGoogleLocation`, uses `useLocationPersistence` only

---

## 2. Sponsored Ads Location Priority (Backend)

Order: **City → District → State → All India → Global → Any**

- **LEVEL 1:** City match
- **LEVEL 2:** District match (new)
- **LEVEL 3:** State match
- **LEVEL 4:** Country (All India)
- **LEVEL 5:** Global (platform defaults)
- **LEVEL 6:** Any active with category
- **LEVEL 7:** Any active (no category)

**API:** `GET /api/sponsored-ads?location=&city=&state=&district=&category=&size=`

---

## 3. Ad Sizes (OLX-Style)

| Size   | Dimensions | Ratio |
|--------|------------|-------|
| Small  | 300×300    | 1:1   |
| Medium | 800×450    | 16:9  |
| Large  | 1200×675   | 16:9  |
| Auto   | 600×400    | -     |
| All    | 600×500    | -     |

---

## 4. White Space Rule

**Sponsored slot is never empty.**

Fallback order:
1. **Sponsored ad** (location + category match)
2. **Normal ad** (same location + category)
3. **Post Ad Free** (admin/platform promo)

**Components:**
- `InjectedAdSlot` – fetches sponsored ads; if none, fetches 1 normal ad; if none, shows Post Ad Free
- Used in: Ads page sidebar, Post-ad page sidebar

---

## 5. Files Changed

### Frontend
- `frontend/components/ads/InjectedAdSlot.tsx` – location, fallback logic
- `frontend/components/ads/AdsFilterSidebar.tsx` – added `InjectedAdSlot`
- `frontend/components/FreshRecommendationsOGNOX.tsx` – removed Google Location
- `frontend/components/FreshRecommendationsOLX.tsx` – removed Google Location

### Backend
- `backend/routes/sponsored-ads.js` – District level, ad sizes

---

## 6. One-Line Logic

> "Location + category base cheyth sponsored ads priority order-ൽ show ചെയ്യുന്നു; sponsored ad ഇല്ലെങ്കിൽ UI-ൽ white space ഒഴിവാക്കാൻ same slot-ൽ normal ad fallback use ചെയ്യുന്നു."

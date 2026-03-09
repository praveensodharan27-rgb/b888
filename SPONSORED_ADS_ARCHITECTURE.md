# Smart Location-Based Sponsored Ads System – Architecture

## Overview

A scalable, location-aware sponsored ads engine for marketplace listings and product detail pages. Supports GPS + manual location, normalized slugs, category targeting, budget tracking, rotation, and analytics.

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Web / Mobile)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  Location Sources (Priority Order):                                         │
│  1. Navbar filter (selected_location) → persisted to localStorage           │
│  2. GPS + Google Reverse Geocoding → google_location_data                   │
│  3. Ad context (viewing Mumbai ad → use Mumbai)                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API LAYER (Node.js/Express)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  GET /api/sponsored-ads?location=&city=&state=&latitude=&longitude=&category=&size= │
│                                                                             │
│  Fallback Chain: city → state → country → global → any                      │
│  Query Params: location (slug), city, state, lat/lng, category, size        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SPONSORED ADS SERVICE (MongoDB)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  • findManyRaw() – optimized query with projection                           │
│  • Sort: priority DESC, budget DESC, lastShownAt ASC (rotation)              │
│  • Filter: status=active, budget>0, date range (UTC)                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema (MongoDB)

```javascript
// SponsoredAd collection
{
  _id: ObjectId,
  title: String,
  bannerImage: String?,
  bannerVideo: String?,
  description: String?,
  ctaType: String,           // call | whatsapp | website
  ctaLabel: String?,
  redirectUrl: String?,
  targetLocations: [String], // Normalized slugs: ["mumbai", "kochi", "ernakulam"]
  categorySlug: String?,     // Exact match: "cars", "mobiles", "property"
  adSize: String,           // small | medium | large | auto
  startDate: Date?,
  endDate: Date?,
  budget: Float,
  priority: Int,
  status: String,           // active | paused | expired
  impressions: Int,
  clicks: Int,
  lastShownAt: Date?,      // For rotation fairness
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes (for performance)

```javascript
{ status: 1, targetLocations: 1, categorySlug: 1 }
{ status: 1, priority: -1, lastShownAt: 1 }
{ status: 1, budget: -1, lastShownAt: 1 }
{ startDate: 1, endDate: 1 }
```

---

## 3. Location Normalization

All location slugs use the same format:

- **Lowercase**
- **Hyphen-separated** (spaces → `-`)
- **Alphanumeric + hyphen only** (remove special chars)

```javascript
// utils/locationSlug.js
function normalizeLocationSlug(name) {
  return String(name).trim().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}
// "New Delhi" → "new-delhi"
// "Mumbai" → "mumbai"
```

Used for:

- Storing `targetLocations` in admin
- Comparing request params with DB
- Reverse geocoding output

---

## 4. API Flow

### Request

```
GET /api/sponsored-ads?location=mumbai&category=cars&size=medium
```

### Matching Logic (Fallback Chain)

| Level | Condition | Example |
|-------|-----------|---------|
| 1 | City slug in `targetLocations` OR platform default | Mumbai |
| 2 | State slug in `targetLocations` OR platform default | Maharashtra |
| 3 | Country (india/all-india) OR platform default | India |
| 4 | Platform default (empty `targetLocations`), any category | Global |
| 5 | Any active ad with budget > 0 | Last resort |

### Category Matching

- If `category` is provided: **exact match** on `categorySlug`
- If not: no category filter (show any ad)

### Date Validation (UTC)

```javascript
const utcToday = new Date(Date.UTC(
  now.getUTCFullYear(),
  now.getUTCMonth(),
  now.getUTCDate()
));
// startDate <= utcToday, endDate >= utcToday
```

### Ad Size

- Allowed: `small`, `medium`, `large`, `auto`
- Query matches exact size or `auto` (auto can fill any slot)

---

## 5. Budget & Impression Tracking

- **Budget**: Ads with `budget > 0` are preferred
- **Impressions**: `POST /api/sponsored-ads/:id/impression`
- **Clicks**: `POST /api/sponsored-ads/:id/click`
- **Rotation**: Sort by `lastShownAt` ASC so least-recently-shown ads get priority

---

## 6. Analytics

- **CTR**: `clicks / impressions * 100`
- **Per-ad**: impressions, clicks, CTR
- **Admin**: `/admin/sponsored-ads/analytics`

---

## 7. Frontend Integration

### InjectedAdSlot Component

- **Pages**: Ad detail (`/ads/[id]`), Listing (`/ads`), Post ad (`/post-ad`)
- **Props**: `locationSlug`, `locationCity`, `locationState`, `categorySlug`
- **Location resolution**: `useLocationPersistence` > `useGoogleLocation` > ad context
- **Fallback UI**: Placeholder when no ad (no empty section)

### Location Hooks

- `useLocationPersistence`: Navbar selection → `selected_location`
- `useGoogleLocation`: GPS/Places → `google_location_data`

---

## 8. High Availability & Fallbacks

1. **Location fallback**: city → state → country → global → any
2. **Category fallback**: exact → no category filter
3. **Size fallback**: exact → `auto`
4. **API error**: Return `{ ad: null }` instead of 500
5. **No ads**: Show placeholder, never blank section

---

## 9. Optimization Strategy

1. **Projection**: Only fetch needed fields in MongoDB
2. **Indexes**: Compound indexes for common filters
3. **Limit**: Max 10 ads per query, pick first
4. **Caching**: Optional Redis for hot ads (future)
5. **Debug mode**: Set `DEBUG_SPONSORED_ADS=true` in `.env` to log filter mismatches and picked ads

---

## 10. Mobile Considerations

- GPS via `navigator.geolocation`
- Reverse geocoding for lat/lng → city/state
- Responsive ad sizes: small, medium, large
- Touch-friendly CTA buttons

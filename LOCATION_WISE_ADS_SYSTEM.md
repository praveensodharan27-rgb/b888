# Location-Wise Ads Promotion & Ranking System

OLX-style marketplace feed with location-prioritized ranking, paid promotions, and sponsored ad injection.

## Overview

- **Home page**: Shows ALL ads (no location filter), ranked by user's location + promotion tier
- **Priority order**: TOP → Featured → Bump → Enterprise → Pro → Basic → Normal
- **Sponsored ads**: Injected after every 6 normal ads (location-based)
- **Fair rotation**: Within each tier, ads rotate by `lastShownAt` for fairness

## Backend

### Service: `locationWiseAdRankingService.js`

- `getHomeFeedAds(options)` – Main entry; fetches all ads, ranks by location + tier, injects sponsored
- `rankAdsByLocation(ads, userLocation, config)` – Segments by promotion tier, applies rotation
- `injectSponsoredAds(normalAds, sponsoredAds, everyN)` – Inserts sponsored every N slots
- `fetchSponsoredAds(userLocation, category, limit)` – Fetches location-matched sponsored ads

### API: `GET /api/ads/home-feed`

**Query params:**
- `page`, `limit` – Pagination
- `city`, `state`, `location` – User location (for ranking context)
- `latitude`, `longitude` – Optional (for future geospatial)
- `category`, `subcategory` – Optional filters

**Response:**
```json
{
  "success": true,
  "ads": [
    { "id": "...", "title": "...", ... },
    { "id": "sp1", "_type": "sponsored", "title": "...", "bannerImage": "..." }
  ],
  "pagination": { "page": 1, "limit": 12, "total": 150, "totalPages": 13 }
}
```

### Indexes (MongoDB)

Ensure these exist on `ads` collection:
- `status`, `expiresAt`, `createdAt`
- `city`, `state`, `state + city`
- `isPremium`, `premiumType`, `packageType`
- `lastShownAt` (rotation)

## Frontend

### Hook: `useHomeFeed(filters)`

- Calls `GET /api/ads/home-feed` with location context
- Supports `latitude`, `longitude` in filters
- Pagination via `getNextPageParam`

### Components

- **FreshRecommendationsOGNOX** – Renders feed; branches on `item._type === 'sponsored'` for SponsoredAdFeedCard
- **SponsoredAdFeedCard** – Renders sponsored banner/card ads with click tracking

### Location Context Flow

1. Navbar/Google → persisted location (city, state, coords)
2. Home page → `locationFilter` from `locationChanged` or localStorage
3. FreshRecommendationsOGNOX → `homeFeedFilters` from persisted + props
4. useHomeFeed → API with city, state, latitude, longitude

## Database Schema (Suggested)

```prisma
model Ad {
  // ... existing fields
  targetLocations String[] @default([])  // Multi-location: ["kochi", "trivandrum"]
  lastShownAt     DateTime?              // For fair rotation
  packageType     BusinessPackageType    // NORMAL | MAX_VISIBILITY | SELLER_PLUS | SELLER_PRIME
  premiumType     PremiumType?           // TOP | FEATURED | BUMP_UP
  premiumExpiresAt DateTime?
}
```

## Scalability

- **Caching**: Redis cache (2 min TTL) per location+page combo
- **Pool size**: Fetches 500 ads for ranking, slices by page
- **Indexes**: Compound indexes on `(status, createdAt)`, `(city, state)`
- **Future**: Shard by region; use geospatial index for lat/lng

## Multi-Location Targeting (Future)

Add `targetLocations: String[]` to Ad. When set, ad is eligible in those locations only. When empty, use ad's city/state.

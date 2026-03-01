# Ad Ranking + Rotation System

Production-ready smart ranking for OLX-style marketplace with paid business plans.

## Plans (Priority Order)

| Plan | Price | packageType | Visibility |
|------|--------|-------------|------------|
| **Business Enterprise** | ₹499/month | SELLER_PRIME | Homepage + category top, first in search, verified badge, unlimited boosts |
| **Business Pro** | ₹399/month | SELLER_PLUS | Category top below Enterprise, first 20–30% in search, featured badge, limited boosts |
| **Business Basic** | ₹299/month | MAX_VISIBILITY | Medium visibility, normal category top, no homepage highlight, no auto boost |
| **Free** | — | NORMAL | Standard listing |

## Ranking Order

1. **Featured ads** (paid featured, within configurable duration) → top
2. **Bump-up ads** (paid bump, within configurable duration) → next
3. **By plan**: Enterprise > Pro > Basic > Free
4. **Within same plan**: Fair rotation by `lastShownAt` (oldest first), then location (same city/state first), then random tie-break

Filters (category, location, price, condition) are applied first; paid ads are **not** hidden by filters—they stay on top within the filtered set.

## Database

### Existing (used by ranking)

- **Ad**: `packageType`, `lastShownAt`, `featuredAt`, `bumpedAt`, `premiumExpiresAt`, `city`, `state`
- **PremiumSettings**: key `ad_rank_config` stores JSON config (featured duration, boost limits, etc.)
- **BusinessPackage / UserBusinessPackage**: active plan per user

### New (optional audit)

- **AdRankLog**: `adId`, `context`, `contextId`, `planTier`, `position`, `featured`, `bumped`, `lastShownAt`, `createdAt`

### Sample queries (MongoDB/Prisma)

```javascript
// Approved ads in a category, for ranking pool
const pool = await prisma.ad.findMany({
  where: {
    status: 'APPROVED',
    categoryId: categoryId,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
  },
  take: 300,
  orderBy: { createdAt: 'desc' },
  include: { user: true, category: true, location: true }
});

// Rotation: oldest lastShownAt per plan
const toRotate = await prisma.ad.findMany({
  where: {
    status: 'APPROVED',
    packageType: 'SELLER_PLUS',
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
  },
  orderBy: [{ lastShownAt: 'asc' }, { createdAt: 'asc' }],
  take: 50,
  select: { id: true }
});
```

## Config (PremiumSettings `ad_rank_config`)

| Key | Default | Description |
|-----|---------|-------------|
| featuredDurationDays | 7 | Days featured ad stays on top |
| bumpDurationDays | 1 | Days bump stays on top |
| rotationIntervalHours | 2.5 | Reorder within plan every N hours |
| proSearchPercent | 25 | Target % of first page for Pro |
| enterpriseSearchPercent | 10 | Target % for Enterprise |
| basicSearchPercent | 15 | Target % for Basic |
| boostLimits | { NORMAL: 0, MAX_VISIBILITY: 2, SELLER_PLUS: 5, SELLER_PRIME: -1 } | Boosts per plan (-1 = unlimited) |
| disableRotation | false | Turn off rotation cron |
| manualPriorityOverrides | {} | adId → rank (admin override) |

## Rotation cron (every 2.5 hours)

- **Service**: `services/adRotationService.js` → `runRotationCycle()`
- **Cron**: `utils/cron.js` — runs at 0:00, 2:30, 5:00, 7:30, … (every 2.5h)
- For each plan tier (SELLER_PRIME → SELLER_PLUS → MAX_VISIBILITY → NORMAL), selects up to 50 ads with oldest (or null) `lastShownAt` and sets `lastShownAt = now`, then clears ads cache.

## Redis cache

- **Key pattern**: `ads:rank:{category}:{subcategory}:{location}:{city}:{state}:{page}:{limit}`
- **TTL**: 150 seconds (2.5 min)
- **Helpers**: `utils/redis-helpers.js` → `getCachedAds`, `cacheAds`, `clearAdsCache`
- Rotation job and admin “clear cache” invalidate ranked caches so next request gets fresh order.

## API examples

### List ads (ranked when sort=newest)

```http
GET /api/ads?category=electronics&page=1&limit=20&sort=newest
GET /api/ads?city=Mumbai&state=Maharashtra&page=1&limit=20
```

Response: `{ ads, total, page, limit, totalPages }`. Ads are ordered by ranking (featured → bump → plan → rotation).

### Admin: get rank config

```http
GET /api/admin/rank-config
Authorization: Bearer <admin_jwt>
```

Response: `{ success: true, config: { featuredDurationDays, rotationIntervalHours, boostLimits, ... } }`

### Admin: update rank config

```http
PUT /api/admin/rank-config
Authorization: Bearer <admin_jwt>
Content-Type: application/json

{
  "featuredDurationDays": 7,
  "bumpDurationDays": 1,
  "rotationIntervalHours": 2.5,
  "boostLimits": { "NORMAL": 0, "MAX_VISIBILITY": 2, "SELLER_PLUS": 5, "SELLER_PRIME": -1 },
  "disableRotation": false
}
```

### Admin: run rotation now

```http
POST /api/admin/rank-config/rotate-now
Authorization: Bearer <admin_jwt>
```

Response: `{ success: true, rotated: 120, at: "2025-01-28T12:00:00.000Z" }`

## Performance

- **Ranking**: Applied in-memory on a pool of up to 300 ads per request; pool fetched in one query. Target API response &lt; 200ms with Redis cache.
- **Cache**: First request per (category/location/page/limit) fills Redis; subsequent requests served from cache for 2.5 min.
- **Rotation**: Batch updates by plan; cron runs every 2.5h so DB write load is bounded.

## Files

| File | Purpose |
|------|---------|
| `prisma/schema.mongodb.prisma` | AdRankLog model (optional), Ad fields (packageType, lastShownAt, featuredAt, bumpedAt) |
| `services/adRankConfigService.js` | Read/write rank config from PremiumSettings |
| `services/adRankingService.js` | rankAds(), plan priority, featured/bump, rotation within plan, location score |
| `services/adRotationService.js` | runRotationCycle() for cron |
| `utils/cron.js` | Schedule rotation every 2.5h |
| `src/application/services/AdService.js` | getAds() uses rank + Redis when sort=newest |
| `src/infrastructure/database/repositories/AdRepository.js` | findManyRaw() for ranking pool |
| `routes/admin.js` | GET/PUT /rank-config, POST /rank-config/rotate-now |

## Apply schema change (AdRankLog)

If you added the `AdRankLog` model:

```bash
cd backend
npx prisma generate
# If using MongoDB: no migration; ensure collection is created on first write or create manually.
```

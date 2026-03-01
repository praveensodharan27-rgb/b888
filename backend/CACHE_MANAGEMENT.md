# Server Cache Management

## Overview

- **Redis** is used for API response caching when available.
- **TTL** values are in **seconds**; the middleware normalizes values (e.g. if > 86400, treats as ms and converts).
- **Cache-Control** headers are set on cached responses for client/CDN.
- **X-Cache: HIT | MISS** header indicates whether the response was served from cache.

## Configuration

- **`config/cache-config.js`** – Central TTL values (all in seconds):

| Key               | Default | Description              |
|-------------------|---------|--------------------------|
| ADS_LIST_TTL      | 60      | Ads listing (1 min)      |
| ADS_SINGLE_TTL    | 300     | Single ad (5 min)        |
| ADS_FILTERS_TTL   | 60      | Filter schema (1 min)   |
| ADS_RANK_TTL      | 150     | Ranked ads (2.5 min)    |
| CATEGORIES_TTL    | 600     | Categories (10 min)     |
| LOCATIONS_TTL     | 600     | Locations (10 min)     |
| FILTERS_TTL       | 600     | Filters (10 min)        |
| MAX_TTL           | 3600    | Max TTL (1 hour)        |

## Admin Endpoints

- **`GET /api/admin/cache/stats`** – Cache stats (size, keys, Redis availability). Uses **await** on async cache helpers.
- **`POST /api/admin/cache/clear`** – Clear cache.
  - Body: `{ "pattern": "ads:*" }` – clear by pattern.
  - Body: `{}` or `{ "pattern": "all" }` – clear all (Redis FLUSHDB) and ad-rank cache.

## Middleware

- **`middleware/cache.js`**
  - `cacheMiddleware(ttlSeconds)` – Caches GET responses in Redis. Skips cache when Redis is unavailable (no extra logs in production).
  - `clearCache(pattern)` – Clear by pattern; no pattern or `"all"` clears entire DB.
  - `getCacheSize()`, `getCacheKeys(pattern)` – Return **Promises**; admin route uses **await**.

## Redis

- **`config/redis.js`** – Connection, `setCache`/`getCache`/`deleteCacheByPattern`/`clearAllCache`, `getCacheStats`.
- Redis errors/reconnect logs are limited to **development** to reduce noise.

## Cache-Busting

Requests with query params `_t`, `_cb`, `timestamp`, `nocache`, `refresh` skip cache.

## Clearing Cache

1. **Admin**: `POST /api/admin/cache/clear` with optional `pattern`.
2. **Rotation**: Ad rotation job calls `clearAdsCache()` after each cycle.
3. **Script**: `node scripts/clear-server-cache.js` (if present).

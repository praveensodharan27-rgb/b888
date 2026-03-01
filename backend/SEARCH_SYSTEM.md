# Search System

Text search is wired end-to-end: when the user types a query, results use **Meilisearch** when available, with a **Prisma fallback** when Meilisearch is down.

## Flow

1. **GET /api/ads?search=...** (and optional category, location, price, etc.)
   - If `search` is present:
     - **Meilisearch** is called with the query and current filters (category, location, price, condition, sort).
     - Results are full ad documents (with user, category, location) fetched from Prisma in **relevance order**.
     - If you also use attribute filters (e.g. brand, model), they are applied in memory after search.
   - If Meilisearch is unavailable or errors:
     - **Fallback:** Prisma filters by `title` or `description` containing the search term (case-insensitive).
     - Same category/location/price filters apply.

2. **Without `search`**
   - Listing works as before: filters + ranking (or plain sort), no text matching.

## Meilisearch

- **Index:** `ads` (title, description, category, location, city, state, neighbourhood, tags).
- **Filterable:** categoryId, subcategoryId, locationId, status, condition, price, etc.
- **Sortable:** createdAt, price, featuredAt, bumpedAt, rankingPriority.
- **Typo tolerance:** enabled (fuzzy matching).

Start Meilisearch (optional; app works without it):

```bash
# e.g. Docker
docker run -d -p 7700:7700 getmeili/meilisearch
```

Set in `.env`:

- `MEILISEARCH_HOST=http://localhost:7700`
- `MEILISEARCH_MASTER_KEY=your-key`

Reindex all approved ads:

```bash
node scripts/reindex-meilisearch.js
```

## Autocomplete

The service exposes `autocomplete(query, limit)` for search suggestions. You can add a route (e.g. GET /api/ads/autocomplete?q=...) and call it from the frontend search box.

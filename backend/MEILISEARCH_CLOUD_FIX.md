# Meilisearch "no Route matched" (404) fix

Your Meilisearch Cloud host is returning **404** for `/health`. That usually means the **Host URL** in `.env` is wrong for Cloud.

## Option 1: Use local Meilisearch (recommended for dev)

In `backend/.env` set:

```env
MEILI_HOST=http://127.0.0.1:7700
MEILI_API_KEY=masterKey
MEILI_INDEX=ads
```

Remove or comment out any line like `MEILISEARCH_HOST=https://ms-...` so the app uses the local host.

Then:

1. Start Meilisearch: `npm run meilisearch:start` (from `backend`; needs Docker).
2. Test: `npm run test-meilisearch`.
3. Restart your backend server.

Search will use Meilisearch; you can run a full reindex later if needed: `npm run reindex-meilisearch`.

---

## Option 2: Fix Meilisearch Cloud URL

1. Open [Meilisearch Cloud](https://cloud.meilisearch.com) → your project.
2. Copy the **Host** exactly as shown (often `https://ms-xxxx.region.meilisearch.io` with **no path**, no trailing slash).
3. In **API Keys**, copy the **Master Key** (full access), not a search-only key.
4. In `backend/.env`:

   ```env
   MEILI_HOST=https://ms-xxxxx-xxxxx-xxxxx.fra.meilisearch.io
   MEILI_API_KEY=<paste Master Key>
   MEILI_INDEX=ads
   ```

5. Run `npm run test-meilisearch` again.

If you still get 404, your Cloud plan or region might use a different API base; use **Option 1** (local) for development.

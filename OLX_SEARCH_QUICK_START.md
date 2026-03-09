# 🚀 OLX Search System - Quick Start Guide

## ⚡ 5-Minute Setup

### Step 1: Start Meilisearch (Choose One)

**Option A: Docker (Recommended)**
```bash
docker run -d -p 7700:7700 \
  -e MEILI_MASTER_KEY=masterKey123 \
  --name meilisearch \
  getmeili/meilisearch
```

**Option B: Cloud (Production)**
1. Sign up at https://cloud.meilisearch.com/
2. Create a project
3. Copy your host URL and API key

### Step 2: Configure Environment

Add to `backend/.env`:
```env
MEILI_HOST=http://localhost:7700
MEILI_MASTER_KEY=masterKey123
MEILI_INDEX=ads
```

### Step 3: Initialize Index

```bash
cd backend
node scripts/init-meilisearch-olx.js
```

### Step 4: Index Your Ads

```bash
npm run reindex-meilisearch
```

### Step 5: Test Search

Open browser: `http://localhost:3000/search-olx?q=iphone`

---

## 🎯 Usage Examples

### 1. Simple Search
```
/search-olx?q=iphone
```

### 2. Search with Location
```
/search-olx?q=car&location=Mumbai
```

### 3. Search with Price Range
```
/search-olx?q=laptop&minPrice=20000&maxPrice=50000
```

### 4. Search with Category
```
/search-olx?q=phone&category=Electronics
```

### 5. Sorted Results
```
/search-olx?q=bike&sort=price_low
```

---

## 🔧 Common Commands

### Reindex All Ads
```bash
cd backend
npm run reindex-meilisearch
```

### Check Meilisearch Status
```bash
curl http://localhost:7700/health
```

### View Indexed Documents
```bash
curl http://localhost:7700/indexes/ads/documents?limit=10
```

### Clear Index
```bash
curl -X DELETE http://localhost:7700/indexes/ads
```

---

## 🎨 Integration Examples

### Add Search Bar to Navbar

```tsx
import OLXSearchBar from '@/components/search/OLXSearchBar';

export default function Navbar() {
  return (
    <nav>
      <div className="max-w-7xl mx-auto px-4">
        <OLXSearchBar showButton={true} />
      </div>
    </nav>
  );
}
```

### Custom Search Page

```tsx
'use client';

import { useSearch } from '@/hooks/useSearch';
import SearchResultsGrid from '@/components/search/SearchResultsGrid';

export default function MySearchPage() {
  const { results, total, isSearching, search } = useSearch({
    autoSearch: true,
    category: 'Electronics',
  });

  return (
    <div>
      <h1>Search Results: {total}</h1>
      <SearchResultsGrid
        results={results}
        total={total}
        page={1}
        totalPages={1}
        isLoading={isSearching}
      />
    </div>
  );
}
```

### Bump Ad Button

```tsx
import api from '@/lib/api';

function BumpButton({ adId }: { adId: string }) {
  const handleBump = async () => {
    try {
      const res = await api.post(`/search/bump/${adId}`);
      if (res.data.success) {
        alert('Ad bumped to top!');
      }
    } catch (error) {
      alert('Failed to bump ad');
    }
  };

  return (
    <button onClick={handleBump} className="btn-primary">
      Bump to Top
    </button>
  );
}
```

---

## 📊 Plan Priority System

| Plan Type   | Priority | Badge Color | Cooldown |
|-------------|----------|-------------|----------|
| Enterprise  | 4        | Purple      | 6 hours  |
| Pro         | 3        | Orange      | 6 hours  |
| Basic       | 2        | Blue        | 12 hours |
| Normal      | 1        | None        | 24 hours |

---

## 🎯 Ranking Order

1. **Top Ads** (isTopAdActive = true)
2. **Featured Ads** (isFeaturedActive = true)
3. **Plan Priority** (Enterprise > Pro > Basic > Normal)
4. **Newest First** (createdAt desc)

---

## 🔍 Search Features

✅ Multi-word search ("kochi car")
✅ Typo tolerance ("iphon" → "iphone")
✅ Partial search ("iph" → suggestions)
✅ Synonyms (car → vehicle)
✅ Location boost
✅ Expired ads hidden
✅ Instant autocomplete
✅ Recent searches
✅ Trending searches

---

## 🐛 Troubleshooting

### Search Returns No Results

1. Check Meilisearch is running:
   ```bash
   curl http://localhost:7700/health
   ```

2. Check ads are indexed:
   ```bash
   curl http://localhost:7700/indexes/ads/stats
   ```

3. Reindex:
   ```bash
   npm run reindex-meilisearch
   ```

### Autocomplete Not Working

1. Check minimum query length (2 chars)
2. Check API endpoint: `GET /api/search/suggestions?q=iph`
3. Check browser console for errors

### Bump Not Working

1. Verify user is logged in
2. Check ad belongs to user
3. Check bump cooldown period
4. Check ad status is "APPROVED"

---

## 📈 Performance Tips

1. **Use pagination** - Don't load all results at once
2. **Cache API calls** - Use Redis or memory cache
3. **Debounce input** - 300ms is optimal
4. **Optimize images** - Use Next.js Image component
5. **Index only needed fields** - Reduce index size

---

## 🎉 You're Ready!

Your OLX-style search system is now live! 🚀

**Test it:**
1. Visit `/search-olx?q=test`
2. Try autocomplete
3. Check badges on results
4. Test bump functionality

**Need help?** Check `OLX_SEARCH_SYSTEM_COMPLETE.md` for detailed docs.

# 🚀 Search System - Quick Reference Card

## 📦 Installation (One-Time Setup)

```bash
# 1. Start Meilisearch
docker run -d -p 7700:7700 getmeili/meilisearch

# 2. Setup search system
cd backend
node scripts/setup-search-system.js

# 3. Test
node scripts/test-search-system.js
```

## 🎨 Usage

### Basic Search Bar

```tsx
import SmartSearchBar from '@/components/search/SmartSearchBar';

<SmartSearchBar placeholder="Search..." />
```

### Full Search Page

```tsx
import SearchResultsPage from '@/components/search/SearchResultsPage';

<SearchResultsPage showFilters={true} />
```

### Mobile Search

```tsx
import MobileSearchOverlay from '@/components/search/MobileSearchOverlay';

<MobileSearchOverlay 
  isOpen={show}
  onClose={() => setShow(false)}
/>
```

## 🧠 Natural Language Examples

```
"iPhone in Kochi"              → search=iPhone&location=kochi
"Car under 5 lakh"             → search=Car&maxPrice=500000
"Laptop above 50000"           → search=Laptop&minPrice=50000
"Bike between 50k and 1L"      → search=Bike&minPrice=50000&maxPrice=100000
"Used furniture in Bangalore"  → search=Used furniture&location=bangalore
```

## 🔌 API Endpoints

```bash
# Autocomplete
GET /api/ads/autocomplete?q=iphone&limit=8

# Search
GET /api/ads?search=iphone&location=kochi&minPrice=10000&maxPrice=50000

# Popular searches
GET /api/ads/popular-searches?limit=10
```

## 🛠️ Utilities

```typescript
// Parse query
import { parseSearchQuery } from '@/utils/searchParser';
const parsed = parseSearchQuery("iPhone in Kochi");
// { keywords: "iPhone", location: "Kochi" }

// Build URL
import { buildSearchUrl } from '@/utils/searchParser';
const url = buildSearchUrl(parsed);
// "/ads?search=iPhone&location=kochi"

// Save recent search
import { saveRecentSearch } from '@/utils/searchParser';
saveRecentSearch("iPhone in Kochi");

// Get recent searches
import { getRecentSearches } from '@/utils/searchParser';
const recent = getRecentSearches(10);
```

## 🎯 Filter Parameters

| Parameter | Type | Example |
|-----------|------|---------|
| `search` | string | `iphone` |
| `location` | string | `kochi` |
| `category` | string | `mobiles` |
| `subcategory` | string | `smartphones` |
| `minPrice` | number | `10000` |
| `maxPrice` | number | `50000` |
| `condition` | enum | `NEW`, `USED`, `LIKE_NEW`, `REFURBISHED` |
| `sort` | enum | `newest`, `oldest`, `price_low`, `price_high`, `featured` |
| `fuelType` | enum | `PETROL`, `DIESEL`, `ELECTRIC`, `CNG`, `HYBRID` |
| `brand` | string | `apple` |
| `model` | string | `iphone-13` |
| `page` | number | `1` |
| `limit` | number | `20` |

## 🏆 Ranking Order

```
1. Exact title match
2. Premium ads (⭐)
3. Business package ads (💼)
4. Same city/location
5. Newest ads
6. Featured/bumped ads
7. Free ads
```

## 🧪 Test Commands

```bash
# Full test suite
node backend/scripts/test-search-system.js

# Reindex ads
node backend/scripts/reindex-meilisearch.js

# Check Meilisearch
curl http://localhost:7700/health

# Test autocomplete
curl "http://localhost:5000/api/ads/autocomplete?q=iphone"

# Test search
curl "http://localhost:5000/api/ads?search=iphone&location=kochi"
```

## 📱 Pages

| URL | Description |
|-----|-------------|
| `/search` | Standalone search page |
| `/search-demo` | Demo with examples |
| `/ads?search=...` | Search results (existing) |

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| No suggestions | Check Meilisearch: `curl http://localhost:7700/health` |
| No results | Reindex: `node scripts/reindex-meilisearch.js` |
| Location not detected | Add city to `INDIAN_CITIES` in `searchParser.ts` |
| Price not parsed | Use: lakh, cr, k, thousand |
| Slow performance | Check Meilisearch is running |

## 📚 Documentation Files

- `SEARCH_SYSTEM_README.md` - Main docs
- `ADVANCED_SEARCH_SYSTEM.md` - Technical details
- `SEARCH_INTEGRATION_GUIDE.md` - Integration steps
- `NAVBAR_SEARCH_UPGRADE.md` - Navbar upgrade
- `SEARCH_SYSTEM_SUMMARY.md` - Implementation summary
- `SEARCH_QUICK_REFERENCE.md` - This file

## ✨ Key Features

- ✅ Natural language parsing
- ✅ Location detection (100+ cities)
- ✅ Price extraction (lakh, cr, k)
- ✅ Real-time autosuggest
- ✅ Recent searches (10 max)
- ✅ Popular searches
- ✅ Mobile overlay
- ✅ Advanced filters
- ✅ Intelligent ranking
- ✅ SEO-friendly URLs
- ✅ Performance optimized
- ✅ Analytics ready

## 🎉 You're Ready!

Try: **"iPhone in Kochi under 50000"** 🚀

---

**Need help?** Check `SEARCH_SYSTEM_README.md` for detailed documentation.

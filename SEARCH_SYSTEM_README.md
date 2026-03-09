# 🔍 Advanced OLX-Like Search System

A comprehensive, intelligent search system for your marketplace with natural language processing, location detection, and advanced filtering.

## ✨ Features

### 🧠 Intelligent Query Parsing
- **Location detection**: "iPhone in Kochi" → extracts "Kochi" as location
- **Price parsing**: "Car under 5 lakh" → sets max price to ₹5,00,000
- **Natural language**: Understands "above", "below", "between", "under", "over"
- **Multi-parameter**: "Used car in Mumbai under 3 lakh" → all parameters extracted

### 🎯 Smart Autosuggest
- **Real-time suggestions** as you type (200ms debounce)
- **Product suggestions** from Meilisearch with typo tolerance
- **Recent searches** stored locally (up to 10)
- **Popular searches** for discovery
- **Category & location hints** in suggestions

### 📱 Mobile-First Design
- **Full-screen overlay** for mobile devices
- **Large touch targets** (44px minimum)
- **Recent searches** with individual delete
- **Popular searches** as chips
- **Swipe-friendly** interface

### 🎨 Advanced Filtering
- **Price range** (min/max)
- **Condition** (New, Used, Like New, Refurbished)
- **Fuel type** (Petrol, Diesel, Electric, CNG, Hybrid)
- **Posted time** (24h, 3d, 7d, 30d)
- **Sort options** (Newest, Price, Featured)
- **Brand/Model** filtering

### 🚀 Performance Optimized
- **Debounced search** (200ms)
- **API caching** (1-5 minutes)
- **Lazy loading** for heavy components
- **Infinite scroll** support
- **Loading skeletons** for better UX
- **Meilisearch** for fast full-text search

### 🏆 Intelligent Ranking
1. **Exact title match** (highest priority)
2. **Premium ads** (rankingPriority: 3)
3. **Business package ads** (rankingPriority: 2)
4. **Same city/location** (location-aware)
5. **Newest ads** (createdAt desc)
6. **Featured/bumped ads**

## 📦 Components

### Frontend Components

| Component | Path | Description |
|-----------|------|-------------|
| `SmartSearchBar` | `frontend/components/search/SmartSearchBar.tsx` | Main search input with autosuggest |
| `AutosuggestDropdown` | `frontend/components/search/AutosuggestDropdown.tsx` | Dropdown with suggestions |
| `MobileSearchOverlay` | `frontend/components/search/MobileSearchOverlay.tsx` | Full-screen mobile search |
| `SearchResultsPage` | `frontend/components/search/SearchResultsPage.tsx` | Results page with filters |
| `AdvancedFilterSidebar` | `frontend/components/search/AdvancedFilterSidebar.tsx` | Collapsible filter sidebar |

### Utilities

| Utility | Path | Description |
|---------|------|-------------|
| `searchParser` | `frontend/utils/searchParser.ts` | Parse natural language queries |
| `useSmartSearch` | `frontend/hooks/useSmartSearch.ts` | React hook for search |
| `searchAnalytics` | `backend/utils/searchAnalytics.js` | Track search metrics |

### Backend

| File | Path | Description |
|------|------|-------------|
| `meilisearch.js` | `backend/services/meilisearch.js` | Meilisearch integration |
| `AdController` | `backend/src/presentation/controllers/AdController.js` | Search endpoints |
| `adRoutes.js` | `backend/src/presentation/routes/adRoutes.js` | Search routes |

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Frontend (already installed)
cd frontend
npm install

# Backend (already installed)
cd backend
npm install
```

### 2. Start Meilisearch

```bash
# Using Docker
docker run -d -p 7700:7700 getmeili/meilisearch

# Or download binary from https://www.meilisearch.com/
```

### 3. Configure Environment

```env
# backend/.env
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_MASTER_KEY=your-master-key
MEILISEARCH_INDEX=ads
```

### 4. Index Ads

```bash
cd backend
node scripts/reindex-meilisearch.js
```

### 5. Test Search

```bash
# Test the search system
node scripts/test-search-system.js
```

### 6. Use in Your App

```tsx
// In any page or component
import SmartSearchBar from '@/components/search/SmartSearchBar';

export default function MyPage() {
  return (
    <SmartSearchBar placeholder="Search products..." />
  );
}
```

## 📖 Usage Examples

### Basic Search

```tsx
import SmartSearchBar from '@/components/search/SmartSearchBar';

<SmartSearchBar 
  placeholder="Search products, brands, locations..."
  autoFocus={false}
/>
```

### Search Results Page

```tsx
import SearchResultsPage from '@/components/search/SearchResultsPage';

<SearchResultsPage showFilters={true} />
```

### Mobile Search

```tsx
import { useState } from 'react';
import MobileSearchOverlay from '@/components/search/MobileSearchOverlay';

const [showSearch, setShowSearch] = useState(false);

<button onClick={() => setShowSearch(true)}>Search</button>

<MobileSearchOverlay 
  isOpen={showSearch}
  onClose={() => setShowSearch(false)}
/>
```

### Programmatic Search

```typescript
import { parseSearchQuery, buildSearchUrl, saveRecentSearch } from '@/utils/searchParser';
import { useRouter } from 'next/navigation';

const router = useRouter();

// Parse natural language query
const parsed = parseSearchQuery("iPhone in Kochi under 50000");
// Result: { keywords: "iPhone", location: "Kochi", price: { max: 50000 } }

// Build SEO-friendly URL
const url = buildSearchUrl(parsed);
// Result: "/ads?search=iPhone&location=kochi&maxPrice=50000"

// Save to recent searches
saveRecentSearch("iPhone in Kochi under 50000");

// Navigate
router.push(url);
```

## 🎯 Natural Language Examples

### Location Detection

```
"iPhone in Kochi"           → search=iPhone&location=kochi
"Car at Mumbai"             → search=Car&location=mumbai
"Laptop near Bangalore"     → search=Laptop&location=bangalore
"Furniture in Delhi"        → search=Furniture&location=delhi
```

### Price Detection

```
"Car under 5 lakh"          → search=Car&maxPrice=500000
"Laptop above 50000"        → search=Laptop&minPrice=50000
"Bike between 50k and 1L"   → search=Bike&minPrice=50000&maxPrice=100000
"House under 1 cr"          → search=House&maxPrice=10000000
```

### Combined Queries

```
"iPhone in Kochi under 50000"
→ search=iPhone&location=kochi&maxPrice=50000

"Used car in Mumbai above 2 lakh"
→ search=Used car&location=mumbai&minPrice=200000

"New laptop in Bangalore between 40000 and 80000"
→ search=New laptop&location=bangalore&minPrice=40000&maxPrice=80000
```

## 🔌 API Endpoints

### 1. Search Ads

```
GET /api/ads?search=<query>&location=<slug>&category=<slug>&minPrice=<number>&maxPrice=<number>
```

**Parameters:**
- `search` - Search keywords
- `location` - Location slug (e.g., "kochi", "mumbai")
- `category` - Category slug
- `subcategory` - Subcategory slug
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `condition` - NEW, USED, LIKE_NEW, REFURBISHED
- `sort` - newest, oldest, price_low, price_high, featured
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)
- `brand` - Brand filter
- `model` - Model filter
- `fuelType` - Fuel type (for vehicles)

**Response:**
```json
{
  "success": true,
  "ads": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### 2. Autocomplete

```
GET /api/ads/autocomplete?q=<query>&limit=<number>
```

**Parameters:**
- `q` - Search query (min 2 chars)
- `limit` - Max suggestions (default: 8, max: 20)

**Response:**
```json
{
  "success": true,
  "suggestions": [
    {
      "title": "iPhone 13 Pro",
      "category": "Mobiles",
      "subcategory": "Mobile Phones",
      "location": "Kochi"
    }
  ]
}
```

### 3. Popular Searches

```
GET /api/ads/popular-searches?limit=<number>
```

**Parameters:**
- `limit` - Max searches (default: 10)

**Response:**
```json
{
  "success": true,
  "searches": ["iPhone", "Car", "Laptop", ...]
}
```

## 🛠️ Configuration

### Supported Cities (100+)

Major cities are pre-configured in `searchParser.ts`:
- Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata
- Pune, Kochi, Jaipur, Ahmedabad, Surat, Lucknow
- And 80+ more cities

**To add new cities:**
```typescript
// frontend/utils/searchParser.ts
const INDIAN_CITIES = [
  // ... existing cities
  'yourcity',
];
```

### Supported States

All Indian states are pre-configured:
- Kerala, Karnataka, Tamil Nadu, Maharashtra, Delhi
- Gujarat, Rajasthan, West Bengal, Madhya Pradesh
- And all other states

### Price Units

Supported units:
- `lakh` / `lakhs` → × 100,000
- `cr` / `crore` → × 10,000,000
- `k` / `thousand` → × 1,000

### Popular Searches

Customize in `searchAnalytics.js`:
```javascript
popularSearchesCache = [
  'iPhone',
  'Car',
  'Laptop',
  // Add your popular searches
];
```

## 🎨 Customization

### Change Debounce Time

```typescript
// In useSmartSearch hook
const { ... } = useSmartSearch({
  debounceMs: 300, // Default: 200ms
});
```

### Modify Suggestion Count

```typescript
// In SmartSearchBar
const response = await api.get('/ads/autocomplete', {
  params: { q: query, limit: 10 }, // Default: 8
});
```

### Custom Ranking

Modify `calculateRankingPriority` in `backend/services/meilisearch.js`:

```javascript
function calculateRankingPriority(ad) {
  if (ad.isPremium) return 5;        // Highest
  if (ad.isFeatured) return 4;
  if (ad.packageType === 'BUSINESS') return 3;
  if (ad.isBumped) return 2;
  return 1;                          // Default
}
```

## 📊 Performance

### Benchmarks

| Operation | Target | Typical |
|-----------|--------|---------|
| Autocomplete | < 200ms | ~150ms |
| Search | < 500ms | ~300ms |
| Filter options | < 300ms | ~200ms |
| Popular searches | < 100ms | ~50ms |

### Caching Strategy

| Endpoint | Cache Duration | Strategy |
|----------|----------------|----------|
| `/autocomplete` | 1 minute | Redis/Memory |
| `/popular-searches` | 5 minutes | Memory |
| `/ads` (search) | 2.5 minutes | Redis |
| `/filter-options` | 5 minutes | Redis |

## 🧪 Testing

### Manual Testing

```bash
# 1. Test autocomplete
curl "http://localhost:5000/api/ads/autocomplete?q=iphone"

# 2. Test search
curl "http://localhost:5000/api/ads?search=iphone&location=kochi"

# 3. Test popular searches
curl "http://localhost:5000/api/ads/popular-searches"

# 4. Run full test suite
node backend/scripts/test-search-system.js
```

### Test Queries

Try these queries in the search bar:
1. `iPhone in Kochi`
2. `Car under 5 lakh in Mumbai`
3. `Laptop above 50000`
4. `Bike between 50000 and 100000`
5. `Used furniture in Bangalore`
6. `New mobile phones`

## 🐛 Troubleshooting

### Autocomplete not working

**Symptoms:** No suggestions appear when typing

**Solutions:**
1. Check if query is at least 2 characters
2. Verify Meilisearch is running:
   ```bash
   curl http://localhost:7700/health
   ```
3. Check browser console for errors
4. Test API directly:
   ```bash
   curl "http://localhost:5000/api/ads/autocomplete?q=test"
   ```

### Search returns no results

**Symptoms:** "No results found" for valid queries

**Solutions:**
1. Reindex ads:
   ```bash
   node backend/scripts/reindex-meilisearch.js
   ```
2. Verify ads are APPROVED status
3. Check if filters are too restrictive
4. Try without filters

### Location not detected

**Symptoms:** Location not extracted from query

**Solutions:**
1. Check if city is in INDIAN_CITIES list
2. Add missing city to `searchParser.ts`
3. Use correct spelling (case-insensitive)
4. Use patterns: "in <city>", "at <city>", "near <city>"

### Price not parsed

**Symptoms:** Price not extracted from query

**Solutions:**
1. Use supported units: lakh, cr, k, thousand
2. Use supported patterns: "under X", "above X", "between X and Y"
3. Check number format (no commas, use dots for decimals)

### Meilisearch connection failed

**Symptoms:** Search falls back to database

**Solutions:**
1. Start Meilisearch:
   ```bash
   docker run -d -p 7700:7700 getmeili/meilisearch
   ```
2. Check environment variables:
   ```env
   MEILISEARCH_HOST=http://localhost:7700
   MEILISEARCH_MASTER_KEY=your-key
   ```
3. Check logs for connection errors

## 📚 Documentation

- **[Advanced Search System](./ADVANCED_SEARCH_SYSTEM.md)** - Complete technical documentation
- **[Integration Guide](./SEARCH_INTEGRATION_GUIDE.md)** - Step-by-step integration
- **[Search System](./backend/SEARCH_SYSTEM.md)** - Backend architecture

## 🎓 Demo

Visit `/search-demo` to see the search system in action with example queries and features showcase.

## 🔄 Migration from Old Search

### Before (Simple Search)

```tsx
<input
  type="text"
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  onKeyPress={(e) => {
    if (e.key === 'Enter') {
      router.push(`/ads?search=${query}`);
    }
  }}
/>
```

### After (Smart Search)

```tsx
import SmartSearchBar from '@/components/search/SmartSearchBar';

<SmartSearchBar placeholder="Search products..." />
```

**Benefits:**
- ✅ Automatic location detection
- ✅ Price parsing
- ✅ Autosuggest
- ✅ Recent searches
- ✅ Popular searches
- ✅ Better UX

## 🎯 Best Practices

### 1. Always Save Searches
```typescript
import { saveRecentSearch } from '@/utils/searchParser';
saveRecentSearch(query);
```

### 2. Use URL Parameters
```typescript
// ✅ Good - SEO friendly, shareable
/ads?search=iphone&location=kochi&minPrice=10000

// ❌ Bad - Not shareable
/ads (with state only)
```

### 3. Handle Empty States
```tsx
{ads.length === 0 && (
  <EmptyState
    title="No results found"
    description="Try adjusting your search or filters"
    actionLabel="Clear filters"
    onAction={clearFilters}
  />
)}
```

### 4. Show Loading States
```tsx
{loading && <AdsGridSkeleton count={12} />}
```

### 5. Debounce Autosuggest
```typescript
// Already implemented (200ms)
// Prevents API spam
```

## 📈 Analytics (Future)

The system is ready for analytics integration:

```javascript
// Track searches
logSearch(query, resultsCount, userId, filters);

// Get popular searches
const popular = await getPopularSearches(10);

// Get zero-result queries
const zeroResults = await getZeroResultQueries(20);

// Get statistics
const stats = await getSearchStats();
```

## 🔮 Future Enhancements

- [ ] Voice search integration
- [ ] Image search (search by photo)
- [ ] AI-powered suggestions
- [ ] Personalized results
- [ ] Saved searches with alerts
- [ ] Search filters presets
- [ ] Advanced operators (AND, OR, NOT)
- [ ] Search analytics dashboard
- [ ] A/B testing for ranking
- [ ] Synonym support

## 🤝 Contributing

When adding new features:

1. Update this README
2. Add tests to `test-search-system.js`
3. Update documentation files
4. Test on mobile devices
5. Check performance impact

## 📝 License

Part of the SellIt marketplace project.

## 🆘 Support

For issues:
1. Check [Troubleshooting](#-troubleshooting) section
2. Review logs: `backend/logs/`
3. Test Meilisearch health: `curl http://localhost:7700/health`
4. Check browser console for frontend errors

## 🎉 Success!

Your advanced search system is now ready! Try searching with natural language queries like:

- "iPhone in Kochi"
- "Car under 5 lakh in Mumbai"
- "Laptop above 50000"

Enjoy the intelligent search experience! 🚀

# Advanced OLX-Like Search System

## Overview

A comprehensive, intelligent search system for the marketplace with natural language processing, location detection, and advanced filtering capabilities.

## Architecture

### Frontend Components

1. **SmartSearchBar** (`frontend/components/search/SmartSearchBar.tsx`)
   - Intelligent search input with autosuggest
   - Real-time query parsing
   - Location and price detection
   - Recent searches support

2. **AutosuggestDropdown** (`frontend/components/search/AutosuggestDropdown.tsx`)
   - Product suggestions from Meilisearch
   - Recent searches display
   - Popular searches
   - Category and location suggestions

3. **MobileSearchOverlay** (`frontend/components/search/MobileSearchOverlay.tsx`)
   - Full-screen mobile search experience
   - Recent searches management
   - Popular searches
   - Touch-optimized UI

4. **SearchResultsPage** (`frontend/components/search/SearchResultsPage.tsx`)
   - Results grid with pagination
   - Filter integration
   - Empty states
   - Loading skeletons

5. **AdvancedFilterSidebar** (`frontend/components/search/AdvancedFilterSidebar.tsx`)
   - Collapsible filter sections
   - Price range
   - Condition, fuel type, posted time
   - Sort options

### Backend Components

1. **Meilisearch Service** (`backend/services/meilisearch.js`)
   - Full-text search with typo tolerance
   - Fuzzy matching
   - Autocomplete suggestions
   - Ranking: Premium > Business > Free

2. **Autocomplete API** (`/api/ads/autocomplete`)
   - Fast suggestions (< 200ms)
   - Limit configurable (default 8)
   - Graceful fallback on error

3. **Search API** (`/api/ads?search=...`)
   - Multi-parameter filtering
   - Location-aware results
   - Price range filtering
   - Brand/model filtering

### Utilities

1. **Search Parser** (`frontend/utils/searchParser.ts`)
   - Natural language query parsing
   - Location extraction ("iPhone in Kochi")
   - Price detection ("Car under 5 lakh")
   - Recent searches management

## Features

### 1. Intelligent Query Parsing

```typescript
// Examples:
"iPhone in Kochi" 
→ { keywords: "iPhone", location: "Kochi" }

"Car under 5 lakh in Mumbai" 
→ { keywords: "Car", price: { max: 500000 }, location: "Mumbai" }

"Laptop above 50000" 
→ { keywords: "Laptop", price: { min: 50000 } }
```

### 2. Location Detection

- Detects 100+ Indian cities
- Detects all Indian states
- Patterns: "in <location>", "at <location>", "near <location>"
- Auto-converts to URL-friendly slugs

### 3. Price Parsing

Supports multiple formats:
- "under 5 lakh" → max: 500000
- "above 50000" → min: 50000
- "between 10000 and 50000" → min: 10000, max: 50000
- Units: lakh, cr/crore, k/thousand

### 4. Search Ranking Priority

1. **Exact title match** (highest priority)
2. **Premium ads** (rankingPriority: 3)
3. **Business package ads** (rankingPriority: 2)
4. **Same city/location** (location-aware)
5. **Newest ads** (createdAt desc)
6. **Featured/bumped ads** (featuredAt, bumpedAt)

### 5. Autosuggest

- Triggers after 2 characters
- Debounced (200ms)
- Shows up to 8 suggestions
- Displays: product title, category, location
- Recent searches (up to 10)
- Popular searches (hardcoded, can be dynamic)

### 6. Mobile Experience

- Full-screen overlay
- Large touch targets
- Recent searches with delete
- Popular searches as chips
- Swipe-friendly UI

### 7. Performance Optimizations

- **Debounced search** (200ms)
- **Lazy loading** for heavy components
- **Meilisearch caching** (built-in)
- **API response caching** (5 min for filters)
- **Infinite scroll** support
- **Loading skeletons** for better UX

### 8. SEO-Friendly URLs

```
/ads?search=iphone&location=kochi&category=mobiles
/ads?search=car&minPrice=100000&maxPrice=500000&location=mumbai
/ads?category=electronics&subcategory=laptops&condition=NEW
```

## Usage

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
import MobileSearchOverlay from '@/components/search/MobileSearchOverlay';

const [showSearch, setShowSearch] = useState(false);

<MobileSearchOverlay 
  isOpen={showSearch}
  onClose={() => setShowSearch(false)}
/>
```

### Programmatic Search

```typescript
import { parseSearchQuery, buildSearchUrl } from '@/utils/searchParser';

const query = "iPhone in Kochi under 50000";
const parsed = parseSearchQuery(query);
// { keywords: "iPhone", location: "Kochi", price: { max: 50000 } }

const url = buildSearchUrl(parsed);
// "/ads?search=iPhone&location=kochi&maxPrice=50000"

router.push(url);
```

## API Endpoints

### 1. Search Ads
```
GET /api/ads?search=<query>&location=<slug>&category=<slug>&minPrice=<number>&maxPrice=<number>
```

**Parameters:**
- `search` - Search keywords
- `location` - Location slug
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

## Search Behavior

### 1. Global Search Input

Detects:
- **Product keywords**: "iPhone", "Car", "Laptop"
- **Location**: "in Kochi", "at Mumbai", "near Delhi"
- **Price**: "under 5 lakh", "above 50000", "between 10k and 50k"

### 2. Location-Aware Search

- If location exists → filter by location
- If not → show nearby results (using coordinates)
- Support "near me" using browser geolocation

### 3. Empty States

When no results:
- Show "No results found" message
- Suggest clearing filters
- Show popular categories
- Offer to search without filters

### 4. Filter Persistence

- Filters stored in URL params
- Shareable URLs
- Browser back/forward support
- No state loss on refresh

## Meilisearch Configuration

### Index Settings

```javascript
{
  searchableAttributes: [
    'title',
    'description',
    'category',
    'city',
    'state',
    'neighbourhood',
    'location',
    'tags'
  ],
  filterableAttributes: [
    'categoryId',
    'subcategoryId',
    'locationId',
    'status',
    'condition',
    'price',
    'isPremium',
    'userId',
    'createdAt'
  ],
  sortableAttributes: [
    'createdAt',
    'price',
    'featuredAt',
    'bumpedAt',
    'rankingPriority'
  ],
  rankingRules: [
    'typo',
    'words',
    'proximity',
    'attribute',
    'sort',
    'exactness'
  ]
}
```

### Ranking Priority

- **Premium ads**: 3
- **Business package ads**: 2
- **Free ads**: 1

## Performance

### Optimizations

1. **Debouncing**: 200ms delay for autosuggest
2. **Lazy loading**: Heavy components loaded on demand
3. **Caching**: 
   - Meilisearch results cached
   - Filter options cached (5 min)
   - Recent searches in localStorage
4. **Infinite scroll**: Load more on demand
5. **Skeleton loading**: Better perceived performance

### Benchmarks

- Autosuggest: < 200ms
- Search results: < 500ms
- Filter options: < 300ms (cached)

## Mobile UX

### Features

1. **Full-screen overlay**
2. **Large touch targets** (44px min)
3. **Recent searches** with individual delete
4. **Popular searches** as chips
5. **Swipe to dismiss** (future enhancement)
6. **Keyboard optimization**

### Breakpoints

- Mobile: < 768px (full overlay)
- Tablet: 768px - 1024px (inline search)
- Desktop: > 1024px (with sidebar)

## Future Enhancements

1. **Voice search** integration
2. **Image search** (search by photo)
3. **AI-powered suggestions** (ML-based)
4. **Search analytics** (popular queries, zero-result queries)
5. **Personalized results** (based on user history)
6. **Saved searches** (with alerts)
7. **Search filters presets** (save filter combinations)
8. **Advanced operators** (AND, OR, NOT, quotes)

## Testing

### Manual Testing Checklist

- [ ] Search with simple keyword
- [ ] Search with location ("iPhone in Kochi")
- [ ] Search with price ("Car under 5 lakh")
- [ ] Search with multiple filters
- [ ] Autosuggest shows relevant results
- [ ] Recent searches work
- [ ] Popular searches work
- [ ] Mobile overlay works
- [ ] Filter sidebar works
- [ ] Clear filters works
- [ ] Pagination works
- [ ] Empty state shows correctly
- [ ] Loading states work
- [ ] URL params update correctly
- [ ] Browser back/forward works

### Example Queries to Test

1. "iPhone in Kochi"
2. "Car under 5 lakh in Mumbai"
3. "Laptop above 50000"
4. "Bike between 50000 and 100000"
5. "Furniture in Bangalore"
6. "Mobile phones"
7. "Used cars in Delhi"
8. "New laptops under 1 lakh"

## Troubleshooting

### Meilisearch Not Working

1. Check if Meilisearch is running:
   ```bash
   curl http://localhost:7700/health
   ```

2. Check environment variables:
   ```
   MEILISEARCH_HOST=http://localhost:7700
   MEILISEARCH_MASTER_KEY=your-key
   ```

3. Reindex all ads:
   ```bash
   node backend/scripts/reindex-meilisearch.js
   ```

### Autocomplete Not Showing

1. Check minimum query length (2 chars)
2. Check API endpoint: `/api/ads/autocomplete?q=test`
3. Check browser console for errors
4. Verify Meilisearch is available

### Search Results Empty

1. Check if ads are indexed in Meilisearch
2. Verify ad status is APPROVED
3. Check filter combinations (might be too restrictive)
4. Try clearing all filters

## Configuration

### Environment Variables

```env
# Meilisearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_MASTER_KEY=your-master-key
MEILISEARCH_INDEX=ads

# Or use MEILI_* prefix (takes precedence)
MEILI_HOST=http://localhost:7700
MEILI_MASTER_KEY=your-master-key
MEILI_INDEX=ads
```

### Customization

**Search placeholder examples** (in Navbar):
```typescript
const SEARCH_EXAMPLES = [
  'Find Cars, Mobile Phones and more...',
  'Buy smartphones near you',
  'Sell your bike quickly',
  // Add more...
];
```

**Popular searches** (in searchParser.ts):
```typescript
export function getPopularSearches(): string[] {
  return [
    'iPhone',
    'Car',
    'Laptop',
    // Add more...
  ];
}
```

**Indian cities** (in searchParser.ts):
```typescript
const INDIAN_CITIES = [
  'mumbai', 'delhi', 'bangalore',
  // Add more...
];
```

## Integration

### Replace Existing Search

To replace the current navbar search with the smart search:

```tsx
import SmartSearchBar from '@/components/search/SmartSearchBar';

// In your layout or page
<SmartSearchBar />
```

### Add to Existing Page

```tsx
import SearchResultsPage from '@/components/search/SearchResultsPage';

export default function AdsPage() {
  return <SearchResultsPage showFilters={true} />;
}
```

### Standalone Search Page

Already created at `/search` - accessible via `/search` route.

## Best Practices

1. **Always save searches** to recent searches
2. **Debounce autosuggest** to avoid API spam
3. **Show loading states** for better UX
4. **Handle errors gracefully** (show empty array, not error)
5. **Use URL params** for all filters (shareable, SEO-friendly)
6. **Lazy load** heavy components
7. **Cache API responses** when possible
8. **Test on mobile** devices

## Maintenance

### Regular Tasks

1. **Monitor Meilisearch health** (auto health check every 60s)
2. **Reindex ads** when schema changes
3. **Update popular searches** based on analytics
4. **Review zero-result queries** for improvements
5. **Optimize ranking** based on user behavior

### Logs to Monitor

- `meilisearch_unavailable` - Meilisearch is down
- `meilisearch_search` - Search errors
- `meilisearch_autocomplete` - Autocomplete errors
- `Autocomplete error` - Controller errors

## Support

For issues or questions:
1. Check this documentation
2. Review backend logs
3. Test Meilisearch health endpoint
4. Verify environment variables
5. Check browser console for frontend errors

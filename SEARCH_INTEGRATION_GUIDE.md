# Search System Integration Guide

## Quick Start

### 1. Add Smart Search to Any Page

```tsx
import SmartSearchBar from '@/components/search/SmartSearchBar';

export default function MyPage() {
  return (
    <div>
      <SmartSearchBar 
        placeholder="Search products, brands, locations..."
        autoFocus={false}
      />
    </div>
  );
}
```

### 2. Use Search Results Page

```tsx
import SearchResultsPage from '@/components/search/SearchResultsPage';

export default function SearchPage() {
  return <SearchResultsPage showFilters={true} />;
}
```

### 3. Add Mobile Search Overlay

```tsx
import { useState } from 'react';
import MobileSearchOverlay from '@/components/search/MobileSearchOverlay';

export default function MyComponent() {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <>
      <button onClick={() => setShowSearch(true)}>
        Search
      </button>
      
      <MobileSearchOverlay
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
      />
    </>
  );
}
```

## Natural Language Search Examples

### Location Detection

```
Input: "iPhone in Kochi"
Output: /ads?search=iPhone&location=kochi

Input: "Car at Mumbai"
Output: /ads?search=Car&location=mumbai

Input: "Laptop near Bangalore"
Output: /ads?search=Laptop&location=bangalore
```

### Price Detection

```
Input: "Car under 5 lakh"
Output: /ads?search=Car&maxPrice=500000

Input: "Laptop above 50000"
Output: /ads?search=Laptop&minPrice=50000

Input: "Bike between 50000 and 100000"
Output: /ads?search=Bike&minPrice=50000&maxPrice=100000

Input: "House under 1 cr"
Output: /ads?search=House&maxPrice=10000000
```

### Combined Queries

```
Input: "iPhone in Kochi under 50000"
Output: /ads?search=iPhone&location=kochi&maxPrice=50000

Input: "Used car in Mumbai above 2 lakh"
Output: /ads?search=Used car&location=mumbai&minPrice=200000
```

## API Usage

### Search with Filters

```typescript
import api from '@/lib/api';

const response = await api.get('/ads', {
  params: {
    search: 'iPhone',
    location: 'kochi',
    category: 'mobiles',
    minPrice: 10000,
    maxPrice: 50000,
    condition: 'USED',
    sort: 'price_low',
    page: 1,
    limit: 20,
  }
});

const { ads, pagination } = response.data;
```

### Autocomplete

```typescript
import api from '@/lib/api';

const response = await api.get('/ads/autocomplete', {
  params: {
    q: 'iphone',
    limit: 8,
  }
});

const suggestions = response.data.suggestions;
// [{ title: 'iPhone 13 Pro', category: 'Mobiles', location: 'Kochi' }, ...]
```

### Popular Searches

```typescript
import api from '@/lib/api';

const response = await api.get('/ads/popular-searches', {
  params: { limit: 10 }
});

const searches = response.data.searches;
// ['iPhone', 'Car', 'Laptop', ...]
```

## Programmatic Search

### Parse and Navigate

```typescript
import { parseSearchQuery, buildSearchUrl, saveRecentSearch } from '@/utils/searchParser';
import { useRouter } from 'next/navigation';

const router = useRouter();

function handleSearch(query: string) {
  // Parse the query
  const parsed = parseSearchQuery(query);
  // { keywords: "iPhone", location: "Kochi", price: { max: 50000 } }
  
  // Save to recent searches
  saveRecentSearch(query);
  
  // Build URL
  const url = buildSearchUrl(parsed);
  // "/ads?search=iPhone&location=kochi&maxPrice=50000"
  
  // Navigate
  router.push(url);
}
```

### Custom Search Hook

```typescript
import { useSmartSearch } from '@/hooks/useSmartSearch';

function MySearchComponent() {
  const {
    query,
    setQuery,
    suggestions,
    loading,
    showSuggestions,
    setShowSuggestions,
    executeSearch,
    clearSearch,
  } = useSmartSearch({
    autoSuggest: true,
    debounceMs: 200,
    minQueryLength: 2,
  });

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
      />
      
      {showSuggestions && suggestions.map(s => (
        <div key={s.title} onClick={() => executeSearch(s.title)}>
          {s.title}
        </div>
      ))}
    </div>
  );
}
```

## Recent Searches Management

### Get Recent Searches

```typescript
import { getRecentSearches } from '@/utils/searchParser';

const recent = getRecentSearches(10);
// ['iPhone in Kochi', 'Car under 5 lakh', ...]
```

### Save Search

```typescript
import { saveRecentSearch } from '@/utils/searchParser';

saveRecentSearch('iPhone in Kochi');
```

### Clear Recent Searches

```typescript
import { clearRecentSearches } from '@/utils/searchParser';

clearRecentSearches();
```

## Filter Integration

### Update Filter

```typescript
import { useSearchParams, useRouter } from 'next/navigation';

const searchParams = useSearchParams();
const router = useRouter();

function updateFilter(key: string, value: any) {
  const params = new URLSearchParams(searchParams.toString());
  
  if (value === null || value === '') {
    params.delete(key);
  } else {
    params.set(key, String(value));
  }
  
  // Reset to page 1
  params.delete('page');
  
  router.push(`/ads?${params.toString()}`, { scroll: false });
}

// Usage
updateFilter('condition', 'NEW');
updateFilter('minPrice', '10000');
updateFilter('maxPrice', '50000');
```

### Clear All Filters

```typescript
function clearAllFilters() {
  const params = new URLSearchParams();
  const search = searchParams.get('search');
  
  // Keep search query
  if (search) params.set('search', search);
  
  router.push(`/ads?${params.toString()}`, { scroll: false });
}
```

## Ranking & Sorting

### Default Ranking (Newest)

```
Priority:
1. Premium ads (rankingPriority: 3)
2. Business package ads (rankingPriority: 2)
3. Free ads (rankingPriority: 1)
4. Newest first (createdAt desc)
```

### Sort Options

```typescript
// Available sort values
const sortOptions = [
  'newest',      // Newest first (default)
  'oldest',      // Oldest first
  'price_low',   // Price: Low to High
  'price_high',  // Price: High to Low
  'featured',    // Featured ads first
  'bumped',      // Bumped ads first
];

// Usage
updateFilter('sort', 'price_low');
```

## Mobile Optimization

### Responsive Breakpoints

```css
/* Mobile: Full overlay */
@media (max-width: 767px) {
  /* Use MobileSearchOverlay */
}

/* Tablet & Desktop: Inline search */
@media (min-width: 768px) {
  /* Use SmartSearchBar */
}
```

### Touch Targets

All interactive elements have minimum 44px touch target:

```tsx
<button className="min-h-[44px] min-w-[44px]">
  Search
</button>
```

## Performance Tips

### 1. Debouncing

```typescript
// Autosuggest is already debounced (200ms)
// Adjust in useSmartSearch hook if needed
const { ... } = useSmartSearch({
  debounceMs: 300, // Increase for slower connections
});
```

### 2. Lazy Loading

```typescript
// Heavy components are lazy loaded
const FilterSidebar = dynamic(() => import('@/components/search/AdvancedFilterSidebar'), {
  loading: () => <div>Loading...</div>,
});
```

### 3. Caching

```typescript
// API responses are cached
// Autocomplete: 1 minute
// Popular searches: 5 minutes
// Filter options: 5 minutes
```

### 4. Pagination

```typescript
// Use infinite scroll for better UX
const { hasMore, loadMore } = useAdsPaginated(filters);

{hasMore && (
  <button onClick={loadMore}>Load More</button>
)}
```

## SEO Best Practices

### URL Structure

```
✅ Good:
/ads?search=iphone&location=kochi&category=mobiles
/ads?search=car&minPrice=100000&maxPrice=500000

❌ Bad:
/ads?q=iphone
/ads?s=car&loc=mumbai
```

### Meta Tags

```tsx
import { Metadata } from 'next';

export async function generateMetadata({ searchParams }): Promise<Metadata> {
  const search = searchParams.search || '';
  const location = searchParams.location || '';
  
  return {
    title: `${search} ${location ? `in ${location}` : ''} - Buy & Sell`,
    description: `Find ${search} ${location ? `in ${location}` : ''} on our marketplace`,
  };
}
```

## Error Handling

### Graceful Degradation

```typescript
// Meilisearch down → Fallback to Prisma
// Autocomplete error → Show empty suggestions
// Network error → Show cached results

try {
  const results = await searchAds(query);
} catch (error) {
  // Fallback to database search
  const results = await prismaSearch(query);
}
```

### Empty States

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

## Testing

### Unit Tests

```javascript
// Test search parser
describe('parseSearchQuery', () => {
  it('should extract location', () => {
    const result = parseSearchQuery('iPhone in Kochi');
    expect(result.keywords).toBe('iPhone');
    expect(result.location).toBe('Kochi');
  });

  it('should extract price', () => {
    const result = parseSearchQuery('Car under 5 lakh');
    expect(result.keywords).toBe('Car');
    expect(result.price.max).toBe(500000);
  });
});
```

### Integration Tests

```javascript
// Test autocomplete API
describe('GET /ads/autocomplete', () => {
  it('should return suggestions', async () => {
    const res = await request(app)
      .get('/ads/autocomplete?q=iphone')
      .expect(200);
    
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.suggestions)).toBe(true);
  });
});
```

## Troubleshooting

### Issue: Autocomplete not working

**Solution:**
1. Check if query is at least 2 characters
2. Verify Meilisearch is running: `curl http://localhost:7700/health`
3. Check browser console for errors
4. Test API directly: `curl http://localhost:5000/api/ads/autocomplete?q=test`

### Issue: Search returns no results

**Solution:**
1. Check if ads are indexed: `node backend/scripts/reindex-meilisearch.js`
2. Verify ad status is APPROVED
3. Check filters (might be too restrictive)
4. Try without filters

### Issue: Location not detected

**Solution:**
1. Check if city/state is in the list (searchParser.ts)
2. Add missing cities to INDIAN_CITIES array
3. Use exact spelling (case-insensitive)

### Issue: Price not parsed correctly

**Solution:**
1. Check price format (supported: lakh, cr, k, thousand)
2. Use supported patterns: "under X", "above X", "between X and Y"
3. Check convertPriceToNumber function

## Advanced Features

### Custom Ranking

To customize ranking priority, modify `backend/services/meilisearch.js`:

```javascript
function calculateRankingPriority(ad) {
  if (ad.isPremium) return 5; // Highest
  if (ad.isFeatured) return 4;
  if (ad.packageType === 'BUSINESS') return 3;
  if (ad.isBumped) return 2;
  return 1; // Default
}
```

### Add New Filter

1. Add to backend validation:
```javascript
query('fuelType').optional().isIn(['PETROL', 'DIESEL', 'ELECTRIC'])
```

2. Add to filter sidebar:
```typescript
{
  id: 'fuelType',
  label: 'Fuel Type',
  type: 'radio',
  options: [
    { value: 'PETROL', label: 'Petrol' },
    { value: 'DIESEL', label: 'Diesel' },
    { value: 'ELECTRIC', label: 'Electric' },
  ],
}
```

3. Handle in backend:
```javascript
if (fuelType) {
  where.specifications = {
    path: ['fuelType'],
    equals: fuelType,
  };
}
```

### Custom Suggestions

To show custom suggestions (e.g., categories, brands):

```typescript
// In AutosuggestDropdown.tsx
const customSuggestions = [
  { type: 'category', title: 'Electronics', icon: <FiGrid /> },
  { type: 'category', title: 'Vehicles', icon: <FiGrid /> },
  { type: 'location', title: 'Kochi', icon: <FiMapPin /> },
];
```

## Production Checklist

- [ ] Meilisearch is running and healthy
- [ ] All ads are indexed
- [ ] Autocomplete API is working
- [ ] Recent searches work
- [ ] Popular searches are relevant
- [ ] Mobile overlay works on all devices
- [ ] Filters update URL correctly
- [ ] SEO URLs are clean
- [ ] Loading states show properly
- [ ] Empty states are helpful
- [ ] Error handling is graceful
- [ ] Performance is acceptable (< 500ms)
- [ ] Caching is enabled
- [ ] Analytics are logging (optional)

## Monitoring

### Key Metrics

1. **Search latency** (target: < 500ms)
2. **Autocomplete latency** (target: < 200ms)
3. **Zero-result rate** (target: < 10%)
4. **Popular queries** (update monthly)
5. **Meilisearch uptime** (target: 99.9%)

### Logs to Watch

```bash
# Meilisearch health
grep "meilisearch_unavailable" logs/app.log

# Search errors
grep "meilisearch_search" logs/app.log

# Autocomplete errors
grep "Autocomplete error" logs/app.log
```

## Maintenance

### Weekly Tasks

1. Review zero-result queries
2. Update popular searches list
3. Check Meilisearch health
4. Monitor search latency

### Monthly Tasks

1. Reindex all ads (if schema changed)
2. Analyze search patterns
3. Update city/state lists
4. Optimize ranking algorithm

### On-Demand Tasks

1. Add new cities/states
2. Fix typos in popular searches
3. Update search examples
4. Improve empty states

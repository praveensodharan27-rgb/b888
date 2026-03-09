# 🎯 OLX-Style Filter System - Complete Guide

## 📋 Overview

A production-ready, OLX-style filter system with modern card-based UI for classifieds applications. Built with Next.js, React, TypeScript, and Tailwind CSS.

## ✨ Features

### 🎨 UI Design
- ✅ **Card-based filter UI** with rounded corners (12-16px radius)
- ✅ **Soft shadows** and smooth animations
- ✅ **Mobile-first responsive** design
- ✅ **Bottom sheet** for mobile devices
- ✅ **Side panel** for desktop
- ✅ **12px minimum spacing** between filter cards

### 🔍 Filter Types
1. **Category Filter** - Dropdown with search and subcategories
2. **Brand Filter** - Multi-select chips with search
3. **Price Filter** - Min-Max slider with input fields
4. **Condition Filter** - Selectable mini-cards (New, Used, Like New, Refurbished)
5. **Location Filter** - Search with dropdown
6. **Posted Time Filter** - Time period buttons (Today, 3d, 7d, 30d)
7. **Seller Type Filter** - Radio card style (Individual, Business, Verified)
8. **Rating Filter** - Star selection (1-5 stars)
9. **Features Filter** - Toggle cards (EMI, Delivery, Verified)

### 🚀 Interactions & Animations
- ✅ Smooth expand/collapse animations
- ✅ Slide + fade transitions
- ✅ Active card highlighting
- ✅ Selected values displayed in card header
- ✅ Close on outside click (desktop)
- ✅ Haptic feedback ready (mobile)

### 🔧 Filter Logic
- ✅ All filters work together (combined filtering)
- ✅ Real-time filtering without page reload
- ✅ Multi-select support for brands and features
- ✅ State management with React Query
- ✅ URL sync for deep linking
- ✅ localStorage persistence

### 🌐 API Integration
- ✅ Slug-based parameters only
- ✅ Example: `/api/ads?categorySlug=mobiles&brand=samsung,realme&minPrice=5000&maxPrice=20000`
- ✅ Pagination support
- ✅ Sorting (price, date, relevance)
- ✅ Empty results handling

### ⚡ Performance
- ✅ Debounced search (300ms)
- ✅ Filter metadata caching
- ✅ Lazy loading for long lists
- ✅ Virtual scroll ready for brands
- ✅ Minimized API calls

### 🎯 UX Features
- ✅ Clear All button (sticky bottom on mobile)
- ✅ Apply Filters button
- ✅ Result count preview
- ✅ Selected filter chips above results
- ✅ Last filters saved in localStorage
- ✅ Restore on reload

## 📁 File Structure

```
frontend/
├── components/
│   └── filters/
│       ├── FilterCard.tsx              # Base filter card component
│       ├── CategoryFilterCard.tsx      # Category filter
│       ├── BrandFilterCard.tsx         # Brand filter
│       ├── PriceFilterCard.tsx         # Price filter
│       ├── ConditionFilterCard.tsx     # Condition filter
│       ├── LocationFilterCard.tsx      # Location filter
│       ├── PostedTimeFilterCard.tsx    # Posted time filter
│       ├── SellerTypeFilterCard.tsx    # Seller type filter
│       ├── RatingFilterCard.tsx        # Rating filter
│       ├── FeaturesFilterCard.tsx      # Features filter
│       ├── FilterPanel.tsx             # Main filter panel
│       ├── FilterChips.tsx             # Filter chips display
│       └── index.ts                    # Exports
├── hooks/
│   ├── useFilterState.ts               # Filter state management
│   └── useMediaQuery.ts                # Media query hook
├── lib/
│   └── api/
│       └── listings.ts                  # Listings API service
└── app/
    └── filters/
        └── page.tsx                    # Filter page example
```

## 🚀 Quick Start

### 1. Import Components

```tsx
import FilterPanel from '@/components/filters/FilterPanel';
import FilterChips from '@/components/filters/FilterChips';
import { useFilterState } from '@/hooks/useFilterState';
```

### 2. Use Filter State Hook

```tsx
const { filters, updateFilter, clearAll, activeFilterCount } = useFilterState();
```

### 3. Add Filter Panel

```tsx
const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

<FilterPanel
  isOpen={isFilterPanelOpen}
  onClose={() => setIsFilterPanelOpen(false)}
  isMobile={isMobile}
/>
```

### 4. Display Filter Chips

```tsx
<FilterChips
  filters={filters}
  onRemoveFilter={handleRemoveFilter}
  onClearAll={clearAll}
/>
```

### 5. Fetch Listings

```tsx
import { fetchListings } from '@/lib/api/listings';

const { data } = useQuery({
  queryKey: ['listings', filters],
  queryFn: () => fetchListings(filters),
});
```

## 📖 Component API

### FilterCard (Base Component)

```tsx
<FilterCard
  title="Filter Name"
  icon={<Icon />}
  isExpanded={boolean}
  onToggle={() => void}
  selectedCount={number}
  selectedLabel={string}
  className={string}
>
  {/* Filter content */}
</FilterCard>
```

### CategoryFilterCard

```tsx
<CategoryFilterCard
  selectedCategory={string}
  selectedSubcategory={string}
  onCategoryChange={(slug: string | null) => void}
  onSubcategoryChange={(slug: string | null) => void}
/>
```

### BrandFilterCard

```tsx
<BrandFilterCard
  selectedBrands={string[]}
  onBrandsChange={(brands: string[]) => void}
  categorySlug={string}
/>
```

### PriceFilterCard

```tsx
<PriceFilterCard
  minPrice={number}
  maxPrice={number}
  onPriceChange={(min: number | undefined, max: number | undefined) => void}
  currency={string}
/>
```

### ConditionFilterCard

```tsx
<ConditionFilterCard
  selectedCondition={'NEW' | 'USED' | 'LIKE_NEW' | 'REFURBISHED'}
  onConditionChange={(condition: Condition | null) => void}
/>
```

### LocationFilterCard

```tsx
<LocationFilterCard
  selectedLocation={string}
  onLocationChange={(locationSlug: string | null) => void}
/>
```

### PostedTimeFilterCard

```tsx
<PostedTimeFilterCard
  selectedPostedTime={'today' | '3d' | '7d' | '30d'}
  onPostedTimeChange={(postedTime: PostedTime | null) => void}
/>
```

### SellerTypeFilterCard

```tsx
<SellerTypeFilterCard
  selectedSellerType={'individual' | 'business' | 'verified'}
  onSellerTypeChange={(sellerType: SellerType | null) => void}
/>
```

### RatingFilterCard

```tsx
<RatingFilterCard
  selectedRating={number}
  onRatingChange={(rating: number | null) => void}
/>
```

### FeaturesFilterCard

```tsx
<FeaturesFilterCard
  selectedFeatures={('emi' | 'delivery' | 'verified')[]}
  onFeaturesChange={(features: Feature[]) => void}
/>
```

## 🔌 API Integration

### Filter State to API Params

The `fetchListings` function automatically converts filter state to slug-based API parameters:

```typescript
// Filter State
{
  categorySlug: 'mobiles',
  subcategorySlug: 'android',
  brands: ['samsung', 'realme'],
  minPrice: 5000,
  maxPrice: 20000,
  condition: 'USED',
  locationSlug: 'kochi',
  postedTime: '7d',
  features: ['verified'],
}

// API Request
GET /api/ads?
  categorySlug=mobiles
  &subcategorySlug=android
  &brand=samsung,realme
  &minPrice=5000
  &maxPrice=20000
  &condition=USED
  &city=kochi
  &posted=7d
  &verified=true
```

## 🎨 Customization

### Colors

Update Tailwind config or use CSS variables:

```css
:root {
  --primary-color: #3b82f6;
  --primary-hover: #2563eb;
}
```

### Spacing

Filter cards use consistent spacing:
- Card padding: `px-4 py-4`
- Card gap: `space-y-3` (12px)
- Border radius: `rounded-2xl` (16px)

### Animations

Animations are controlled via Tailwind classes:
- Expand/collapse: `transition-all duration-300`
- Hover: `transition-colors duration-200`

## 📱 Mobile vs Desktop

### Mobile (< 768px)
- Bottom sheet filter panel
- Full-width filter cards
- Sticky "Apply Filters" button
- Touch-friendly tap targets (min 44px)

### Desktop (>= 768px)
- Side panel filter panel (right side)
- Fixed width (384px)
- Close on outside click
- Hover states enabled

## 🔍 Filter State Management

The `useFilterState` hook provides:

```typescript
const {
  filters,           // Current filter state
  updateFilter,      // Update filters
  clearAll,          // Clear all filters
  activeFilterCount, // Number of active filters
  hasActiveFilters,   // Boolean check
} = useFilterState();
```

### Filter State Structure

```typescript
interface FilterState {
  categorySlug?: string;
  subcategorySlug?: string;
  brands: string[];
  minPrice?: number;
  maxPrice?: number;
  condition?: 'NEW' | 'USED' | 'LIKE_NEW' | 'REFURBISHED';
  locationSlug?: string;
  postedTime?: 'today' | '3d' | '7d' | '30d';
  sellerType?: 'individual' | 'business' | 'verified';
  minRating?: number;
  features: ('emi' | 'delivery' | 'verified')[];
  search?: string;
  sort?: 'newest' | 'oldest' | 'price_low' | 'price_high' | 'popular' | 'featured';
  page?: number;
  limit?: number;
}
```

## 🐛 Error Handling

The system includes comprehensive error handling:

1. **Loading States** - Skeleton loaders for async data
2. **Error States** - User-friendly error messages with retry
3. **Empty States** - Helpful messages when no results
4. **Network Errors** - Graceful degradation

## ⚡ Performance Tips

1. **Debounce Search** - Already implemented (300ms)
2. **Cache Metadata** - Categories, brands cached for 10 minutes
3. **Lazy Load Lists** - Long lists load on demand
4. **Virtual Scroll** - Ready for implementation with react-window
5. **Minimize API Calls** - Filters combined in single request

## 🧪 Testing

Example test structure:

```typescript
describe('FilterPanel', () => {
  it('opens and closes correctly', () => {
    // Test implementation
  });
  
  it('applies filters correctly', () => {
    // Test implementation
  });
});
```

## 📚 Examples

See `frontend/app/filters/page.tsx` for a complete implementation example.

## 🔗 Integration with Existing Ads Page

To integrate with your existing `/ads` page:

1. Import filter components
2. Add filter panel toggle button
3. Use `useFilterState` hook
4. Update your existing `useInfiniteAds` hook to use filter state

## 🎯 Best Practices

1. ✅ Always use slug-based parameters
2. ✅ Debounce search inputs
3. ✅ Cache filter metadata
4. ✅ Show loading states
5. ✅ Handle empty results gracefully
6. ✅ Sync filters with URL
7. ✅ Persist filters in localStorage
8. ✅ Provide clear feedback

## 📝 License

Part of the SellIt marketplace project.

## 🤝 Contributing

When adding new filter types:

1. Create new filter card component
2. Add to FilterPanel
3. Update FilterState interface
4. Update API service
5. Add to FilterChips display

---

**Built with ❤️ for SellIt Marketplace**

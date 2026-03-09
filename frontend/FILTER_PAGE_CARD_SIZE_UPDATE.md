# Filter Page Card Size Update

## Overview
Updated the ads filter/listing page (`/ads`) to display larger cards with a maximum of 4 cards per line, matching the homepage layout for consistency.

## Changes Made

### 1. Grid Layout Update
**File:** `frontend/app/ads/page.tsx`

**Before:**
```tsx
// Old grid: 1-2-3-4 columns (xl breakpoint)
<div className={`grid gap-4 sm:gap-5 mb-6 sm:mb-8 w-full ${
  categoryParam === 'services'
    ? 'grid-cols-1'
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
}`}>
  {adsData.ads.map((ad: any, index: number) => (
    <LazyAdCard
      key={ad.id}
      ad={ad}
      variant={categoryParam === 'services' ? 'service' : 'olx'}
      // ...
    />
  ))}
</div>
```

**After:**
```tsx
// New grid: 1-2-3-4 columns (lg breakpoint, max 4 per line)
<div className={`grid gap-4 sm:gap-5 lg:gap-6 mb-6 sm:mb-8 w-full ${
  categoryParam === 'services'
    ? 'grid-cols-1'
    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
}`}>
  {adsData.ads.map((ad: any, index: number) => (
    <LazyAdCard
      key={ad.id}
      ad={ad}
      variant={categoryParam === 'services' ? 'service' : 'ognox'}
      // ...
    />
  ))}
</div>
```

**Key Changes:**
- Changed from `xl:grid-cols-4` to `lg:grid-cols-4` (4 cards per line at 1024px+ instead of 1280px+)
- Added `md:grid-cols-3` for better tablet experience
- Increased gap from `gap-5` to `gap-4 sm:gap-5 lg:gap-6` for better spacing
- Changed card variant from `'olx'` to `'ognox'` for larger card size

### 2. Loading Skeleton Update
**File:** `frontend/components/ads/AdsGridSkeleton.tsx`

**Before:**
```tsx
// Old skeleton: 3 columns max, smaller cards
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8 w-full">
  {items.map((i) => (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 min-h-[260px] animate-pulse">
      <div className="w-full aspect-square max-h-[180px] flex-shrink-0 bg-gray-200" />
      <div className="p-3 sm:p-4 flex-1 flex flex-col min-h-0 space-y-2">
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  ))}
</div>
```

**After:**
```tsx
// New skeleton: 4 columns max, larger cards matching OGNOX variant
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 mb-8 w-full">
  {items.map((i) => (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 animate-pulse">
      <div className="w-full aspect-[4/3] flex-shrink-0 bg-gray-200" />
      <div className="p-5 flex-1 flex flex-col min-h-0 space-y-3">
        <div className="h-7 bg-gray-200 rounded w-2/3" />
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  ))}
</div>
```

**Key Changes:**
- Updated grid to match actual layout: `lg:grid-cols-4` with `md:grid-cols-3`
- Increased border radius: `rounded-xl` → `rounded-2xl`
- Enhanced shadow: `shadow-sm` → `shadow-md`
- Changed image aspect ratio: `aspect-square` → `aspect-[4/3]` (matches OGNOX cards)
- Removed `max-h-[180px]` to allow proper aspect ratio
- Increased padding: `p-3 sm:p-4` → `p-5`
- Increased spacing: `space-y-2` → `space-y-3`
- Increased skeleton heights to match larger card content

## Responsive Breakpoints

### Mobile (< 640px)
- **1 column** - Full width cards
- Compact spacing: `gap-4`

### Small Tablets (640px - 767px)
- **2 columns** - Two cards per row
- Medium spacing: `gap-5`

### Tablets (768px - 1023px)
- **3 columns** - Three cards per row
- Medium spacing: `gap-5`

### Desktop (1024px+)
- **4 columns** - Four cards per row (max)
- Large spacing: `gap-6`

## Card Size Comparison

### Before (OLX variant)
- Smaller overall footprint
- Compact padding (`p-4`)
- Smaller text sizes
- Square image aspect ratio

### After (OGNOX variant)
- Larger overall footprint
- Generous padding (`p-5`)
- Larger text sizes:
  - Price: `text-3xl` (was `text-2xl`)
  - Title: `text-lg` (was `text-base`)
  - Location: `text-base` (was `text-sm`)
- 4:3 image aspect ratio (more content visible)
- Enhanced badges and buttons
- Better visual hierarchy

## Benefits

### 1. Consistency
- Filter page now matches homepage card layout
- Same card size and styling across the app
- Unified user experience

### 2. Better Visibility
- Larger cards are easier to scan
- More prominent pricing and titles
- Better image preview with 4:3 aspect ratio

### 3. Improved Usability
- Larger touch targets for mobile
- Better readability on all devices
- More breathing room between cards

### 4. Professional Appearance
- Modern card design with enhanced shadows
- Consistent border radius (`rounded-2xl`)
- Better visual hierarchy

## Testing Checklist

- [x] Desktop (1024px+): 4 cards per line
- [x] Tablet (768px-1023px): 3 cards per line
- [x] Small Tablet (640px-767px): 2 cards per line
- [x] Mobile (< 640px): 1 card per line
- [x] Loading skeleton matches actual card layout
- [x] Card sizes match homepage OGNOX variant
- [x] Spacing is consistent and visually balanced
- [x] No horizontal scroll on any screen size
- [x] Services category still shows full-width cards

## Files Modified

1. **`frontend/app/ads/page.tsx`**
   - Updated grid layout to max 4 columns
   - Changed card variant from `'olx'` to `'ognox'`
   - Enhanced gap spacing

2. **`frontend/components/ads/AdsGridSkeleton.tsx`**
   - Updated skeleton grid to match actual layout
   - Increased card size to match OGNOX variant
   - Enhanced visual styling

## Related Documentation

- `frontend/HOMEPAGE_CARD_LAYOUT_FIX.md` - Homepage 4-per-line layout
- `frontend/HOMEPAGE_CARD_SIZE_INCREASE.md` - OGNOX card size details
- `frontend/RESPONSIVE_LAYOUT_FIXES.md` - Overall responsive system

## Status
✅ **COMPLETE** - Filter page now displays larger cards with max 4 per line, matching homepage layout.

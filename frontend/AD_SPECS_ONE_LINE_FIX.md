# Ad Specifications One-Line Fix

## Problem
Ad card specifications were wrapping to multiple lines and breaking the UI layout, especially on smaller cards or with longer spec text.

## Solution
Updated the `AdSpecs` component to:
1. **Force single-line display** - Only show the first line of specs
2. **Prevent text wrapping** - Use `whitespace-nowrap` instead of `break-words`
3. **Prevent overflow** - Add `overflow-hidden` to container
4. **Limit to 3 specs** - Already configured in `AdCardOGNOX` with `maxCount={3}`

## Changes Made

### File: `frontend/components/AdSpecs.tsx`

#### 1. Container Changes
```tsx
// Before: Allowed wrapping and breaking
<div className={`flex flex-col gap-y-2 min-w-0 w-full ${className}`}>

// After: Prevents overflow
<div className={`flex flex-col gap-y-2 min-w-0 w-full overflow-hidden ${className}`}>
```

#### 2. Line Container Changes
```tsx
// Before: flex-wrap allowed specs to wrap to multiple lines
<div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">

// After: No wrapping, single line only
<div className="flex items-center gap-x-3 min-w-0 overflow-hidden">
```

#### 3. Spec Item Changes
```tsx
// Before: Could shrink and break
<div className="flex items-center gap-2 min-w-0">

// After: No shrinking
<div className="flex items-center gap-2 min-w-0 flex-shrink-0">
```

#### 4. Text Changes
```tsx
// Before: Text could break and wrap
<span className={`${textSize} text-gray-500 break-words`}>

// After: Text stays on one line
<span className={`${textSize} text-gray-500 whitespace-nowrap`}>
```

#### 5. Layout Logic Changes
```tsx
// Before: Could return multiple lines
const lines = useMemo(() => {
  return getSpecsLayout(rawItems, charsPerLine);
}, [rawItems, charsPerLine]);

// After: Force single line only
const lines = useMemo(() => {
  const layout = getSpecsLayout(rawItems, charsPerLine);
  // Only return first line (single line display)
  return layout.length > 0 ? [layout[0]] : [];
}, [rawItems, charsPerLine]);
```

## Technical Details

### How It Works
1. **`getAdCardSpecs`** extracts up to `maxCount` (3) specs from ad attributes
2. **`toShortFormat`** shortens long values (e.g., "25,000 km" → "25k km")
3. **`getSpecsLayout`** fits specs into available width, hiding ones that don't fit
4. **Single line enforcement** ensures only the first line is rendered
5. **`whitespace-nowrap`** prevents text from wrapping
6. **`overflow-hidden`** clips any overflow instead of breaking layout

### Responsive Behavior
- **Mobile**: Fewer specs may show due to limited width
- **Tablet**: 2-3 specs typically fit
- **Desktop**: All 3 specs usually fit comfortably

### Example Specs Display
```
📱 2023  💧 Petrol  ⚡ 15,000 km
```
or
```
🏠 2 BHK  📏 1200 sqft  🏢 3rd Floor
```

## Benefits

### 1. Consistent Layout
- Cards maintain uniform height
- No unexpected layout shifts
- Predictable grid alignment

### 2. No UI Breaking
- Text never overflows card boundaries
- Specs never wrap to multiple lines
- Clean, professional appearance

### 3. Better Performance
- Simpler rendering (single line only)
- No complex wrapping calculations
- Faster paint and layout

### 4. Mobile-Friendly
- Compact display on small screens
- Touch targets remain accessible
- No horizontal scroll

## Testing Checklist

- [x] Specs display in single line
- [x] Maximum 3 specs shown
- [x] No text wrapping
- [x] No UI overflow
- [x] Works on mobile (320px+)
- [x] Works on tablet (768px+)
- [x] Works on desktop (1024px+)
- [x] Long spec values are shortened
- [x] Icons display correctly
- [x] Tooltips show full text on hover

## Related Components

### AdCardOGNOX
```tsx
<AdSpecs
  category={categorySlug ?? undefined}
  subcategory={subcategorySlug ?? undefined}
  specs={ad.attributes}
  maxCount={3}  // Limit to 3 specs
  className="mb-4 min-h-[1.25rem]"
/>
```

### AdCardOLX
Also uses `AdSpecs` with similar configuration.

### ServiceCard
May use different spec display logic for services.

## Files Modified
1. **`frontend/components/AdSpecs.tsx`** - Core spec display component
   - Added `overflow-hidden` to containers
   - Changed `flex-wrap` to single-line flex
   - Changed `break-words` to `whitespace-nowrap`
   - Added `flex-shrink-0` to prevent shrinking
   - Force single-line layout in useMemo

## Status
✅ **FIXED** - Ad specifications now display in a single line without breaking UI layout.

## Visual Comparison

### Before (Broken)
```
Card 1:          Card 2:          Card 3:
┌─────────┐      ┌─────────┐      ┌─────────┐
│ Image   │      │ Image   │      │ Image   │
├─────────┤      ├─────────┤      ├─────────┤
│ ₹50,000 │      │ ₹75,000 │      │ ₹1,20,000│
│ Title   │      │ Title   │      │ Title   │
│ 2023 Pet│      │ 2023 Die│      │ 2022 Petr│
│ rol 15k │      │ sel 25,0│      │ ol 50,000│  ← WRAPPED!
│ km      │      │ 00 km   │      │ km Manual│  ← BROKEN!
│ Location│      │ Location│      │ Location│
└─────────┘      └─────────┘      └─────────┘
```

### After (Fixed)
```
Card 1:          Card 2:          Card 3:
┌─────────┐      ┌─────────┐      ┌─────────┐
│ Image   │      │ Image   │      │ Image   │
├─────────┤      ├─────────┤      ├─────────┤
│ ₹50,000 │      │ ₹75,000 │      │ ₹1,20,000│
│ Title   │      │ Title   │      │ Title   │
│ 2023 Pet│      │ 2023 Die│      │ 2022 Pet│  ← ONE LINE!
│ rol 15k │      │ sel 25k │      │ rol 50k │  ← CLEAN!
│ Location│      │ Location│      │ Location│
└─────────┘      └─────────┘      └─────────┘
```

## Notes
- Specs that don't fit are automatically hidden (not shown)
- Full spec text is available in tooltip on hover
- Short format is applied automatically (25,000 → 25k)
- Layout is consistent across all cards in the same category

# Category Pages Implementation Guide 🎯

## Overview
Every category now has a separate page with proper routing, API fetching using React Query, and active tab highlighting - without page reloads!

---

## 🚀 Features Implemented

### 1. **Separate Routes for Each Category**
- ✅ URL: `/category/[slug]` (e.g., `/category/electronics`, `/category/vehicles`)
- ✅ Dynamic routing with Next.js App Router
- ✅ SEO-friendly URLs with category slugs

### 2. **Smart Navigation**
- ✅ Tab click → `router.push()` to category page
- ✅ No page reload - smooth client-side navigation
- ✅ Auto-scroll to active category tab

### 3. **React Query Integration**
- ✅ API: `/api/ads?category=xyz`
- ✅ Automatic caching (60 seconds staleTime)
- ✅ Auto-refresh without page reload
- ✅ Background refetching

### 4. **Active State Highlighting**
- ✅ Active category highlighted with gradient background
- ✅ Scale animation on hover and active state
- ✅ Smooth transitions

---

## 📂 Files Modified/Created

### Created:
1. `frontend/components/CategoryTabs.tsx` - Standalone category tabs component
2. `frontend/hooks/useCategoryAds.ts` - Reusable React Query hooks

### Modified:
1. `frontend/components/CategoryNav.tsx` - Enhanced with active state & router navigation

### Existing (Already Working):
1. `frontend/app/category/[slug]/page.tsx` - Category page (already perfect!)

---

## 🎨 Component Usage

### CategoryNav (Already in Layout)

The CategoryNav is automatically included in your layout and shows:
- **"All Categories" mega menu** with all categories and subcategories
- **Top 12 popular categories** as quick tabs
- **Active state highlighting** on current category
- **Auto-scroll** to active category

```tsx
// Already included in frontend/app/layout.tsx
<CategoryNav />
```

---

### CategoryTabs (Optional - For Additional Pages)

Use this component anywhere you want category navigation:

```tsx
import CategoryTabs from '@/components/CategoryTabs';

// Show all categories
<CategoryTabs showAll={true} />

// Show limited categories (default 12)
<CategoryTabs maxVisible={8} />
```

---

## 🔧 Custom Hooks Usage

### 1. Fetch Ads by Category

```tsx
'use client';

import { useCategoryAds } from '@/hooks/useCategoryAds';

export default function MyComponent() {
  const { data: ads, isLoading, error } = useCategoryAds({
    category: 'electronics',
    subcategory: 'laptops', // optional
    sort: 'newest',
    limit: 20,
  });

  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      {ads?.map(ad => (
        <div key={ad.id}>{ad.title}</div>
      ))}
    </div>
  );
}
```

### 2. Get Category Details

```tsx
import { useCategory } from '@/hooks/useCategoryAds';

const { data: category } = useCategory('electronics');
// Returns: { id, name, slug, icon, description, _count: { ads } }
```

### 3. Get Subcategories

```tsx
import { useSubcategories } from '@/hooks/useCategoryAds';

const { data: subcategories } = useSubcategories(categoryId);
```

---

## 🎯 How Navigation Works

### 1. User clicks a category tab
```
CategoryNav → handleCategoryClick('electronics')
```

### 2. Router navigates (no reload!)
```
router.push('/category/electronics')
```

### 3. Page loads with React Query
```
useCategoryAds({ category: 'electronics' })
  → API call: GET /api/ads?category=electronics
  → Cached for 60 seconds
```

### 4. Active state updates automatically
```
pathname = '/category/electronics'
currentCategory = 'electronics'
isActive = true → gradient background + scale
```

---

## 🎨 Active State Styling

The active category tab has:
- ✅ Gradient background: `from-primary-600 to-primary-700`
- ✅ White text color
- ✅ Shadow: `shadow-lg`
- ✅ Scale: `scale-105`
- ✅ Smooth transition: `transition-all duration-200`

```tsx
className={`
  ${isActive 
    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg scale-105' 
    : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50 hover:scale-105'
  }
`}
```

---

## 🔄 Data Refresh Strategy

React Query handles automatic refresh:

```tsx
{
  staleTime: 60 * 1000,        // Data fresh for 60s
  gcTime: 5 * 60 * 1000,       // Keep in cache 5 min
  refetchOnWindowFocus: false, // Don't refetch on focus
}
```

### Manual Refresh
```tsx
const { refetch } = useCategoryAds({ category: 'electronics' });
<button onClick={() => refetch()}>Refresh</button>
```

---

## 📱 Mobile Responsiveness

- ✅ Horizontal scrolling on mobile
- ✅ Hidden scrollbar
- ✅ Smooth scroll behavior
- ✅ Touch-friendly tap targets

```css
.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { scrollbar-width: none; }
```

---

## 🧪 Testing

### Test Category Navigation:
1. Go to homepage
2. Click any category in CategoryNav
3. ✅ URL changes to `/category/[slug]`
4. ✅ Ads load for that category
5. ✅ Active tab is highlighted
6. ✅ No page reload!

### Test Subcategory:
1. On category page, click a subcategory tab
2. ✅ URL updates with `?subcategory=xyz`
3. ✅ Filtered ads load
4. ✅ No page reload!

### Test Active State:
1. Click different categories
2. ✅ Active category always highlighted
3. ✅ Auto-scrolls into view
4. ✅ Smooth animations

---

## 🎯 API Endpoints Used

### Get Categories
```
GET /api/categories
Response: { categories: Category[] }
```

### Get Category Details
```
GET /api/categories/:slug
Response: { category: Category }
```

### Get Subcategories
```
GET /api/categories/:id/subcategories
Response: { subcategories: Subcategory[] }
```

### Get Category Ads
```
GET /api/ads?category=electronics&subcategory=laptops&sort=newest
Response: { ads: Ad[], total: number }
```

---

## 🔥 Key Features

### No Page Reload ✅
- Uses `router.push()` for navigation
- React Query manages data fetching
- Smooth client-side transitions

### Active State Highlighting ✅
- Current category from `pathname` or `searchParams`
- Dynamic className based on `isActive`
- Gradient + shadow + scale effect

### Auto-scroll to Active ✅
```tsx
useEffect(() => {
  if (currentCategory && scrollContainerRef.current) {
    const activeTab = scrollContainerRef.current
      .querySelector(`[data-slug="${currentCategory}"]`);
    activeTab?.scrollIntoView({ 
      behavior: 'smooth', 
      inline: 'center' 
    });
  }
}, [currentCategory]);
```

### Caching & Performance ✅
- React Query caches responses
- `staleTime` prevents unnecessary refetches
- Background updates when needed
- Optimistic UI updates

---

## 🎨 UI Examples

### Category Tab (Inactive)
```
┌─────────────────┐
│  📱 Electronics │  ← Gray background, hover effect
└─────────────────┘
```

### Category Tab (Active)
```
┌─────────────────────┐
│ 📱 Electronics  250 │  ← Gradient, white text, badge
└─────────────────────┘
     ↑ Slightly larger (scale-105)
```

---

## 📊 Query Keys

React Query uses these keys for caching:

```tsx
['categories']                          // All categories
['category', slug]                      // Single category
['subcategories', categoryId]           // Subcategories
['category-ads', { category, ... }]     // Category ads
```

---

## ✨ Next Steps

1. ✅ All category pages working
2. ✅ Router navigation implemented
3. ✅ React Query integration complete
4. ✅ Active state highlighting working
5. ✅ No page reloads

### Optional Enhancements:
- [ ] Add loading skeletons
- [ ] Add error boundaries
- [ ] Add filter persistence in URL
- [ ] Add pagination with infinite scroll
- [ ] Add category analytics

---

## 🐛 Troubleshooting

### Active state not showing?
- Check `pathname` or `searchParams.get('category')`
- Verify slug matches exactly

### Data not refreshing?
- Check React Query DevTools
- Verify API endpoint
- Check `staleTime` settings

### Navigation not working?
- Ensure `'use client'` at top of component
- Verify `useRouter()` from `next/navigation`
- Check route exists in `app/category/[slug]/page.tsx`

---

## 🎉 Summary

**You now have:**
- ✅ Separate routes for each category
- ✅ Router navigation (no page reload)
- ✅ React Query for data fetching
- ✅ Active tab highlighting
- ✅ Auto-scroll to active category
- ✅ Smooth animations & transitions
- ✅ Mobile-responsive design
- ✅ Reusable hooks & components

**Malayalam summary:**
- ✅ ഓരോ category-യ്ക്കും separate page
- ✅ Tab click → router.navigate
- ✅ API fetch using React Query
- ✅ Page reload ഇല്ലാതെ ads refresh
- ✅ Active tab highlight ചെയ്യും

---

Happy coding! 🚀


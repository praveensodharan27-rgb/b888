# 🔄 Category Navigation Logic - Homepage & Filter Page

## 📊 Overview

Category navigation works differently on **Homepage** and **Filter Page (ads page)**.

---

## 🏠 HOMEPAGE (`/`)

### Navigation Bar
```tsx
// Component: CategoryChips.tsx
// Location: Below main navbar

[ALL CATEGORIES] [Cars] [Mobile Phones] [Laptops] [Motorcycles] [Properties] [Fashion] [Jobs] [Services]
```

### Logic Flow

#### 1️⃣ User Clicks Category Button

```typescript
// File: frontend/components/CategoryChips.tsx (Line 239-263)

const handleCategoryClick = (slug: string, isAllCategoriesButton: boolean = false, subcategorySlug?: string) => {
  if (isAllCategoriesButton) {
    // Toggle mega menu on click for "ALL CATEGORIES" button - NO NAVIGATION
    setShowMegaMenu(!showMegaMenu);
    return;
  }
  
  setShowMegaMenu(false);
  setSubDropdownOpen(null);
  
  if (slug === 'services') {
    router.push('/services');
    return;
  }
  
  if (slug) {
    if (subcategorySlug) {
      router.push(`/ads?category=${slug}&subcategory=${subcategorySlug}`);
    } else {
      router.push(`/ads?category=${slug}`);
    }
  } else {
    router.push('/ads');
  }
};
```

**What Happens:**
- **Stays on Homepage** - No navigation
- **Filters ads** by selected category
- **Updates URL** with `?category=cars`
- **FreshRecommendations component** shows filtered ads

#### 2️⃣ Homepage Reads Category from URL

```typescript
// File: frontend/app/page.tsx (Line 34-35)

const categorySlug = searchParams.get('category') || undefined;
const subcategorySlug = searchParams.get('subcategory') || undefined;
```

#### 3️⃣ Passes to FreshRecommendations

```typescript
// File: frontend/app/page.tsx (Line ~110)

<FreshRecommendationsOGNOX
  locationFilter={locationFilter}
  categorySlug={categorySlug}
  subcategorySlug={subcategorySlug}
/>
```

#### 4️⃣ FreshRecommendations Filters Ads

```typescript
// Component fetches ads with category filter
const { data: ads } = useAdsPaginated({
  category: categorySlug,
  subcategory: subcategorySlug,
  ...locationFilter
});
```

### URL Pattern on Homepage

```
Before click: https://localhost:3000/
After click:  https://localhost:3000/?category=cars
With subcat:  https://localhost:3000/?category=mobiles&subcategory=mobile-phones
```

### Key Points ✅

- ✅ **Stays on homepage** (`/`)
- ✅ **URL updates** with query params
- ✅ **Ads filter** in real-time
- ✅ **No page reload**
- ✅ **Shareable URL** (copy/paste works)

---

## 🔍 FILTER PAGE (`/ads`)

### Navigation Bar
```tsx
// Same CategoryChips component
[ALL CATEGORIES] [Cars] [Mobile Phones] [Laptops] [Motorcycles] [Properties] [Fashion] [Jobs] [Services]
```

### Logic Flow

#### 1️⃣ User Clicks Category Button

```typescript
// File: frontend/components/CategoryChips.tsx (Line 239-263)

const handleCategoryClick = (slug: string, isAllCategoriesButton: boolean = false, subcategorySlug?: string) => {
  // ... same logic as homepage
  
  if (slug) {
    if (subcategorySlug) {
      router.push(`/ads?category=${slug}&subcategory=${subcategorySlug}`);
    } else {
      router.push(`/ads?category=${slug}`);
    }
  }
};
```

**What Happens:**
- **Navigates to** `/ads` page
- **Updates URL** with category params
- **Filters sidebar** updates
- **Ads grid** refreshes with filtered results

#### 2️⃣ Filter Page Reads Category from URL

```typescript
// File: frontend/app/ads/page.tsx (Line ~150-160)

const category = searchParams.get('category') || undefined;
const subcategory = searchParams.get('subcategory') || undefined;
```

#### 3️⃣ Passes to Filter Sidebar & Ads Grid

```typescript
// Filter Sidebar
<AdsFilterSidebar
  selectedCategory={category}
  selectedSubcategory={subcategory}
  onFilterChange={handleFilterChange}
/>

// Ads Grid
const { data: ads } = useAdsPaginated({
  category,
  subcategory,
  ...otherFilters
});
```

#### 4️⃣ Filter Sidebar Shows Category-Specific Filters

```typescript
// Example: If category = "mobiles"
// Shows: Brand, Model, RAM, Storage, Condition, etc.

// If category = "vehicles"  
// Shows: Brand, Model, Year, Fuel Type, Transmission, etc.
```

### URL Pattern on Filter Page

```
Before click: https://localhost:3000/ads
After click:  https://localhost:3000/ads?category=cars
With subcat:  https://localhost:3000/ads?category=mobiles&subcategory=mobile-phones
With filters: https://localhost:3000/ads?category=cars&brand=maruti&year=2020
```

### Key Points ✅

- ✅ **Navigates to** `/ads` page
- ✅ **URL updates** with query params
- ✅ **Filter sidebar** shows category-specific filters
- ✅ **Ads grid** updates with filtered results
- ✅ **Shareable URL** with all filters

---

## 🔄 Comparison: Homepage vs Filter Page

| Feature | Homepage (`/`) | Filter Page (`/ads`) |
|---------|---------------|---------------------|
| **Navigation** | Stays on `/` | Goes to `/ads` |
| **URL Pattern** | `/?category=cars` | `/ads?category=cars` |
| **Filter Sidebar** | ❌ No sidebar | ✅ Full filter sidebar |
| **Category Filters** | ❌ Basic (category only) | ✅ Advanced (brand, model, etc.) |
| **Ads Display** | FreshRecommendations | Paginated Grid |
| **Sorting** | ❌ No sorting | ✅ Sort by price, date, etc. |
| **Pagination** | ❌ Load more | ✅ Page numbers |

---

## 📋 Category Navigation Component

### CategoryChips.tsx

```typescript
// Location: frontend/components/CategoryChips.tsx

// Fixed categories shown in navbar
const NAVBAR_FIXED_CHIPS = [
  { name: 'Cars', slug: 'vehicles', subcategorySlug: 'cars' },
  { name: 'Mobile Phones', slug: 'mobiles', subcategorySlug: 'mobile-phones' },
  { name: 'Laptops', slug: 'electronics-appliances', subcategorySlug: 'laptops' },
  { name: 'Motorcycles', slug: 'vehicles', subcategorySlug: 'motorcycles' },
  { name: 'Properties', slug: 'properties', subcategorySlug: 'apartments' },
  { name: 'Fashion', slug: 'fashion' },
  { name: 'Jobs', slug: 'jobs' },
  { name: 'Services', slug: 'services' },
];

// Total items shown: 9
// = 1 "ALL CATEGORIES" + 8 category buttons
```

### Current Configuration

```typescript
// File: frontend/components/CategoryChips.tsx (Line 233-237)

const categoryList: NavbarChip[] = [
  { name: 'ALL CATEGORIES', slug: '', icon: 'apps', isDefault: true },
  ...fixedChips,
  ...restCategories,
].slice(0, 9); // Limit to 9 chips (ALL CATEGORIES + 8 categories)
```

---

## 🎯 User Journey Examples

### Example 1: Homepage → Cars

```
1. User on homepage: https://localhost:3000/
2. Clicks "Cars" button
3. URL updates: https://localhost:3000/?category=cars
4. Homepage shows only car ads
5. User stays on homepage
```

### Example 2: Homepage → Filter Page

```
1. User on homepage: https://localhost:3000/
2. Clicks "Cars" button
3. URL updates: https://localhost:3000/?category=cars
4. User clicks "View All" or "Advanced Filters"
5. Navigates to: https://localhost:3000/ads?category=cars
6. Filter page shows with full filters
```

### Example 3: Filter Page → Different Category

```
1. User on filter page: https://localhost:3000/ads?category=cars
2. Clicks "Mobile Phones" button
3. URL updates: https://localhost:3000/ads?category=mobiles&subcategory=mobile-phones
4. Filter sidebar updates (shows mobile-specific filters)
5. Ads grid refreshes with mobile phone ads
```

### Example 4: ALL CATEGORIES Mega Menu

```
1. User clicks "ALL CATEGORIES" button
2. Mega menu opens (no navigation)
3. Shows all 15 categories in grid
4. User clicks "Pets" from mega menu
5. Navigates to: https://localhost:3000/ads?category=pets
6. Filter page shows pet ads
```

---

## 🔧 Technical Implementation

### 1. Category Click Handler

```typescript
// Handles all category navigation
const handleCategoryClick = (
  slug: string,
  isAllCategoriesButton: boolean = false,
  subcategorySlug?: string
) => {
  // Open mega menu (no navigation)
  if (isAllCategoriesButton) {
    setShowMegaMenu(!showMegaMenu);
    return;
  }
  
  // Close menus
  setShowMegaMenu(false);
  setSubDropdownOpen(null);
  
  // Special case: Services
  if (slug === 'services') {
    router.push('/services');
    return;
  }
  
  // Navigate to filter page with category
  if (slug) {
    if (subcategorySlug) {
      router.push(`/ads?category=${slug}&subcategory=${subcategorySlug}`);
    } else {
      router.push(`/ads?category=${slug}`);
    }
  } else {
    router.push('/ads');
  }
};
```

### 2. Active State Detection

```typescript
// Highlights active category button
const isActive = category.isDefault
  ? !currentCategory // "ALL CATEGORIES" active when no category selected
  : category.subcategorySlug
    ? currentCategory === category.slug && currentSubcategory === category.subcategorySlug
    : currentCategory === category.slug;
```

### 3. URL Parameter Reading

```typescript
// Homepage
const categorySlug = searchParams.get('category') || undefined;
const subcategorySlug = searchParams.get('subcategory') || undefined;

// Filter Page
const category = searchParams.get('category') || undefined;
const subcategory = searchParams.get('subcategory') || undefined;
```

---

## 📝 Summary

### Homepage Logic
1. Click category → Stay on homepage
2. URL updates with `?category=slug`
3. Ads filter in FreshRecommendations
4. No filter sidebar
5. Basic filtering only

### Filter Page Logic
1. Click category → Navigate to `/ads`
2. URL updates with `?category=slug`
3. Filter sidebar shows category-specific filters
4. Ads grid updates with filtered results
5. Advanced filtering available

### Key Difference
- **Homepage**: Quick browse with basic category filter
- **Filter Page**: Advanced search with full filter options

---

## 🎉 Current Configuration

**Navigation Bar Items: 9 total**
1. ALL CATEGORIES (mega menu)
2. Cars
3. Mobile Phones
4. Laptops
5. Motorcycles
6. Properties
7. Fashion
8. Jobs
9. Services

**Removed Categories:**
- ❌ Pets (now in mega menu only)
- ❌ TVs (now in mega menu only)

**All other categories** available in "ALL CATEGORIES" mega menu!

# Brand API URL Comparison

## Post Ad Page - Brand API URLs

### Primary API (Brands-Models):
```
GET /categories/brands-models
Params:
  - categorySlug: {selectedCategory.slug}
  - subcategorySlug: {selectedSubcategory.slug}
```
**Location:** `frontend/app/post-ad/page.tsx:1028`

### Fallback API 1 (Brands):
```
GET /categories/brands
Params:
  - categorySlug: {selectedCategory.slug}
  - subcategorySlug: {selectedSubcategory.slug}
  - limit: 10
```
**Location:** `frontend/app/post-ad/page.tsx:1066` (inside brands-models response check)

### Fallback API 2 (Brands):
```
GET /categories/brands
Params:
  - categorySlug: {selectedCategory?.slug}
  - subcategorySlug: {selectedSubcategory?.slug}
  - limit: 10
```
**Location:** `frontend/app/post-ad/page.tsx:1098` (in catch block)

### Search API (Brands with search):
```
GET /categories/brands
Params:
  - categorySlug: {selectedCategory?.slug}
  - subcategorySlug: {selectedSubcategory?.slug}
  - limit: 20
  - search: {brandSearchQuery}
```
**Location:** `frontend/app/post-ad/page.tsx:1175`

---

## Filter Page - Brand API URLs

### Primary API:
```
GET /categories/brands
Params:
  - subcategorySlug: {subcategorySlugForAPI} (if subcategory selected)
  - subcategoryId: {selectedSubcategoryId} (if valid ObjectId)
  - sub: {selectedSubcategoryData?.name} (as fallback)
  - categoryId: {selectedCategoryId} (if category selected)
```
**Location:** `frontend/components/ModernFilterSidebar.tsx:689`

### Fallback API:
```
GET /api/brands
Params: (same as above)
```
**Location:** `frontend/components/ModernFilterSidebar.tsx:735` (only if 404 error)

---

## Key Differences

### 1. **Primary Endpoint:**
- **Post Ad:** Uses `/categories/brands-models` first, then falls back to `/categories/brands`
- **Filter:** Uses `/categories/brands` directly

### 2. **Parameters:**
- **Post Ad:** 
  - Uses `categorySlug` and `subcategorySlug`
  - Includes `limit` parameter (10 or 20)
  - Has `search` parameter for search functionality
  
- **Filter:**
  - Uses `subcategorySlug`, `subcategoryId`, `sub` (name), and `categoryId`
  - No `limit` parameter (uses backend default)
  - No `search` parameter (handled client-side)

### 3. **Parameter Priority:**
- **Post Ad:** Always uses slugs (`categorySlug`, `subcategorySlug`)
- **Filter:** Tries multiple formats:
  1. `subcategorySlug` (preferred)
  2. `subcategoryId` (if valid ObjectId)
  3. `sub` (subcategory name)
  4. `categoryId` (if no subcategory)

### 4. **Error Handling:**
- **Post Ad:** Falls back to `/categories/brands` if brands-models fails
- **Filter:** Falls back to `/api/brands` only on 404 error

---

## Recommendations

1. **Standardize on `/categories/brands`** - Both pages should use the same endpoint
2. **Use consistent parameters** - Both should use `categorySlug` and `subcategorySlug` (or `categoryId` and `subcategoryId`)
3. **Remove fallback to `/api/brands`** - Use only `/categories/brands`
4. **Add `limit` parameter** - Filter page should also use limit for consistency

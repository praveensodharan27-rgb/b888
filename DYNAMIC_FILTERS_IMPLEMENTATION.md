# Dynamic Filter System Implementation

## Overview

A comprehensive, category-wise dynamic filter system that automatically adapts based on the selected category. Filters are fetched from the database and rendered dynamically on the frontend.

## Backend APIs

### 1. GET /api/filters?categorySlug=

**Purpose**: Returns filter configuration for a category based on its specifications.

**Query Parameters**:
- `categorySlug` (optional): Category slug (e.g., "mobiles", "books", "vehicles")
- `categoryId` (optional): Category ID (MongoDB ObjectId)
- `subcategorySlug` (optional): Subcategory slug

**Response**:
```json
{
  "success": true,
  "filters": [
    {
      "name": "brand",
      "label": "Brand",
      "type": "dropdown",
      "key": "brand",
      "multiple": true,
      "options": [],
      "filterable": true
    },
    {
      "name": "price",
      "label": "Price Range",
      "type": "range",
      "key": "price",
      "min": 0,
      "max": 10000000,
      "step": 1000
    },
    {
      "name": "condition",
      "label": "Condition",
      "type": "dropdown",
      "key": "condition",
      "options": [
        { "value": "NEW", "label": "New" },
        { "value": "USED", "label": "Used" }
      ]
    },
    {
      "name": "location",
      "label": "Location",
      "type": "location",
      "key": "location"
    },
    {
      "name": "sort",
      "label": "Sort By",
      "type": "dropdown",
      "key": "sort",
      "options": [
        { "value": "newest", "label": "Latest" },
        { "value": "price_low", "label": "Price: Low to High" }
      ]
    }
  ],
  "category": {
    "id": "...",
    "name": "Mobiles",
    "slug": "mobiles"
  }
}
```

**Example URLs**:
- `GET /api/filters?categorySlug=mobiles`
- `GET /api/filters?categorySlug=books&subcategorySlug=fiction`
- `GET /api/filters?categorySlug=vehicles`

### 2. GET /api/filter-values?categorySlug=

**Purpose**: Returns available filter values extracted from actual APPROVED ads in the database.

**Query Parameters**:
- `categorySlug` (optional): Category slug
- `categoryId` (optional): Category ID
- `subcategorySlug` (optional): Subcategory slug
- `field` (optional): Specific field to get values for

**Response**:
```json
{
  "success": true,
  "values": {
    "brand": ["Samsung", "Apple", "Xiaomi", "OnePlus"],
    "ram_gb": ["4GB", "6GB", "8GB", "12GB"],
    "storage_gb": ["64GB", "128GB", "256GB", "512GB"],
    "author": ["J.K. Rowling", "Stephen King"],
    "fuel": ["Petrol", "Diesel", "Electric"]
  },
  "category": {
    "id": "...",
    "name": "Mobiles",
    "slug": "mobiles"
  },
  "subcategory": null
}
```

**Example URLs**:
- `GET /api/filter-values?categorySlug=mobiles`
- `GET /api/filter-values?categorySlug=books&field=author`
- `GET /api/filter-values?categorySlug=vehicles&subcategorySlug=cars`

### 3. GET /api/ads?filters...

**Purpose**: Universal ads API that supports dynamic filters. Already implemented in `backend/routes/ads.js`.

**Query Parameters**:
- Standard: `page`, `limit`, `category`, `subcategory`, `minPrice`, `maxPrice`, `condition`, `sort`
- Location: `stateId`, `cityId`, `areaId`, `locationId`
- Dynamic: Any field from `attributes` JSON (e.g., `brand`, `ram`, `storage`, `author`, `fuel`)

**Multi-select Support**:
- Comma-separated values: `brand=Samsung,Apple,Xiaomi`
- Multiple values: `ram=4,6,8`

**Example URLs**:
- `GET /api/ads?category=mobiles&brand=Samsung,Apple&ram=6,8&minPrice=10000&maxPrice=50000&sort=price_low`
- `GET /api/ads?category=books&author=J.K. Rowling&minPrice=100&maxPrice=500`
- `GET /api/ads?category=vehicles&fuel=Petrol,Diesel&minPrice=100000&maxPrice=500000`

## Frontend Component

### DynamicFilters Component

**Location**: `frontend/components/DynamicFilters.tsx`

**Props**:
```typescript
interface DynamicFiltersProps {
  categorySlug?: string;
  subcategorySlug?: string;
  filters: Record<string, any>;
  onFilterChange: (filters: Record<string, any>) => void;
}
```

**Features**:
1. **Automatic Filter Loading**: Fetches filter configuration when category changes
2. **Dynamic Value Population**: Loads actual values from ads database
3. **Multi-select Support**: Handles multiple selections for dropdown filters
4. **Range Filters**: Price range with min/max sliders
5. **Auto-apply**: Filters apply automatically with 300ms debounce
6. **URL Sync**: Filters are stored in URL params (handled by parent)

**Usage**:
```tsx
<DynamicFilters
  categorySlug="mobiles"
  subcategorySlug="mobile-phones"
  filters={filters}
  onFilterChange={handleFilterChange}
/>
```

## Integration

### Ads Listing Page

**Location**: `frontend/app/ads/page.tsx`

The ads page conditionally renders `DynamicFilters` when a category is selected:

```tsx
{categoryParam ? (
  <DynamicFilters
    categorySlug={categoryParam}
    subcategorySlug={filters.subcategory}
    filters={filters}
    onFilterChange={handleFilterChange}
  />
) : (
  <ModernFilterSidebar
    filters={filters}
    onFilterChange={handleFilterChange}
    categoryId={categoryParam || undefined}
  />
)}
```

## Filter Types

### 1. Dropdown (Single/Multi-select)
- **Type**: `dropdown`
- **Multiple**: `true` for multi-select
- **Options**: From specifications or actual ads data
- **Example**: Brand, RAM, Storage, Author, Fuel

### 2. Range
- **Type**: `range`
- **Properties**: `min`, `max`, `step`
- **Example**: Price Range

### 3. Location
- **Type**: `location`
- **Note**: Integrate with location picker component
- **Example**: State, City, Area

### 4. Sort
- **Type**: `dropdown`
- **Options**: Latest, Price (Low/High), Popular
- **Always available**

## Category Examples

### Mobile Phones
- **Filters**: Brand, Price, Condition, RAM, Storage, Location, Sort
- **Attributes**: `brand`, `ram_gb`, `storage_gb`, `condition`

### Books
- **Filters**: Author, Publisher, Language, Price, Location, Sort
- **Attributes**: `author`, `publisher`, `language`

### Vehicles
- **Filters**: Fuel, KM Driven, Year, Owner, Price, Location, Sort
- **Attributes**: `fuel`, `km_driven`, `year`, `owner`

## Database Schema

### Ads Table
```sql
- price: number
- categoryId: ObjectId
- subcategoryId: ObjectId
- stateId: ObjectId
- cityId: ObjectId
- areaId: ObjectId
- attributes: JSON {
  brand: string,
  ram: string,
  storage: string,
  author: string,
  fuel: string,
  ...
}
- status: "APPROVED" | "PENDING" | "REJECTED"
```

## Query Builder Logic

### Backend (`backend/routes/ads.js`)

1. **Standard Filters**: Applied directly to Prisma `where` clause
   - Price: `where.price = { gte: minPrice, lte: maxPrice }`
   - Condition: `where.condition = condition`
   - Location: `where.state/city/area` based on locationId

2. **Dynamic Filters**: Post-processed after fetching
   - Prisma MongoDB doesn't support JSON path operators
   - Fetch all matching ads, then filter by `attributes` JSON
   - Supports multi-select (IN condition) and range filters

3. **Sorting**:
   - `newest`: `orderBy: { createdAt: 'desc' }`
   - `price_low`: `orderBy: [{ price: 'asc' }, { createdAt: 'desc' }]`
   - `price_high`: `orderBy: [{ price: 'desc' }, { createdAt: 'desc' }]`
   - `popular`: `orderBy: [{ views: 'desc' }, { createdAt: 'desc' }]`

## Performance Optimizations

1. **Caching**: Filter config cached for 10 minutes, values for 5 minutes
2. **Lazy Loading**: DynamicFilters component lazy-loaded
3. **Debouncing**: Filter changes debounced by 300ms
4. **Query Limits**: Filter values limited to 10,000 ads
5. **Post-filtering**: Efficient filtering after fetch for JSON attributes

## Testing Checklist

- [ ] Filter config loads for each category
- [ ] Filter values populate from actual ads
- [ ] Multi-select filters work (Brand, RAM, Storage)
- [ ] Range filters work (Price)
- [ ] Filters combine correctly (AND logic)
- [ ] URL params sync with filters
- [ ] Filters persist on page refresh
- [ ] Clear filters resets to category only
- [ ] No filters shown when no data exists
- [ ] Performance: Filters load < 500ms

## Example Flow

1. User selects "Mobiles" category
2. Frontend calls `GET /api/filters?categorySlug=mobiles`
3. Backend returns filter config: Brand, Price, Condition, RAM, Storage, Location, Sort
4. Frontend calls `GET /api/filter-values?categorySlug=mobiles`
5. Backend extracts unique values from APPROVED ads: `brand: ["Samsung", "Apple"]`, `ram_gb: ["4GB", "6GB"]`
6. Frontend renders filters with actual values
7. User selects Brand: "Samsung", RAM: "6GB", Price: 10000-50000
8. Frontend calls `GET /api/ads?category=mobiles&brand=Samsung&ram=6&minPrice=10000&maxPrice=50000`
9. Backend filters ads and returns results
10. Frontend displays filtered ads

## Next Steps

1. Add location picker integration
2. Add filter presets (e.g., "Under ₹10,000")
3. Add filter analytics (track popular filters)
4. Optimize filter values extraction (use aggregation pipeline)
5. Add filter validation (ensure selected values exist)

# Mobile Category Filters Implementation

## Overview
Complete implementation of mobile category filters for the marketplace, including backend API updates and frontend filter component.

## Backend Changes (`backend/routes/ads.js`)

### 1. Added Location Filters Support
- **stateId**: Filter by state location ID
- **cityId**: Filter by city location ID  
- **areaId**: Filter by area/neighbourhood location ID
- **locationId**: Direct location ID filter

```javascript
// Location filters (stateId, cityId, areaId)
if (req.query.stateId) {
  const stateLocation = await prisma.location.findFirst({
    where: { id: req.query.stateId },
    select: { id: true, state: true }
  });
  if (stateLocation) {
    where.state = { contains: stateLocation.state, mode: 'insensitive' };
  }
}
```

### 2. Enhanced Dynamic Filters (Attributes JSON)
- Support for **comma-separated values** for multi-select filters (brand, ram, storage)
- Case-insensitive matching for brand, RAM, and storage
- Array handling for multiple values (IN condition)

```javascript
// Support comma-separated values for multi-select filters
const value = req.query[key];
if (typeof value === 'string' && value.includes(',')) {
  dynamicFilters[key] = value.split(',').map(v => v.trim()).filter(v => v);
}
```

### 3. Improved Filter Matching Logic
- **Array filters**: Check if any filter value matches ad's value (OR logic)
- **Case-insensitive**: Normalize values for comparison
- **Empty arrays**: Treated as no filter (allows all)

```javascript
// Handle array values (multiselect filters like brand, ram, storage)
if (Array.isArray(value)) {
  if (value.length === 0) return true; // Empty array means no filter
  
  // Check if ad's value is in filter array (IN condition)
  return value.some(filterVal => 
    String(adValue).toLowerCase() === String(filterVal).toLowerCase()
  );
}
```

### 4. Added Popular Sort Option
- **popular**: Sort by views (popularity) then by creation date

```javascript
case 'popular':
  // Sort by views (popularity) then by creation date
  orderBy = [{ views: 'desc' }, { createdAt: 'desc' }];
  break;
```

### 5. Updated Query Validation
Added validation for new filter parameters:
```javascript
query('stateId').optional().isString(),
query('cityId').optional().isString(),
query('areaId').optional().isString(),
query('locationId').optional().isString(),
query('brand').optional().isString(), // Comma-separated for multiple values
query('ram').optional().isString(), // Comma-separated for multiple values
query('storage').optional().isString(), // Comma-separated for multiple values
query('sort').optional().isIn(['newest', 'oldest', 'price_low', 'price_high', 'price', 'popular', 'featured', 'bumped']),
```

## Frontend Changes

### New Component: `MobileFilters.tsx`

A comprehensive filter component for mobile category with:

#### Features:
1. **Brand Filter**: Multi-select from dynamic brands API
2. **Price Range**: Min/Max price inputs
3. **Condition**: Multi-select (New, Used, Refurbished)
4. **RAM**: Multi-select (2GB, 3GB, 4GB, 6GB, 8GB, 12GB, 16GB)
5. **Storage**: Multi-select (16GB, 32GB, 64GB, 128GB, 256GB, 512GB, 1TB)
6. **Sort**: Radio buttons (Latest, Price: Low to High, Price: High to Low, Popular)

#### State Management:
- Filters stored in URL query params
- Updates URL without page reload
- Supports browser back/forward navigation
- Clear all filters functionality

#### Usage:
```tsx
import MobileFilters from '@/components/MobileFilters';

<MobileFilters 
  categorySlug="mobiles"
  subcategorySlug="mobile-phones"
  onFilterChange={(filters) => {
    // Optional callback for filter changes
  }}
/>
```

## API Endpoints

### GET `/api/ads`
Supports the following query parameters:

#### Standard Filters:
- `category`: Category slug
- `subcategory`: Subcategory slug
- `minPrice`: Minimum price
- `maxPrice`: Maximum price
- `condition`: NEW, USED, LIKE_NEW, REFURBISHED (comma-separated for multiple)
- `sort`: newest, oldest, price_low, price_high, price, popular, featured, bumped

#### Location Filters:
- `stateId`: State location ID
- `cityId`: City location ID
- `areaId`: Area/neighbourhood location ID
- `locationId`: Direct location ID

#### Mobile-Specific Filters (Attributes):
- `brand`: Brand name(s) - comma-separated for multiple
- `ram`: RAM value(s) - comma-separated for multiple (e.g., "4GB,6GB,8GB")
- `storage`: Storage value(s) - comma-separated for multiple (e.g., "64GB,128GB")

#### Pagination:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

### Example API Call:
```
GET /api/ads?category=mobiles&subcategory=mobile-phones&brand=Samsung,Apple&ram=6GB,8GB&storage=128GB,256GB&minPrice=10000&maxPrice=50000&condition=NEW,USED&sort=popular&page=1&limit=20
```

## Data Structure

### Ad Attributes (JSON Field):
```json
{
  "brand": "Samsung",
  "model": "Galaxy S24",
  "ram_gb": 8,
  "storage_gb": 256,
  "color": "Black",
  "condition": "NEW"
}
```

### Filter Query Format:
- Single value: `brand=Samsung`
- Multiple values: `brand=Samsung,Apple,Xiaomi`
- Price range: `minPrice=10000&maxPrice=50000`
- Multiple conditions: `condition=NEW,USED`

## Post/Update Ad Form

### Required Fields for Mobile Category:
1. **brand** (required): Text input
2. **model** (required): Text input
3. **storage_gb** (required): Number input
4. **ram_gb** (required): Number input
5. **color** (optional): Text input
6. **condition**: NEW, USED, REFURBISHED

### Verification:
✅ All fields are saved in `attributes` JSON field
✅ Form validation ensures required fields are filled
✅ Update API merges attributes (doesn't drop fields)

## Testing Checklist

### Backend:
- [x] Location filters (stateId, cityId, areaId) work correctly
- [x] Multiple brand values (comma-separated) filter correctly
- [x] Multiple RAM values filter correctly
- [x] Multiple storage values filter correctly
- [x] Price range filtering works
- [x] Condition filtering works (single and multiple)
- [x] Popular sort option works
- [x] Combined filters work together
- [x] Empty filters are handled safely
- [x] Pagination works with filters

### Frontend:
- [x] MobileFilters component renders correctly
- [x] Filter state updates URL params
- [x] Multiple selections work (brand, RAM, storage)
- [x] Price range inputs work
- [x] Sort selection works
- [x] Clear all filters works
- [x] Filters persist on page reload
- [x] Browser back/forward navigation works

## Performance Considerations

1. **Post-Processing Filters**: Attributes JSON filters are applied after fetching (MongoDB limitation)
   - Consider indexing attributes if performance becomes an issue
   - Current approach: Fetch larger set, filter in memory

2. **Brand API Caching**: Brands are cached for 5 minutes
   - Reduces API calls when switching filters

3. **URL State**: Filters stored in URL
   - Enables shareable filtered URLs
   - No additional state management needed

## Future Enhancements

1. **Dynamic RAM/Storage Options**: Fetch from actual ads data instead of static list
2. **Location Autocomplete**: Add location search/autocomplete in filters
3. **Filter Counts**: Show number of results for each filter option
4. **Saved Filters**: Allow users to save filter presets
5. **Price Suggestions**: Show price range suggestions based on selected filters

## Notes

- All filters work together (AND logic between different filter types)
- Multiple values within same filter use OR logic (e.g., brand=Samsung,Apple shows ads with Samsung OR Apple)
- Only APPROVED ads are shown
- Expired ads are automatically excluded
- Case-insensitive matching for brand, RAM, and storage

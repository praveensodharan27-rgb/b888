# Generate Realistic Demo Ads

This script generates realistic demo ads for your OLX-style marketplace with:

- **Mobile Phones**: iPhone 15 Pro Max, Samsung Galaxy S24 Ultra, OnePlus 12, Xiaomi 14 Pro, Vivo X100 Pro, Realme GT 5 Pro
- **Vehicles**: Honda City, Yamaha MT-15, Maruti Swift, Royal Enfield Classic 350, Hyundai Creta
- **Properties**: 2 BHK flats, 3 BHK houses, 1 BHK studio apartments in Mumbai, Bangalore, Delhi
- **Electronics**: MacBook Pro, Samsung QLED TV, Sony Headphones, Canon Camera, iPad Pro, PlayStation 5

## Features

✅ **Real Brand Names**: Apple, Samsung, OnePlus, Xiaomi, Vivo, Realme, Honda, Yamaha, Maruti, Royal Enfield, Hyundai, Sony, Canon, etc.

✅ **Indian Pricing**: Realistic prices in Indian Rupees (₹) based on current market rates

✅ **Indian Locations**: Mumbai (Andheri, Bandra, Powai), Delhi (CP, Gurgaon, Noida), Bangalore (Koramangala, Whitefield), Hyderabad, Chennai, Pune, Kolkata, Ahmedabad, Jaipur

✅ **Detailed Specifications**: Complete specs in `attributes` JSON field:
   - Mobile: Brand, Model, Storage, RAM, Display, Processor, Camera, Battery, OS, Warranty
   - Vehicles: Brand, Model, Year, Fuel, Transmission, Mileage, Owner, Insurance, RTO, Service History
   - Properties: Type, BHK, Area, Floor, Furnishing, Parking, Amenities, Location
   - Electronics: Brand, Model, Processor, RAM, Storage, Display, Features, Warranty

✅ **Royalty-Free Images**: Uses Picsum Photos service (replace with your CDN in production)

✅ **Realistic Conditions**: NEW, LIKE_NEW, USED with appropriate pricing

✅ **Status Distribution**: 85% APPROVED, 10% PENDING, 5% SOLD/REJECTED

✅ **Premium Ads**: 25% chance of premium (TOP, FEATURED, BUMP_UP)

## Prerequisites

1. **Database Setup**: Ensure MongoDB is running and connected
2. **Users**: At least 1 user must exist in the database
3. **Categories**: Categories must be seeded (run `seed-all-categories.js` first)
4. **Locations**: Locations must be seeded (run `seed-all-indian-locations.js` or `seed-locations.js` first)

## Usage

```bash
cd backend
node scripts/generate-realistic-demo-ads.js
```

## What Gets Created

- **6 Mobile Phone Ads**: Latest models with full specifications
- **5 Vehicle Ads**: Cars and motorcycles with complete details
- **3 Property Ads**: Flats and houses in prime locations
- **6 Electronics Ads**: Laptops, TVs, cameras, headphones, tablets, gaming consoles

**Total: 20 realistic demo ads** with:
- Proper titles and descriptions
- Indian market pricing
- Detailed specifications in `attributes` field
- Multiple images per ad
- Indian city/state/neighbourhood
- Realistic status, premium flags, and dates

## Customization

### Add More Ads

Edit the arrays in the script:
- `MOBILE_PHONES` - Add more phone models
- `VEHICLES` - Add more vehicles
- `PROPERTIES` - Add more properties
- `ELECTRONICS` - Add more electronics

### Change Image URLs

Replace `getImageUrl()` function to use:
- Your CDN URLs
- AWS S3/CloudFront
- Cloudinary
- Or any image hosting service

Example:
```javascript
const getImageUrl = (seed) => {
  return `https://your-cdn.com/images/${seed}.jpg`;
};
```

### Adjust Pricing

Update prices in the ad objects to match current market rates.

### Add More Locations

Add more entries to `INDIAN_LOCATIONS` array.

## Output

The script will:
1. Connect to database
2. Find users, categories, and locations
3. Create 20 realistic ads with specifications
4. Display summary with counts by category

## Notes

- Images use Picsum Photos placeholder service (replace in production)
- All ads are linked to existing users, categories, and locations
- Specifications are stored in `attributes` JSON field for filtering/search
- Some ads are marked as premium for testing premium features
- Dates are randomized within last 60 days for realistic distribution

## Production Recommendations

1. **Replace Images**: Use actual product images from your CDN
2. **Add More Ads**: Expand each category with more variety
3. **Real User Data**: Link to actual user accounts
4. **Category Mapping**: Ensure category slugs match your database
5. **Location Mapping**: Verify location IDs exist in your database

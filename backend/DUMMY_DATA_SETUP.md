# Dummy Data System Setup Guide

## Overview
This system generates realistic Indian dummy data for development mode, making the app feel like it has real users and real-time activity without using any real user information.

## Features
- ✅ Indian names, phone numbers, locations
- ✅ Real-time ad generation via Socket.IO
- ✅ Same APIs as production
- ✅ Auto-approval of dummy ads
- ✅ Seamless integration with existing UI

## Setup

### 1. Environment Variables

Add to your `.env` file:

```env
# Enable dummy data mode
USE_DUMMY_DATA=true

# Optional: Control dummy ads generation interval (default: 30 seconds)
DUMMY_ADS_INTERVAL_SECONDS=30
```

### 2. Database Schema Update

The system requires an `isDummy` field in the User model. Run:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Or if using MongoDB directly, the field will be added automatically on first use.

### 3. Start the Server

```bash
npm run dev
```

The system will automatically:
- Start generating dummy ads every 30 seconds (or your configured interval)
- Inject dummy ads into GET /api/ads responses
- Emit new ads via Socket.IO to all connected clients

## How It Works

### Dummy Data Generation
- **Users**: Creates users with Indian names, phone numbers (+91 format), and avatars
- **Ads**: Generates ads with realistic titles, descriptions, prices, and images
- **Locations**: Uses predefined India state → city mappings
- **Categories**: Uses existing categories and subcategories from database

### Real-Time Updates
- New dummy ads are generated at configured intervals
- Ads are saved to database with `status: APPROVED`
- Socket.IO emits `new_ad` event to all connected clients
- Frontend receives and displays new ads automatically

### API Integration
- GET /api/ads - Automatically injects 2-5 dummy ads per page
- All other APIs work normally
- Dummy ads are marked internally but look identical to real ads in UI

## Disabling Dummy Data

To disable dummy data mode:

```env
USE_DUMMY_DATA=false
```

Or simply remove/comment out the variable. The system will automatically stop generating dummy ads.

## Customization

### Change Generation Interval
```env
DUMMY_ADS_INTERVAL_SECONDS=60  # Generate every 60 seconds
```

### Modify Location Data
Edit `backend/services/dummyDataService.js`:
- `INDIAN_LOCATIONS` - Add/modify states and cities
- `PRODUCT_TITLES` - Add category-specific titles
- `generatePrice()` - Adjust price ranges

### Modify User Names
Edit `generateIndianName()` function in `dummyDataService.js` to add more name variations.

## Important Notes

⚠️ **Never use in production!**
- Always check `USE_DUMMY_DATA` is `false` in production
- Dummy users are marked with `isDummy: true` in database
- Dummy ads are auto-approved and don't go through moderation

✅ **Safe for Development**
- No real user data is used
- No real phone numbers
- No real addresses/GPS coordinates
- All data is clearly marked as dummy in database

## Troubleshooting

### Dummy ads not appearing
1. Check `USE_DUMMY_DATA=true` in `.env`
2. Restart the server
3. Check console for errors
4. Verify Socket.IO connection in frontend

### Too many/few dummy ads
- Adjust `DUMMY_ADS_INTERVAL_SECONDS` in `.env`
- Modify `dummyCount` in `dummyAdsMiddleware.js`

### Database errors
- Ensure Prisma schema is updated
- Run `npm run prisma:generate`
- Check database connection

## API Response Format

Dummy ads follow the exact same format as real ads:

```json
{
  "id": "dummy_1234567890_abc123",
  "title": "Samsung Galaxy S21 Ultra 128GB",
  "description": "Selling Samsung Galaxy S21 Ultra 128GB...",
  "price": 45000,
  "images": ["https://picsum.photos/seed/abc123/800/600"],
  "category": { "id": "...", "name": "Mobiles", "slug": "mobiles" },
  "user": {
    "id": "...",
    "name": "Rahul Sharma",
    "phone": "+919876543210",
    "showPhone": true,
    "isVerified": true
  },
  "state": "Karnataka",
  "city": "Bangalore",
  "neighbourhood": "Koramangala"
}
```

Frontend cannot distinguish between dummy and real ads - they look identical!









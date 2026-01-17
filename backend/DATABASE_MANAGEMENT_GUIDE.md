# Complete Database Management Guide

## 🗄️ Full Database Management System

This guide covers complete database management with all fields and details.

## Quick Commands

### Full Database Setup
```bash
npm run db-full
```
Creates all collections, settings, and shows complete database structure.

### Interactive Database Manager
```bash
npm run db-manager
```
Interactive menu for database management.

## Database Structure

### All Collections (29 Total)

#### Core Collections
1. **users** - User accounts
2. **otps** - One-time passwords
3. **categories** - Product categories
4. **subcategories** - Subcategories
5. **locations** - Geographic locations
6. **ads** - Advertisements/listings

#### User Interaction
7. **favorites** - User favorites
8. **follows** - User follows
9. **blocks** - Blocked users
10. **contact_requests** - Contact requests

#### Commerce
11. **premium_orders** - Premium ad orders
12. **ad_posting_orders** - Ad posting orders
13. **business_packages** - Business packages
14. **extra_ad_slots** - Extra ad slots
15. **wallets** - User wallets
16. **wallet_transactions** - Wallet transactions
17. **referrals** - Referral system

#### Communication
18. **chat_rooms** - Chat rooms
19. **chat_messages** - Chat messages
20. **notifications** - User notifications
21. **push_subscriptions** - Push notification subscriptions

#### Content & Marketing
22. **banners** - Banner ads
23. **interstitial_ads** - Interstitial ads
24. **premium_settings** - Premium ad settings

#### System
25. **search_queries** - Search queries
26. **search_alert_settings** - Search alert configuration
27. **auth_page_settings** - Authentication page settings
28. **audit_logs** - Audit logs
29. **refresh_tokens** - Refresh tokens

## Field Details

### User Model
```javascript
{
  id: String (ObjectId, Primary Key)
  email: String? (unique, indexed)
  phone: String? (unique, indexed)
  password: String? (hashed)
  name: String (required)
  avatar: String? (URL)
  bio: String?
  tags: String[] (array)
  showPhone: Boolean (default: true)
  isVerified: Boolean (default: false)
  role: UserRole (USER/ADMIN, default: USER)
  freeAdsUsed: Int (default: 0)
  createdAt: DateTime (auto)
  updatedAt: DateTime (auto)
  provider: String? (OAuth provider)
  providerId: String? (OAuth ID)
  referralCode: String? (indexed)
  referredBy: String? (ObjectId, relation to User)
  isDeactivated: Boolean (default: false)
  deactivatedAt: DateTime?
  tokenInvalidatedAt: DateTime?
  locationId: String? (ObjectId, relation to Location)
}
```

### Ad Model
```javascript
{
  id: String (ObjectId, Primary Key)
  title: String (required)
  description: String (required)
  price: Float (required)
  originalPrice: Float?
  discount: Float?
  condition: String?
  images: String[] (array of URLs)
  status: AdStatus (PENDING/APPROVED/REJECTED/SOLD/EXPIRED)
  isPremium: Boolean (default: false, indexed)
  premiumType: PremiumType? (TOP/FEATURED/BUMP_UP)
  premiumExpiresAt: DateTime?
  views: Int (default: 0)
  featuredAt: DateTime? (indexed)
  bumpedAt: DateTime? (indexed)
  expiresAt: DateTime? (indexed)
  createdAt: DateTime (auto, indexed)
  updatedAt: DateTime (auto)
  userId: String (ObjectId, required, indexed, relation to User)
  categoryId: String (ObjectId, required, indexed, relation to Category)
  subcategoryId: String? (ObjectId, indexed, relation to Subcategory)
  locationId: String? (ObjectId, indexed, relation to Location)
  isUrgent: Boolean (default: false)
  attributes: Json? (flexible attributes)
  state: String? (indexed)
  city: String? (indexed)
  neighbourhood: String?
  exactLocation: String?
  moderationStatus: String? (default: "pending")
  moderationFlags: Json?
  rejectionReason: String?
  autoRejected: Boolean (default: false)
}
```

### Category Model
```javascript
{
  id: String (ObjectId, Primary Key)
  name: String (required)
  slug: String (required, unique, indexed)
  icon: String? (URL)
  image: String? (URL)
  description: String?
  order: Int (default: 0)
  isActive: Boolean (default: true)
  adPostingPrice: Float?
  createdAt: DateTime (auto)
  updatedAt: DateTime (auto)
}
```

### Location Model
```javascript
{
  id: String (ObjectId, Primary Key)
  name: String (required)
  slug: String (required, unique, indexed)
  state: String? (indexed)
  city: String? (indexed)
  pincode: String?
  latitude: Float?
  longitude: Float?
  isActive: Boolean (default: true)
  neighbourhood: String?
  createdAt: DateTime (auto)
  updatedAt: DateTime (auto)
}
```

## Indexes

### User Indexes
- email (unique)
- phone (unique)
- locationId
- provider + providerId (compound)
- referralCode
- referredBy

### Ad Indexes
- userId
- categoryId
- subcategoryId
- locationId
- status
- isPremium
- createdAt
- featuredAt
- bumpedAt
- expiresAt
- status + createdAt (compound)
- status + isPremium + createdAt (compound)
- categoryId + status + createdAt (compound)
- locationId + status + createdAt (compound)
- status + expiresAt + createdAt (compound)
- isPremium + premiumType + createdAt (compound)
- city
- state + city (compound)
- state

### Category Indexes
- slug (unique)

### Location Indexes
- slug (unique)
- state + city (compound)

## Default Settings

### Premium Settings
- PREMIUM_PRICE_TOP = 299
- PREMIUM_PRICE_FEATURED = 199
- PREMIUM_PRICE_BUMP_UP = 99
- PREMIUM_PRICE_URGENT = 49
- PREMIUM_DURATION_TOP = 7 days
- PREMIUM_DURATION_FEATURED = 14 days
- PREMIUM_DURATION_BUMP_UP = 1 day
- PREMIUM_DURATION_URGENT = 7 days
- AD_POSTING_PRICE = 49
- FREE_ADS_LIMIT = 2

### Search Alert Settings
- enabled: true
- maxEmailsPerUser: 5
- checkIntervalHours: 24

### Auth Page Settings
- Login page configuration
- Signup page configuration

## Management Commands

### View Statistics
```bash
npm run db-manager
# Select option 1
```

### Initialize Settings
```bash
npm run db-manager
# Select option 2
```

### View Field Structures
```bash
npm run db-manager
# Select option 3
```

### Full Setup
```bash
npm run db-full
```

## Data Types

### Primitives
- String
- Int
- Float
- Boolean
- DateTime

### Special Types
- String[] (Array)
- Json (Flexible JSON object)
- ObjectId (MongoDB ObjectId)
- Enums (UserRole, AdStatus, PremiumType, etc.)

## Relations

All relations use MongoDB ObjectId references:
- User → Location (many-to-one)
- User → User (self-referencing for referrals)
- Ad → User (many-to-one)
- Ad → Category (many-to-one)
- Ad → Subcategory (many-to-one)
- Ad → Location (many-to-one)
- And many more...

## Complete Field List

### All Models with All Fields

See `npm run db-manager` → Option 3 for complete field structures.

## Maintenance

### Regular Tasks
1. Check database statistics: `npm run db-manager`
2. Update settings as needed
3. Monitor collection sizes
4. Review indexes performance

### Backup
- Use MongoDB Atlas backup feature
- Export collections as needed

---

**Your database is fully managed and ready!** 🎉

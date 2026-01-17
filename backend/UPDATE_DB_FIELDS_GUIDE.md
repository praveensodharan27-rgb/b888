# Update All Database Fields - Complete Guide

## ✅ What This Does

The `update-all-db-fields.js` script comprehensively updates all database collections and fields:

1. **Search Alert Settings** - Creates/updates search alert configuration
2. **Premium Settings** - Updates all premium pricing and duration settings
3. **Auth Page Settings** - Updates login/signup page configurations
4. **User Fields** - Sets default values for missing user fields
5. **Ad Fields** - Sets default values for missing ad fields
6. **Category Fields** - Sets default values for missing category fields
7. **Location Fields** - Sets default values for missing location fields
8. **Wallet Fields** - Sets default balance for wallets
9. **Notification Fields** - Sets default read status
10. **Chat Message Fields** - Sets default message types and read status
11. **Database Statistics** - Shows complete collection counts

## 🚀 Quick Start

### Run the Update Script

```bash
cd d:\sellit\backend
npm run update-db-fields
```

Or directly:
```bash
node scripts/update-all-db-fields.js
```

## 📋 What Gets Updated

### 1. Search Alert Settings
- `enabled`: true
- `maxEmailsPerUser`: 5
- `checkIntervalHours`: 24
- `emailSubject`: "New products matching your search!"
- `emailBody`: HTML template

### 2. Premium Settings
- `PREMIUM_PRICE_TOP`: 299
- `PREMIUM_PRICE_FEATURED`: 199
- `PREMIUM_PRICE_BUMP_UP`: 99
- `PREMIUM_PRICE_URGENT`: 49
- `PREMIUM_DURATION_TOP`: 7 days
- `PREMIUM_DURATION_FEATURED`: 14 days
- `PREMIUM_DURATION_BUMP_UP`: 1 day
- `PREMIUM_DURATION_URGENT`: 7 days
- `AD_POSTING_PRICE`: 49
- `FREE_ADS_LIMIT`: 2

### 3. Auth Page Settings
- **Login Page:**
  - title: "Welcome Back"
  - subtitle: "Sign in to your account"
  - tagline: "Connect with buyers and sellers"
  - backgroundColor: "#1e293b"

- **Signup Page:**
  - title: "Join SellIt"
  - subtitle: "Create your account today"
  - tagline: "Start selling in minutes"
  - backgroundColor: "#1e293b"

### 4. User Fields (Defaults)
- `showPhone`: true
- `isVerified`: false
- `role`: "USER"
- `freeAdsUsed`: 0
- `tags`: []

### 5. Ad Fields (Defaults)
- `status`: "PENDING"
- `isPremium`: false
- `views`: 0
- `isUrgent`: false
- `moderationStatus`: "pending"
- `autoRejected`: false

### 6. Category Fields (Defaults)
- `order`: 0
- `isActive`: true

### 7. Location Fields (Defaults)
- `isActive`: true

### 8. Wallet Fields (Defaults)
- `balance`: 0

### 9. Notification Fields (Defaults)
- `isRead`: false

### 10. Chat Message Fields (Defaults)
- `isRead`: false
- `type`: "TEXT"

## 📊 Expected Output

```
======================================================================
🔄 Updating All Database Fields and Collections
======================================================================

✅ Connected to MongoDB

📋 1. Updating Search Alert Settings...
   ✅ Updated SearchAlertSettings

📋 2. Updating Premium Settings...
   ✅ Updated: PREMIUM_PRICE_TOP = 299
   ✅ Updated: PREMIUM_PRICE_FEATURED = 199
   ...

📋 3. Updating Auth Page Settings...
   ✅ Updated AuthPageSettings: login
   ✅ Updated AuthPageSettings: signup

📋 4. Updating User Fields...
   ✅ All users have required fields

📋 5. Updating Ad Fields...
   ✅ All ads have required fields

...

======================================================================
📊 Database Statistics
======================================================================

   Users:                0
   Categories:           0
   Subcategories:       0
   Locations:           0
   Ads:                  0
   Favorites:            0
   Chat Rooms:           0
   Chat Messages:       0
   Notifications:        0
   Wallets:              0
   Premium Orders:       0
   Premium Settings:     10
   Search Alert Settings: 1
   Auth Page Settings:   2
   Follows:               0
   Contact Requests:     0
   Blocks:                0
   Audit Logs:            0
   Refresh Tokens:        0

======================================================================
✅ All Database Fields Updated Successfully!
======================================================================
```

## 🔧 Troubleshooting

### Error: Cannot find module '@prisma/client'
```bash
npm run prisma:generate
npm run update-db-fields
```

### Error: Connection timeout
1. Check MongoDB connection string in `.env`
2. Verify MongoDB Atlas cluster is running
3. Check IP whitelist in MongoDB Atlas
4. Test connection: `npm run test-mongodb`

### Error: Validation error
- Make sure Prisma schema is up to date
- Run: `npm run prisma:generate`
- Check schema: `Get-Content prisma\schema.prisma | Select-String "provider"`

## 📝 Related Commands

```bash
# Update database fields
npm run update-db-fields

# Setup complete database (includes seeding)
npm run setup-db-full

# Setup MongoDB connection
npm run setup-mongodb

# Test MongoDB connection
npm run test-mongodb

# Database manager (interactive)
npm run db-manager

# Verify migration
npm run verify-migration
```

## 🎯 Next Steps After Update

1. **Seed Categories:**
   ```bash
   npm run seed-all-categories
   ```

2. **Seed Locations:**
   ```bash
   npm run seed-locations
   ```

3. **Create Admin User:**
   ```bash
   npm run create-admin
   ```

4. **Start Server:**
   ```bash
   npm run dev
   ```

## 📚 Related Documentation

- `MONGODB_MIGRATION_GUIDE.md` - Full migration guide
- `DATABASE_SETUP_GUIDE.md` - Database setup instructions
- `MONGODB_CONNECTION_UPDATE.md` - Connection configuration

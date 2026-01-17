# MongoDB Database Setup Guide

## Quick Setup

### Step 1: Verify MongoDB Connection

Make sure your `.env` file has:
```env
DATABASE_URL=mongodb+srv://b888:Ponkunnam1133!@cluster0.zfcaepv.mongodb.net/?appName=Cluster0
MONGO_URI=mongodb+srv://b888:Ponkunnam1133!@cluster0.zfcaepv.mongodb.net/?appName=Cluster0
```

### Step 2: Run Database Setup

**Basic Setup (Collections + Settings):**
```bash
cd backend
npm run setup-db
```

**Full Setup (Collections + Settings + Categories + Locations):**
```bash
cd backend
npm run setup-db-full
```

## What Gets Created

### Collections (Auto-created)
- ✅ users
- ✅ otps
- ✅ categories
- ✅ subcategories
- ✅ locations
- ✅ ads
- ✅ favorites
- ✅ premium_orders
- ✅ ad_posting_orders
- ✅ chat_rooms
- ✅ chat_messages
- ✅ premium_settings
- ✅ banners
- ✅ notifications
- ✅ interstitial_ads
- ✅ push_subscriptions
- ✅ wallets
- ✅ wallet_transactions
- ✅ referrals
- ✅ business_packages
- ✅ extra_ad_slots
- ✅ search_queries
- ✅ search_alert_settings
- ✅ auth_page_settings
- ✅ follows
- ✅ contact_requests
- ✅ blocks
- ✅ audit_logs
- ✅ refresh_tokens

### Default Settings Created

**Premium Settings:**
- PREMIUM_PRICE_TOP = 299
- PREMIUM_PRICE_FEATURED = 199
- PREMIUM_PRICE_BUMP_UP = 99
- PREMIUM_PRICE_URGENT = 49
- PREMIUM_DURATION_TOP = 7
- PREMIUM_DURATION_FEATURED = 14
- PREMIUM_DURATION_BUMP_UP = 1
- PREMIUM_DURATION_URGENT = 7
- AD_POSTING_PRICE = 49
- FREE_ADS_LIMIT = 2

**Search Alert Settings:**
- Enabled by default
- Max emails per user: 5
- Check interval: 24 hours

**Auth Page Settings:**
- Login page settings
- Signup page settings

## Manual Setup Steps

### 1. Create Collections
Collections are created automatically when you first insert data. No manual creation needed.

### 2. Create Indexes
Indexes are created automatically by Prisma based on your schema.

### 3. Seed Initial Data

**Categories:**
```bash
npm run seed-all-categories
```

**Locations:**
```bash
npm run seed-locations
```

**Admin User:**
```bash
npm run create-admin
```

## Verification

After setup, verify everything works:

```bash
# Check database connection
npm run check-db

# Check admin user
npm run check-admin

# Start server
npm run dev
```

## Troubleshooting

### Connection Errors
- Verify MongoDB connection string in `.env`
- Check MongoDB Atlas cluster is running
- Verify IP whitelist in MongoDB Atlas

### Collection Not Found
- Collections are created on first insert
- Run setup script to create initial data

### Index Errors
- Prisma creates indexes automatically
- Regenerate Prisma Client: `npm run prisma:generate`

## Complete Setup Command

```bash
# 1. Update .env with MongoDB connection
# 2. Generate Prisma Client
npm run prisma:generate

# 3. Run full database setup
npm run setup-db-full

# 4. Create admin user
npm run create-admin

# 5. Start server
npm run dev
```

---

**Your database is now ready!** 🎉

# Setup 50 Dummy Data + Admin User

## 📋 Overview

This guide will help you create:
- **50 dummy users** with wallets and referral codes
- **50 dummy ads** with various statuses and premium types
- **1 admin user** with full admin access

## ✅ Quick Start

### Option 1: Using npm script (Recommended)

```powershell
cd d:\sellit\backend
npm run add-50-dummy-and-admin
```

### Option 2: Using PowerShell script

```powershell
cd d:\sellit\backend
powershell -ExecutionPolicy Bypass -File .\setup-50-dummy-and-admin.ps1
```

### Option 3: Direct Node.js

```powershell
cd d:\sellit\backend
node scripts/add-50-dummy-data-and-admin.js
```

## 📦 What Gets Created

### 1. Admin User
- **Email**: `admin@sellit.com` (or from `ADMIN_EMAIL` env var)
- **Password**: `admin123` (or from `ADMIN_PASSWORD` env var)
- **Name**: `Admin User` (or from `ADMIN_NAME` env var)
- **Phone**: `+919999999999` (or from `ADMIN_PHONE` env var)
- **Role**: `ADMIN`
- **Verified**: `true`
- **Wallet**: Created with balance 0

### 2. 50 Dummy Users
- **Emails**: `dummy1@example.com` through `dummy50@example.com`
- **Password**: `password123` (same for all)
- **Names**: `Dummy User 1` through `Dummy User 50`
- **Phones**: `+9198765432001` through `+9198765432050`
- **Role**: `USER`
- **Verified**: `true`
- **Wallets**: Created with random balance (0-10000)
- **Referral Codes**: Unique codes for each user

### 3. 50 Dummy Ads
- **Variety**: Electronics, vehicles, furniture, fashion, books, sports, appliances, etc.
- **Status Distribution**:
  - 70% APPROVED
  - 20% PENDING
  - 5% REJECTED
  - 5% SOLD
- **Premium Ads**: 20% chance (TOP, FEATURED, or BUMP_UP)
- **Images**: 1-3 placeholder images per ad
- **Views**: Random views (0-500)
- **Dates**: Random creation dates in last 30 days

## ⚠️ Prerequisites

1. **MongoDB Connection**: Ensure your `DATABASE_URL` in `.env` is correct
   ```powershell
   node fix-url-simple.js
   ```

2. **Prisma Client**: Regenerate Prisma Client if needed
   ```powershell
   npm run prisma:generate
   ```

3. **Categories**: Categories must exist in database
   ```powershell
   npm run seed-all-categories
   ```

4. **Locations**: Locations must exist in database
   ```powershell
   npm run seed-locations
   ```

## 🔧 Customize Admin User

You can customize the admin user by setting environment variables in `.env`:

```env
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your_secure_password
ADMIN_NAME=Your Admin Name
ADMIN_PHONE=+919999999999
```

## 📊 Sample Data Created

### Users
- 50 regular users with wallets
- 1 admin user
- All users have referral codes
- All users are verified

### Ads
- 50 ads across various categories
- Mix of new, like-new, and used conditions
- Various price ranges (₹1,000 to ₹200,000)
- Random status distribution
- Some premium ads (TOP, FEATURED, BUMP_UP)
- Some urgent ads (10% chance)

## 🔍 Verify Data

After running the script, verify the data:

```powershell
# Check users
node -e "require('dotenv').config(); const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.user.count().then(c => { console.log('Total users:', c); p.user.findMany({where: {role: 'ADMIN'}}).then(admins => { console.log('Admin users:', admins.length); p.`$disconnect(); }); });"

# Check ads
node -e "require('dotenv').config(); const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.ad.count().then(c => { console.log('Total ads:', c); p.`$disconnect(); });"
```

## 📋 Login Credentials

### Admin
- **Email**: `admin@sellit.com`
- **Password**: `admin123`
- **Access**: Full admin panel access

### Regular Users
- **Email**: `dummy1@example.com` through `dummy50@example.com`
- **Password**: `password123` (same for all)
- **Access**: Regular user access

## 🐛 Troubleshooting

### Error: "No categories found"
```powershell
# Seed categories first
npm run seed-all-categories
npm run add-50-dummy-and-admin
```

### Error: "No locations found"
```powershell
# Seed locations first
npm run seed-locations
npm run add-50-dummy-and-admin
```

### Error: "authentication failed"
```powershell
# Fix MongoDB connection
node fix-url-simple.js
npm run prisma:generate
npm run add-50-dummy-and-admin
```

### Error: "DATABASE_URL must start with mongodb"
```powershell
# Fix DATABASE_URL protocol
node fix-url-simple.js
npm run prisma:generate
npm run add-50-dummy-and-admin
```

## ✅ Success Indicators

You should see output like:
```
📦 Adding 50 Dummy Data Entries + Creating Admin User
✅ Connected to MongoDB

👑 Step 1: Creating admin user...
   ✅ Admin user created: admin@sellit.com

👤 Step 2: Creating 50 dummy users...
   ✅ Created users 1 to 10...
   ✅ Created users 11 to 20...
   ...

📢 Step 3: Creating 50 dummy ads...
   ✅ Created ads 1 to 10...
   ...

📊 Summary
   Admin user: ✅ (admin@sellit.com)
   Users created: 50
   Ads created: 50
   ...
```

## 📚 Related Commands

- `npm run add-50-dummy-and-admin` - Create 50 dummy data + admin
- `npm run add-dummy-data` - Create 10 dummy data (no admin)
- `npm run create-admin` - Create only admin user
- `npm run seed-all-categories` - Seed all categories
- `npm run seed-locations` - Seed locations

## 🔄 Re-running the Script

The script uses `create` operations, so:
- **Admin user**: If admin exists, password will be updated
- **Dummy users**: Will fail if email already exists (handled gracefully)
- **Dummy ads**: Will create new ads each time

To avoid duplicates, you can:
1. Delete existing dummy users/ads first
2. Or modify the script to use `upsert` instead of `create`

## 📝 Notes

- All dummy users have the same password: `password123`
- All users are verified and have wallets
- Ads are distributed across available categories
- Some ads are premium (TOP, FEATURED, BUMP_UP)
- Images use placeholder URLs (picsum.photos)

# Update MongoDB Database - Complete Guide

## ✅ What This Does

The `update-mongodb-database.js` script performs a **complete MongoDB database update**:

1. ✅ **Updates .env file** with MongoDB connection string
2. ✅ **Generates Prisma Client** (clears cache and regenerates)
3. ✅ **Tests MongoDB connection** to verify connectivity
4. ✅ **Updates all database fields** and collections:
   - Search Alert Settings
   - Premium Settings (pricing & duration)
   - Auth Page Settings (login/signup)
   - User Fields (defaults)
   - Ad Fields (defaults)
5. ✅ **Shows database statistics** for all collections

## 🚀 Quick Start

### Run the Complete Update

```powershell
cd d:\sellit\backend
npm run update-mongodb-db
```

Or directly:
```powershell
node scripts/update-mongodb-database.js
```

## 📋 What Gets Updated

### 1. Environment Configuration
- Updates `DATABASE_URL` in `.env`
- Updates `MONGO_URI` in `.env`
- Creates `.env` if it doesn't exist

### 2. Prisma Client
- Clears Prisma cache
- Generates fresh Prisma Client
- Verifies generation success

### 3. Database Settings
- **Search Alert Settings**: Email configuration
- **Premium Settings**: All pricing and duration settings
- **Auth Page Settings**: Login and signup page configs

### 4. Collection Fields
- **Users**: Default values for missing fields
- **Ads**: Default values for missing fields
- **Categories**: Default values
- **Locations**: Default values
- **Wallets**: Default balance
- **Notifications**: Default read status
- **Chat Messages**: Default types

## 📊 Expected Output

```
======================================================================
🔄 Complete MongoDB Database Update
======================================================================

📝 Step 1: Updating .env file with MongoDB connection...

   ✅ Updated DATABASE_URL
   ✅ Updated MONGO_URI
   ✅ .env file updated

🔧 Step 2: Generating Prisma Client...

   ✅ Cleared Prisma cache
   ✔ Generated Prisma Client (5.22.0) to .\node_modules\@prisma\client
   ✅ Prisma Client generated

🧪 Step 3: Testing MongoDB connection...

   ✅ Connected to MongoDB successfully

📋 Step 4: Updating database fields and collections...

   📋 Updating Search Alert Settings...
      ✅ Updated SearchAlertSettings

   📋 Updating Premium Settings...
      ✅ Updated: PREMIUM_PRICE_TOP = 299
      ✅ Updated: PREMIUM_PRICE_FEATURED = 199
      ...

   📋 Updating Auth Page Settings...
      ✅ Updated AuthPageSettings: login
      ✅ Updated AuthPageSettings: signup

   📋 Updating User Fields...
      ✅ All users have required fields

   📋 Updating Ad Fields...
      ✅ All ads have required fields

📊 Step 5: Database Statistics

   Collection Counts:
      Users:                0
      Categories:           0
      Subcategories:       0
      Locations:           0
      Ads:                  0
      ...

======================================================================
✅ MongoDB Database Update Completed Successfully!
======================================================================

📋 Next Steps:
   1. Seed categories: npm run seed-all-categories
   2. Seed locations: npm run seed-locations
   3. Create admin: npm run create-admin
   4. Start server: npm run dev
```

## 🔧 Troubleshooting

### Error: Cannot find module '.prisma/client/default'
The script automatically generates Prisma Client, but if it fails:
```powershell
# Clear cache and regenerate
Remove-Item -Recurse -Force node_modules\.prisma -ErrorAction SilentlyContinue
npm run prisma:generate
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
# Complete MongoDB database update (recommended)
npm run update-mongodb-db

# Update only database fields (if Prisma Client already generated)
npm run update-db-fields

# Update only MongoDB connection strings
npm run update-mongodb

# Test MongoDB connection
npm run test-mongodb

# Setup complete database (includes seeding)
npm run setup-db-full

# Database manager (interactive)
npm run db-manager
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
- `MONGODB_CONNECTION_UPDATE.md` - Connection configuration
- `UPDATE_DB_FIELDS_GUIDE.md` - Database fields update guide
- `DATABASE_SETUP_GUIDE.md` - Database setup instructions

## 🔍 Verification

After running the update, verify everything is working:

```bash
# 1. Check environment
node -e "require('dotenv').config(); console.log(process.env.MONGO_URI)"

# 2. Check Prisma Client
node -e "const {PrismaClient} = require('@prisma/client'); console.log('OK')"

# 3. Test connection
npm run test-mongodb

# 4. Check database stats
npm run db-manager
```

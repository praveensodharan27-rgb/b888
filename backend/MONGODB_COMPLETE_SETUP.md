# Complete MongoDB Setup Guide

This guide will help you set up MongoDB Atlas with admin user (b888) and ensure all collections, fields, and data are properly configured.

## Prerequisites

1. MongoDB Atlas account with cluster running
2. Admin user (b888) created in MongoDB Atlas with full database access
3. IP address whitelisted in MongoDB Atlas Network Access

## Quick Setup (Automated)

Run the complete setup script:

```powershell
cd d:\sellit\backend
npm run setup-mongodb-complete
```

This script will:
- ✅ Configure MongoDB Atlas connection in `.env`
- ✅ Generate Prisma Client
- ✅ Test MongoDB connection with admin user (b888)
- ✅ Create/verify all collections
- ✅ Initialize all settings collections
- ✅ Update all existing documents with latest fields
- ✅ Ensure no data loss (IDs preserved)
- ✅ Create wallets for all users
- ✅ Show database statistics

## Manual Setup Steps

### Step 1: Configure MongoDB Atlas Connection

#### 1.1. Get MongoDB Atlas Connection String

1. Go to https://cloud.mongodb.com
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your actual password for user `b888`

Example:
```
mongodb+srv://b888:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/olx_app?retryWrites=true&w=majority&appName=Cluster0
```

#### 1.2. Update .env File

Edit `backend/.env`:

```env
DATABASE_URL="mongodb+srv://b888:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/olx_app?retryWrites=true&w=majority&appName=Cluster0"
MONGO_URI="mongodb+srv://b888:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/olx_app?retryWrites=true&w=majority&appName=Cluster0"
```

**Important:** If your password has special characters, URL-encode them:
- `@` → `%40`
- `#` → `%23`
- `!` → `%21`
- `$` → `%24`
- etc.

### Step 2: Create Admin User in MongoDB Atlas

1. Go to MongoDB Atlas → Database Access
2. Click "Add New Database User"
3. Set:
   - **Username:** `b888`
   - **Password:** (set a strong password)
   - **Database User Privileges:** 
     - Select "Atlas admin" OR
     - Select "Read and write to any database"
4. Click "Add User"
5. Save the password securely

### Step 3: Whitelist IP Address

1. Go to MongoDB Atlas → Network Access
2. Click "Add IP Address"
3. Add your current IP or `0.0.0.0/0` for all IPs (less secure)
4. Click "Confirm"

### Step 4: Generate Prisma Client

```powershell
cd d:\sellit\backend
npm run prisma:generate
```

### Step 5: Run Complete Setup

```powershell
npm run setup-mongodb-complete
```

This will:
- Test connection
- Create all collections
- Update all fields
- Initialize settings

### Step 6: Verify Setup

```powershell
# Test connection
node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.\$connect().then(() => { console.log('✅ Connected!'); p.user.count().then(c => console.log('Users:', c)); process.exit(0); }).catch(e => { console.error('❌', e.message); process.exit(1); });"
```

## Collections Created

The following collections will be created/verified:

1. **users** - User accounts
2. **otps** - OTP codes
3. **categories** - Product categories
4. **subcategories** - Product subcategories
5. **locations** - Geographic locations
6. **ads** - Advertisements/Products
7. **favorites** - User favorites
8. **premium_orders** - Premium feature orders
9. **ad_posting_orders** - Ad posting orders
10. **chat_rooms** - Chat rooms
11. **chat_messages** - Chat messages
12. **premium_settings** - Premium pricing settings
13. **banners** - Banner ads
14. **notifications** - User notifications
15. **interstitial_ads** - Interstitial ads
16. **push_subscriptions** - Push notification subscriptions
17. **wallets** - User wallets
18. **wallet_transactions** - Wallet transactions
19. **referrals** - Referral records
20. **business_packages** - Business package subscriptions
21. **extra_ad_slots** - Extra ad slot purchases
22. **search_queries** - Search query logs
23. **search_alert_settings** - Search alert configuration
24. **auth_page_settings** - Auth page customization
25. **follows** - User follows
26. **contact_requests** - Contact requests
27. **blocks** - User blocks
28. **audit_logs** - Audit logs
29. **refresh_tokens** - Refresh tokens

## Fields Updated

All existing documents will be updated with default values for missing fields:

### Users
- `showPhone`: true (default)
- `isVerified`: false (default)
- `role`: 'USER' (default)
- `freeAdsUsed`: 0 (default)
- `tags`: [] (default)
- `referralCode`: Generated if missing

### Ads
- `status`: 'PENDING' (default)
- `isPremium`: false (default)
- `views`: 0 (default)
- `isUrgent`: false (default)
- `moderationStatus`: 'pending' (default)
- `autoRejected`: false (default)
- `images`: [] (default)

### Categories
- `order`: 0 (default)
- `isActive`: true (default)

### Locations
- `isActive`: true (default)

### Wallets
- `balance`: 0 (default)
- Created for all users if missing

### Notifications
- `isRead`: false (default)

### Chat Messages
- `isRead`: false (default)
- `type`: 'TEXT' (default)

## Settings Initialized

### Search Alert Settings
- `enabled`: true
- `maxEmailsPerUser`: 5
- `checkIntervalHours`: 24
- Default email templates

### Premium Settings
- Premium prices (TOP, FEATURED, BUMP_UP, URGENT)
- Premium durations
- Ad posting price
- Free ads limit

### Auth Page Settings
- Login page settings
- Signup page settings
- Default branding

## Data Preservation

✅ **No data loss** - All existing documents are preserved
✅ **IDs consistent** - All document IDs remain the same
✅ **Relationships intact** - All references between documents are maintained
✅ **Incremental updates** - Only missing fields are added, existing data is not modified

## Verification Checklist

After running the setup, verify:

- [ ] MongoDB connection successful
- [ ] All collections exist
- [ ] Settings collections initialized
- [ ] All users have required fields
- [ ] All ads have required fields
- [ ] All users have wallets
- [ ] Database statistics look correct
- [ ] APIs work correctly (test endpoints)
- [ ] Admin login works
- [ ] User registration works

## Troubleshooting

### Connection Failed

**Error:** `authentication failed`
- Check username/password in connection string
- Verify user `b888` exists in MongoDB Atlas
- Check user has database access permissions

**Error:** `connection timeout`
- Check MongoDB Atlas cluster is running
- Verify IP address is whitelisted
- Check network/firewall settings

### Prisma Client Generation Failed

**Error:** `EPERM: operation not permitted`
- Stop all Node.js processes: `Get-Process node | Stop-Process -Force`
- Remove Prisma cache: `Remove-Item node_modules\.prisma -Recurse -Force`
- Run again: `npm run prisma:generate`

### Fields Not Updated

- Run field update script: `npm run update-db-fields-safe`
- Check for errors in console output
- Verify Prisma Client is generated correctly

## Next Steps After Setup

1. **Seed Categories:**
   ```powershell
   npm run seed-all-categories
   ```

2. **Seed Locations:**
   ```powershell
   npm run seed-locations
   ```

3. **Create Admin User:**
   ```powershell
   npm run create-admin
   ```

4. **Start Server:**
   ```powershell
   npm run dev
   ```

5. **Test APIs:**
   - Health check: http://localhost:5000/health
   - Categories: http://localhost:5000/api/categories
   - Test login/registration

## Support

If you encounter issues:
1. Check MongoDB Atlas dashboard for cluster status
2. Verify connection string format
3. Check IP whitelist
4. Review error messages in console
5. Run verification script: `npm run verify-migration`

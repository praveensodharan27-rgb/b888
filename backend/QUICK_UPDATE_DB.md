# Quick Fix: Update Database Fields

## The Problem
`Error: Cannot find module '.prisma/client/default'`

This means Prisma Client needs to be generated first.

## ✅ Quick Fix (2 Steps)

### Step 1: Generate Prisma Client
```powershell
cd d:\sellit\backend
npm run prisma:generate
```

Wait for it to complete. You should see:
```
✔ Generated Prisma Client (5.22.0) to .\node_modules\@prisma\client
```

### Step 2: Update Database Fields
```powershell
npm run update-db-fields-safe
```

Or use the automated script:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/update-db-fields-complete.ps1
```

## 🚀 One-Command Solution

The `update-db-fields` command now automatically generates Prisma Client first:

```powershell
npm run update-db-fields
```

This will:
1. Generate Prisma Client
2. Update all database fields
3. Show database statistics

## 📋 What Gets Updated

- ✅ Search Alert Settings
- ✅ Premium Settings (pricing & duration)
- ✅ Auth Page Settings (login/signup)
- ✅ User Fields (defaults)
- ✅ Ad Fields (defaults)
- ✅ Category Fields (defaults)
- ✅ Location Fields (defaults)
- ✅ Wallet Fields (defaults)
- ✅ Notification Fields (defaults)
- ✅ Chat Message Fields (defaults)

## 🔧 If It Still Fails

1. **Clear Prisma cache:**
   ```powershell
   Remove-Item -Recurse -Force node_modules\.prisma -ErrorAction SilentlyContinue
   ```

2. **Generate Prisma Client:**
   ```powershell
   npx prisma generate
   ```

3. **Verify it exists:**
   ```powershell
   Test-Path node_modules\.prisma\client\index.js
   ```
   Should return: `True`

4. **Run update:**
   ```powershell
   node scripts/update-all-db-fields.js
   ```

## 📊 Expected Output

After running successfully, you'll see:
```
======================================================================
🔄 Updating All Database Fields and Collections
======================================================================

✅ Connected to MongoDB

📋 1. Updating Search Alert Settings...
   ✅ Updated SearchAlertSettings

📋 2. Updating Premium Settings...
   ✅ Updated: PREMIUM_PRICE_TOP = 299
   ...

📊 Database Statistics
======================================================================
   Users:                0
   Categories:           0
   ...
======================================================================
✅ All Database Fields Updated Successfully!
======================================================================
```

## 🎯 Next Steps

After updating database fields:
1. Seed categories: `npm run seed-all-categories`
2. Seed locations: `npm run seed-locations`
3. Create admin: `npm run create-admin`
4. Start server: `npm run dev`

# 🧹 Database Cleanup Guide

## Overview

Safe removal of all dummy, test, and seed data while preserving admin users and production data.

---

## 🎯 What Gets Deleted

### Users
- ❌ Email matches: `test`, `dummy`, `sample`, `seed`, `demo`, `mokia`, `faker`, `example.com`
- ❌ Name matches: `test`, `dummy`, `sample`, etc.
- ❌ Fake phone numbers: `0000000000`, `+910000000000`
- ✅ **KEEPS**: All users with `role = ADMIN`
- ✅ **KEEPS**: `admin@sellit.com`, `meetmee09@gmail.com`

### Ads
- ❌ Title matches: `test`, `dummy`, `sample`, `seed`, `demo`, `lorem`, `ipsum`
- ❌ Description matches: same patterns

### Orders
- ❌ All orders with `isTestOrder = true`

### Categories
- ❌ Name/slug matches: `test`, `dummy`, `sample`

### Related Data (Cascading)
- ❌ Favorites of deleted users/ads
- ❌ Notifications of deleted users
- ❌ Chat rooms with deleted users
- ❌ Chat messages from/to deleted users
- ❌ Premium orders of deleted users
- ❌ Orphaned records

---

## 🚀 Usage

### Step 1: Preview (Safe - No Deletion)

```bash
cd backend
node scripts/cleanup-all-dummy-data.js
```

This shows:
- ✅ What will be deleted
- ✅ How many records
- ✅ Sample data
- ✅ Admin users that will be kept

### Step 2: Backup (Recommended)

```bash
# Backup entire database
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/olx_app"

# Or backup to specific folder
mongodump --uri="YOUR_URI" --out="./backup-$(date +%Y%m%d)"
```

### Step 3: Execute Cleanup

```bash
cd backend
node scripts/cleanup-all-dummy-data.js --confirm
```

---

## 📋 Safety Features

### 1. Admin Protection
```javascript
// These are NEVER deleted
- role = 'ADMIN'
- email = 'admin@sellit.com'
- email = 'meetmee09@gmail.com'
```

### 2. Preview Mode
- Default mode shows preview only
- Must use `--confirm` flag to actually delete
- Shows exactly what will be deleted

### 3. Cascading Deletes
- Automatically removes related data
- Prevents orphaned records
- Maintains referential integrity

### 4. Database Optimization
- Compacts collections after deletion
- Updates statistics
- Frees up space

---

## 📊 Example Output

### Preview Mode

```
╔════════════════════════════════════════════════════════════════════╗
║               🧹 DATABASE CLEANUP SCRIPT                           ║
╚════════════════════════════════════════════════════════════════════╝

⚠️  WARNING: This will permanently delete dummy and test data!
✅ SAFE: Admin users and production data will be preserved

✅ Connected to MongoDB

🛡️  Found 2 admin users to preserve:
   ✅ admin@sellit.com - Admin User [ADMIN]
   ✅ meetmee09@gmail.com - Super Admin [ADMIN]

📊 PREVIEW: What will be deleted

======================================================================

👥 USERS (15):
   - test@example.com | Test User | USER
   - dummy@test.com | Dummy Account | USER
   - faker123@gmail.com | Faker Name | USER
   ... and 12 more

📦 ADS (45):
   - Test Product for Sale | APPROVED | 1000
   - Dummy iPhone 12 | PENDING | 25000
   - Sample Laptop | APPROVED | 50000
   ... and 42 more

💰 TEST ORDERS (8):
   - Order 507f1f77bcf86cd799439011 | Amount: 1000 | Status: COMPLETED

📁 CATEGORIES (0):

🔗 RELATED DATA (Cascading):
   - 23 favorites
   - 67 notifications
   - 12 chat rooms
   - 89 chat messages

======================================================================

📊 TOTAL RECORDS TO DELETE: 259

======================================================================
⚠️  DRY RUN MODE (Preview Only)
======================================================================

No data was deleted. This was a preview.

To actually delete data, run:
  node scripts/cleanup-all-dummy-data.js --confirm

⚠️  RECOMMENDATION: Backup your database first!
  mongodump --uri="mongodb+srv://****:****@cluster.mongodb.net/olx_app"

✅ Database connection closed
```

### Execution Mode (--confirm)

```
🔥 PERFORMING CLEANUP...

======================================================================

1️⃣  Deleting dummy users...
   ✅ Deleted 15 users

2️⃣  Deleting dummy ads...
   ✅ Deleted 45 ads

3️⃣  Deleting test orders...
   ✅ Deleted 8 orders

4️⃣  Deleting dummy categories...
   ✅ Deleted 0 categories

5️⃣  Deleting related favorites...
   ✅ Deleted 23 favorites

6️⃣  Deleting related notifications...
   ✅ Deleted 67 notifications

7️⃣  Deleting related chat rooms...
   ✅ Deleted 12 chat rooms

8️⃣  Deleting related chat messages...
   ✅ Deleted 89 chat messages

9️⃣  Cleaning orphaned records...
   ✅ Deleted 5 orphaned favorites

🔟 Deleting premium orders for deleted users...
   ✅ Deleted 3 premium orders

======================================================================

✅ CLEANUP COMPLETE!

🔧 OPTIMIZING DATABASE...

   📊 users: 5 documents
   📊 ads: 120 documents
   📊 categories: 25 documents
   📊 adpostingorders: 45 documents

✅ Database statistics updated

📊 FINAL DATABASE STATE

======================================================================

👥 Users:        5 (2 admins)
📦 Ads:          120
📁 Categories:   25
💰 Orders:       45
⭐ Favorites:    78
💬 Chat Rooms:   15

======================================================================

✨ CLEANUP COMPLETED SUCCESSFULLY!
======================================================================

✅ Total records deleted: 267
✅ Admin users preserved
✅ Production data preserved
✅ Database optimized

======================================================================

✅ Database connection closed

✅ Script completed successfully
```

---

## 🛡️ Safety Checklist

Before running with `--confirm`:

- [ ] Backup database (mongodump)
- [ ] Run preview mode first
- [ ] Verify admin users are in "WILL BE KEPT" list
- [ ] Check sample data looks correct
- [ ] Have restore plan ready
- [ ] Not running in production (unless intentional)

---

## 🔄 Rollback Plan

If you need to restore:

```bash
# Restore from backup
mongorestore --uri="YOUR_URI" --drop ./backup-folder/
```

---

## 📝 What Gets Preserved

### ✅ Always Kept

1. **Admin Users**
   - Any user with `role = 'ADMIN'`
   - User with email `admin@sellit.com`
   - User with email `meetmee09@gmail.com`

2. **Production Data**
   - Real user accounts (non-dummy emails)
   - Real ads (no test/dummy keywords)
   - Real orders (`isTestOrder = false`)
   - Real categories (production names)

3. **Related Data**
   - Favorites of real users/ads
   - Notifications of real users
   - Chat rooms between real users
   - Messages between real users

---

## 🔍 Dummy Data Identification

### Email Patterns (Users)
```
test@example.com        ❌ Deleted
dummy@test.com          ❌ Deleted
faker123@gmail.com      ❌ Deleted
john.doe@gmail.com      ✅ Kept (real)
admin@sellit.com        ✅ Kept (admin)
```

### Title Patterns (Ads)
```
"Test iPhone for Sale"  ❌ Deleted
"Dummy Product"         ❌ Deleted
"Sample Laptop"         ❌ Deleted
"iPhone 12 Pro Max"     ✅ Kept (real)
```

### Order Patterns
```
isTestOrder: true       ❌ Deleted
isTestOrder: false      ✅ Kept
```

---

## 🎯 Common Scenarios

### Scenario 1: Clean Development Database
```bash
# Preview
node scripts/cleanup-all-dummy-data.js

# Execute
node scripts/cleanup-all-dummy-data.js --confirm
```

### Scenario 2: Prepare for Production
```bash
# 1. Backup
mongodump --uri="YOUR_URI" --out="./backup-pre-cleanup"

# 2. Preview
node scripts/cleanup-all-dummy-data.js

# 3. Execute
node scripts/cleanup-all-dummy-data.js --confirm

# 4. Verify
node scripts/cleanup-all-dummy-data.js
# Should show 0 records to delete
```

### Scenario 3: After Seed Scripts
```bash
# Remove all seeded data
node scripts/cleanup-all-dummy-data.js --confirm
```

---

## ⚠️ Important Notes

### MongoDB Specifics
- No auto-increment counters (uses ObjectId)
- No need to reset sequences
- Compact command optimizes collections
- Indexes are preserved

### Performance
- Large deletions may take time
- Database locks during compact
- Run during low-traffic periods

### Verification
```bash
# Check admin users still exist
mongo "YOUR_URI" --eval "db.users.find({role:'ADMIN'}).count()"

# Check no dummy users remain
mongo "YOUR_URI" --eval "db.users.find({email:/test|dummy/i}).count()"
# Should return 0
```

---

## 🚀 Quick Commands

```bash
# Preview only (safe)
node scripts/cleanup-all-dummy-data.js

# Execute cleanup
node scripts/cleanup-all-dummy-data.js --confirm

# Backup first
mongodump --uri="YOUR_URI" --out="./backup"

# Restore if needed
mongorestore --uri="YOUR_URI" --drop ./backup/
```

---

## 📚 Files Created

1. ✅ `scripts/cleanup-dummy-data.js` - Basic cleanup
2. ✅ `scripts/cleanup-all-dummy-data.js` - Comprehensive cleanup
3. ✅ `CLEANUP_DUMMY_DATA_GUIDE.md` - This guide

---

## ✅ Summary

| Feature | Status |
|---------|--------|
| Preview Mode | ✅ Shows what will be deleted |
| Admin Protection | ✅ Never deletes admins |
| Cascading Deletes | ✅ Removes related data |
| Database Optimization | ✅ Compacts after cleanup |
| Backup Recommendation | ✅ Prompts before deletion |
| Production Safe | ✅ Tested patterns |

---

**Ready to clean your database safely!** 🧹

**Start with**: `node scripts/cleanup-all-dummy-data.js` (preview mode)

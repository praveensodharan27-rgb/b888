# ✅ Database Cleanup System - Complete

## Overview

A comprehensive, production-safe system for removing all dummy, test, and seed data from your MongoDB database while preserving admin users and production data.

---

## 🎯 What Was Created

### 1. Main Cleanup Scripts

#### `backend/scripts/cleanup-dummy-data.js`
- Basic cleanup script
- Removes users, ads, orders, categories
- Preview and execution modes
- Admin protection

#### `backend/scripts/cleanup-all-dummy-data.js` ⭐ **RECOMMENDED**
- Comprehensive cleanup
- Cascading deletes (favorites, notifications, chats)
- Orphaned record cleanup
- Database optimization
- Detailed reporting

### 2. Launcher Scripts

#### `backend/cleanup-database.ps1` (Windows)
```powershell
.\cleanup-database.ps1 -Preview    # Safe preview
.\cleanup-database.ps1 -Execute    # Execute with confirmation
.\cleanup-database.ps1 -Help       # Show help
```

#### `backend/cleanup-database.sh` (Linux/Mac)
```bash
./cleanup-database.sh preview      # Safe preview
./cleanup-database.sh execute      # Execute with confirmation
./cleanup-database.sh help         # Show help
```

### 3. Documentation

#### `CLEANUP_QUICK_START.md`
- Quick commands
- Common use cases
- Troubleshooting

#### `backend/CLEANUP_DUMMY_DATA_GUIDE.md`
- Complete documentation
- Safety features
- Example outputs
- Rollback procedures

#### `DATABASE_CLEANUP_COMPLETE.md` (this file)
- System overview
- File reference
- Usage summary

---

## 🚀 Quick Start

### Step 1: Preview (Always Start Here)

```bash
cd backend
node scripts/cleanup-all-dummy-data.js
```

This shows:
- ✅ What will be deleted (with samples)
- ✅ How many records
- ✅ Admin users that will be kept
- ✅ Total records to delete

### Step 2: Backup (Recommended)

```bash
mongodump --uri="YOUR_MONGODB_URI" --out="./backup-$(date +%Y%m%d)"
```

### Step 3: Execute

```bash
cd backend
node scripts/cleanup-all-dummy-data.js --confirm
```

---

## 🛡️ Safety Features

### 1. Admin Protection
```javascript
// These are NEVER deleted:
- role = 'ADMIN'
- email = 'admin@sellit.com'
- email = 'meetmee09@gmail.com'
```

### 2. Preview Mode (Default)
- Shows exactly what will be deleted
- No actual deletion
- Must use `--confirm` flag to execute

### 3. Confirmation Required
- PowerShell script requires typing "DELETE"
- Prevents accidental execution

### 4. Cascading Deletes
- Automatically removes related data
- Prevents orphaned records
- Maintains referential integrity

### 5. Database Optimization
- Compacts collections after deletion
- Updates statistics
- Frees up disk space

---

## 📊 What Gets Deleted

### Users
- ❌ Email matches: `test`, `dummy`, `sample`, `seed`, `demo`, `mokia`, `faker`, `example.com`
- ❌ Name matches: same patterns
- ❌ Fake phone numbers: `0000000000`

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

## ✅ What Gets Preserved

### Always Kept
1. **Admin Users**
   - Any user with `role = 'ADMIN'`
   - Specific admin emails

2. **Production Data**
   - Real user accounts (non-dummy emails)
   - Real ads (no test keywords)
   - Real orders (`isTestOrder = false`)
   - Real categories

3. **Related Data**
   - Favorites of real users/ads
   - Notifications of real users
   - Chat rooms between real users
   - Messages between real users

---

## 📋 Usage Examples

### Example 1: Development Cleanup

```bash
# Quick cleanup after testing
cd backend
node scripts/cleanup-all-dummy-data.js --confirm
```

### Example 2: Production Preparation

```bash
# 1. Preview
node scripts/cleanup-all-dummy-data.js

# 2. Backup
mongodump --uri="YOUR_URI" --out="./backup-pre-launch"

# 3. Execute
node scripts/cleanup-all-dummy-data.js --confirm

# 4. Verify (should show 0 records to delete)
node scripts/cleanup-all-dummy-data.js
```

### Example 3: Using PowerShell (Windows)

```powershell
cd backend

# Preview
.\cleanup-database.ps1 -Preview

# Execute (requires typing "DELETE")
.\cleanup-database.ps1 -Execute
```

### Example 4: Using Bash (Linux/Mac)

```bash
cd backend

# Make executable (first time)
chmod +x cleanup-database.sh

# Preview
./cleanup-database.sh preview

# Execute (requires typing "DELETE")
./cleanup-database.sh execute
```

---

## 📊 Example Output

### Preview Mode

```
╔════════════════════════════════════════════════════════════════════╗
║               🧹 DATABASE CLEANUP SCRIPT                           ║
╚════════════════════════════════════════════════════════════════════╝

✅ Connected to MongoDB

🛡️  Found 2 admin users to preserve:
   ✅ admin@sellit.com - Admin User [ADMIN]
   ✅ meetmee09@gmail.com - Super Admin [ADMIN]

📊 PREVIEW: What will be deleted

======================================================================

👥 USERS (15):
   - test@example.com | Test User | USER
   - dummy@test.com | Dummy Account | USER
   ... and 13 more

📦 ADS (45):
   - Test Product for Sale | APPROVED | 1000
   - Dummy iPhone 12 | PENDING | 25000
   ... and 43 more

💰 TEST ORDERS (8)
📁 CATEGORIES (0)

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

To actually delete data, run:
  node scripts/cleanup-all-dummy-data.js --confirm
```

### Execution Mode

```
🔥 PERFORMING CLEANUP...

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

✅ CLEANUP COMPLETE!

📊 FINAL DATABASE STATE

👥 Users:        5 (2 admins)
📦 Ads:          120
📁 Categories:   25
💰 Orders:       45

✅ Total records deleted: 267
✅ Admin users preserved
✅ Production data preserved
✅ Database optimized
```

---

## 🔍 Verification

### After Cleanup

```bash
# Check no dummy users remain
mongo "YOUR_URI" --eval "db.users.find({email:/test|dummy/i}).count()"
# Expected: 0

# Check admin users still exist
mongo "YOUR_URI" --eval "db.users.find({role:'ADMIN'}).count()"
# Expected: 1 or more

# Check no test ads remain
mongo "YOUR_URI" --eval "db.ads.find({title:/test|dummy/i}).count()"
# Expected: 0

# Check no test orders remain
mongo "YOUR_URI" --eval "db.adpostingorders.find({isTestOrder:true}).count()"
# Expected: 0
```

---

## 🔄 Rollback Plan

If you need to restore:

```bash
# Restore from backup
mongorestore --uri="YOUR_URI" --drop ./backup-folder/
```

---

## 📁 File Structure

```
backend/
├── scripts/
│   ├── cleanup-dummy-data.js              # Basic cleanup
│   └── cleanup-all-dummy-data.js          # Comprehensive cleanup ⭐
├── cleanup-database.ps1                    # Windows launcher
├── cleanup-database.sh                     # Linux/Mac launcher
└── CLEANUP_DUMMY_DATA_GUIDE.md            # Complete guide

root/
├── CLEANUP_QUICK_START.md                  # Quick reference
└── DATABASE_CLEANUP_COMPLETE.md            # This file
```

---

## 🎯 Common Scenarios

### Scenario 1: Clean Development Database
```bash
node scripts/cleanup-all-dummy-data.js --confirm
```

### Scenario 2: Prepare for Production
```bash
# 1. Backup
mongodump --uri="YOUR_URI" --out="./backup"

# 2. Preview
node scripts/cleanup-all-dummy-data.js

# 3. Execute
node scripts/cleanup-all-dummy-data.js --confirm
```

### Scenario 3: After Running Seed Scripts
```bash
# Remove all seeded data
node scripts/cleanup-all-dummy-data.js --confirm
```

### Scenario 4: Regular Maintenance
```bash
# Run weekly/monthly to clean test data
node scripts/cleanup-all-dummy-data.js --confirm
```

---

## ⚠️ Important Notes

### MongoDB Specifics
- ✅ No auto-increment counters (uses ObjectId)
- ✅ No need to reset sequences
- ✅ Indexes are preserved
- ✅ Collections are optimized

### Performance
- Large deletions may take time
- Run during low-traffic periods for production
- Database is optimized after cleanup

### Safety
- Always run preview first
- Backup recommended for production
- Admin users are protected
- Confirmation required for execution

---

## 📚 Documentation Reference

| File | Purpose |
|------|---------|
| `CLEANUP_QUICK_START.md` | Quick commands and common use cases |
| `backend/CLEANUP_DUMMY_DATA_GUIDE.md` | Complete guide with examples |
| `DATABASE_CLEANUP_COMPLETE.md` | System overview (this file) |
| `backend/scripts/cleanup-all-dummy-data.js` | Main script source |

---

## ✅ Summary

### Created Files
- ✅ 2 cleanup scripts (basic + comprehensive)
- ✅ 2 launcher scripts (PowerShell + Bash)
- ✅ 3 documentation files
- ✅ Total: 7 files

### Features
- ✅ Preview mode (safe)
- ✅ Admin protection
- ✅ Cascading deletes
- ✅ Database optimization
- ✅ Detailed reporting
- ✅ Production safe

### Safety
- ✅ Never deletes admins
- ✅ Preview before execution
- ✅ Confirmation required
- ✅ Backup recommended
- ✅ Rollback supported

---

## 🚀 Ready to Use!

**Recommended first command:**

```bash
cd backend
node scripts/cleanup-all-dummy-data.js
```

This will show you a safe preview of what will be deleted.

---

**All systems ready for database cleanup!** 🧹✨

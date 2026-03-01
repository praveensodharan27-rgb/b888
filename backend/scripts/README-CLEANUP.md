# 🧹 Database Cleanup Scripts

## Overview

Safe removal of dummy, test, and seed data from MongoDB while preserving admin users and production data.

---

## 📁 Scripts in This Directory

### 1. `validate-cleanup.js` - Validation Script
**Purpose**: Test database connection and check for dummy data

```bash
node scripts/validate-cleanup.js
```

**Output**:
- ✅ Database connection status
- ✅ Collection counts
- ✅ Admin user verification
- ✅ Dummy data statistics

**Use Before**: Running cleanup to ensure everything is ready

---

### 2. `cleanup-all-dummy-data.js` - Main Cleanup Script ⭐
**Purpose**: Comprehensive cleanup with cascading deletes

```bash
# Preview mode (safe - no deletion)
node scripts/cleanup-all-dummy-data.js

# Execute mode (requires --confirm)
node scripts/cleanup-all-dummy-data.js --confirm
```

**Features**:
- ✅ Preview mode shows exactly what will be deleted
- ✅ Admin protection (never deletes admins)
- ✅ Cascading deletes (removes related data)
- ✅ Database optimization after cleanup
- ✅ Detailed progress reporting

**What It Deletes**:
- Users with dummy/test emails
- Ads with dummy/test titles
- Test orders (`isTestOrder = true`)
- Dummy categories
- Related data (favorites, notifications, chats)
- Orphaned records

**What It Preserves**:
- Users with `role = ADMIN`
- Specific admin emails (`admin@sellit.com`, etc.)
- All production data

---

### 3. `cleanup-dummy-data.js` - Basic Cleanup Script
**Purpose**: Simpler cleanup without cascading

```bash
node scripts/cleanup-dummy-data.js
node scripts/cleanup-dummy-data.js --confirm
```

**Use When**: You want basic cleanup without cascading deletes

---

## 🚀 Quick Start

### Step 1: Validate
```bash
node scripts/validate-cleanup.js
```

### Step 2: Preview
```bash
node scripts/cleanup-all-dummy-data.js
```

### Step 3: Backup (Recommended)
```bash
mongodump --uri="YOUR_MONGODB_URI" --out="./backup"
```

### Step 4: Execute
```bash
node scripts/cleanup-all-dummy-data.js --confirm
```

---

## 🛡️ Safety Features

### Admin Protection
```javascript
// These are NEVER deleted:
- role = 'ADMIN'
- email = 'admin@sellit.com'
- email = 'meetmee09@gmail.com'
```

### Preview Mode (Default)
- Shows what will be deleted
- No actual deletion
- Must use `--confirm` to execute

### Cascading Deletes
- Automatically removes related data
- Prevents orphaned records
- Maintains referential integrity

---

## 📊 Example Outputs

### Validation Script
```
╔══════════════════════════════════════════════════════════╗
║               🔍 CLEANUP VALIDATION                      ║
╚══════════════════════════════════════════════════════════╝

✅ Connection successful!

📊 Found 62 collections:
   ✅ users: 2671 documents
   ✅ ads: 1795 documents
   ✅ categories: 20 documents

🛡️  Checking Admin Users:
   ✅ Found 2 admin user(s):
      - admin@sellit.com [ADMIN]
      - meetmee09@gmail.com [USER]

🔍 Checking for Dummy Data:
   📊 Dummy users: 110
   📊 Dummy ads: 3
   📊 Test orders: 0
   📊 Total dummy records: 113
```

### Cleanup Preview
```
╔════════════════════════════════════════════════════════════════════╗
║               🧹 DATABASE CLEANUP SCRIPT                           ║
╚════════════════════════════════════════════════════════════════════╝

🛡️  Found 2 admin users to preserve:
   ✅ admin@sellit.com - Admin User [ADMIN]

📊 PREVIEW: What will be deleted

👥 USERS (110):
   - dummy1@example.com | Dummy User 1 | USER
   ... and 105 more

📦 ADS (3):
   - Test Product | EXPIRED | 1000
   ... and 2 more

🔗 RELATED DATA (Cascading):
   - 0 favorites
   - 284 notifications
   - 0 chat rooms
   - 0 chat messages

📊 TOTAL RECORDS TO DELETE: 397

⚠️  DRY RUN MODE (Preview Only)

To actually delete data, run:
  node scripts/cleanup-all-dummy-data.js --confirm
```

### Cleanup Execution
```
🔥 PERFORMING CLEANUP...

1️⃣  Deleting dummy users...
   ✅ Deleted 110 users

2️⃣  Deleting dummy ads...
   ✅ Deleted 3 ads

3️⃣  Deleting test orders...
   ✅ Deleted 0 orders

4️⃣  Deleting dummy categories...
   ✅ Deleted 0 categories

5️⃣  Deleting related favorites...
   ✅ Deleted 0 favorites

6️⃣  Deleting related notifications...
   ✅ Deleted 284 notifications

7️⃣  Deleting related chat rooms...
   ✅ Deleted 0 chat rooms

8️⃣  Deleting related chat messages...
   ✅ Deleted 0 chat messages

9️⃣  Cleaning orphaned records...
   ✅ Deleted 0 orphaned favorites

🔟 Deleting premium orders for deleted users...
   ✅ Deleted 0 premium orders

✅ CLEANUP COMPLETE!

📊 FINAL DATABASE STATE

👥 Users:        2561 (2 admins)
📦 Ads:          1792
📁 Categories:   20

✅ Total records deleted: 397
✅ Admin users preserved
✅ Production data preserved
✅ Database optimized
```

---

## 🔍 Dummy Data Patterns

### Users (Emails)
```regex
/test|dummy|sample|seed|demo|mokia|faker|example\.com|test\.com/i
```

**Examples**:
- ❌ `test@example.com`
- ❌ `dummy@test.com`
- ❌ `faker123@gmail.com`
- ❌ `user@example.com`
- ✅ `john.doe@gmail.com` (kept)
- ✅ `admin@sellit.com` (kept - admin)

### Ads (Titles/Descriptions)
```regex
/test|dummy|sample|seed|demo|lorem|ipsum/i
```

**Examples**:
- ❌ `"Test iPhone for Sale"`
- ❌ `"Dummy Product"`
- ❌ `"Sample Laptop"`
- ❌ `"Lorem ipsum dolor"`
- ✅ `"iPhone 12 Pro Max"` (kept)

### Orders
```javascript
isTestOrder: true  // Deleted
isTestOrder: false // Kept
```

---

## 📚 Related Documentation

- `../CLEANUP_DUMMY_DATA_GUIDE.md` - Complete guide
- `../../CLEANUP_QUICK_START.md` - Quick reference
- `../../DATABASE_CLEANUP_COMPLETE.md` - System overview
- `../CLEANUP_SUMMARY.md` - Summary

---

## ⚠️ Important Notes

### Before Running
1. ✅ Run validation script first
2. ✅ Run preview mode
3. ✅ Backup database (recommended)
4. ✅ Verify admin users are protected
5. ✅ Check sample data looks correct

### After Running
1. ✅ Verify no dummy data remains
2. ✅ Verify admin users still exist
3. ✅ Check production data intact

---

## 🔄 Rollback

If you need to restore:

```bash
# Restore from backup
mongorestore --uri="YOUR_URI" --drop ./backup/
```

---

## 🚨 Troubleshooting

### "Cannot find module"
```bash
cd backend
npm install
```

### "Connection refused"
```bash
# Check .env file
cat .env | grep DATABASE_URL

# Test connection
node scripts/validate-cleanup.js
```

### "No admin users found"
```bash
# Create admin user first
# Or verify admin exists in database
```

---

## ✅ Verification Commands

```bash
# Validate before cleanup
node scripts/validate-cleanup.js

# Preview cleanup
node scripts/cleanup-all-dummy-data.js

# Execute cleanup
node scripts/cleanup-all-dummy-data.js --confirm

# Verify after cleanup
node scripts/validate-cleanup.js
# Should show 0 dummy records
```

---

## 🎯 Common Workflows

### Workflow 1: Development Cleanup
```bash
# Quick cleanup after testing
node scripts/cleanup-all-dummy-data.js --confirm
```

### Workflow 2: Production Preparation
```bash
# 1. Validate
node scripts/validate-cleanup.js

# 2. Preview
node scripts/cleanup-all-dummy-data.js

# 3. Backup
mongodump --uri="YOUR_URI" --out="./backup"

# 4. Execute
node scripts/cleanup-all-dummy-data.js --confirm

# 5. Verify
node scripts/validate-cleanup.js
```

### Workflow 3: Regular Maintenance
```bash
# Weekly/monthly cleanup
node scripts/cleanup-all-dummy-data.js --confirm
```

---

## 📊 Script Comparison

| Feature | validate-cleanup.js | cleanup-all-dummy-data.js | cleanup-dummy-data.js |
|---------|-------------------|--------------------------|----------------------|
| Validation | ✅ | ❌ | ❌ |
| Preview | ✅ | ✅ | ✅ |
| Execution | ❌ | ✅ | ✅ |
| Cascading Deletes | ❌ | ✅ | ❌ |
| Optimization | ❌ | ✅ | ✅ |
| Detailed Reports | ✅ | ✅ | ✅ |

---

**Recommended**: Use `cleanup-all-dummy-data.js` for comprehensive cleanup with cascading deletes.

---

**All scripts are production-safe and tested!** 🧹✨

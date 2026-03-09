# ⚠️ Delete All Data (Except Admin) - Guide

## Overview

This script deletes **ALL users and posts** from the database while preserving admin users.

---

## 🎯 What Will Be Deleted

### Users
- ❌ **2,669 users** (all non-admin users)
- ✅ **2 admin users** (preserved)

### Posts/Ads
- ❌ **1,795 ads** (ALL ads)

### Related Data
- ❌ 7 favorites
- ❌ 1,949 notifications
- ❌ 0 chat rooms
- ❌ 0 chat messages
- ❌ All orders
- ❌ All payments
- ❌ All wallets (non-admin)
- ❌ All OTP codes
- ❌ All refresh tokens
- ❌ All businesses (non-admin)
- ❌ All follows, blocks, contact requests

### Total
- ❌ **6,420+ records** will be deleted

---

## ✅ What Will Be Preserved

### Admin Users (NEVER Deleted)
- ✅ `admin@sellit.com` - Admin User [ADMIN]
- ✅ `meetmee09@gmail.com` - pranav [USER]

### Categories
- ✅ All categories (preserved)

### System Data
- ✅ Categories
- ✅ Specifications
- ✅ Filter configurations

---

## 🚀 Usage

### Step 1: Preview (REQUIRED - See what will be deleted)

```bash
cd backend
node scripts/delete-all-except-admin.js
```

**Output shows**:
- Number of users to delete
- Sample users
- Number of ads to delete
- Related data counts
- Admin users that will be kept

### Step 2: Backup (HIGHLY RECOMMENDED)

```bash
# Backup entire database
mongodump --uri="YOUR_MONGODB_URI" --out="./backup-$(date +%Y%m%d)"
```

### Step 3: Execute Deletion

```bash
cd backend
node scripts/delete-all-except-admin.js --confirm
```

⚠️ **WARNING**: This action **CANNOT BE UNDONE**!

---

## 📊 Example Output

### Preview Mode

```
╔════════════════════════════════════════════════════════════════════╗
║          ⚠️  DELETE ALL DATA (EXCEPT ADMIN) ⚠️                  ║
╚════════════════════════════════════════════════════════════════════╝

⚠️  WARNING: This will DELETE ALL users and posts!
✅ SAFE: Admin users will be preserved

✅ Connected to MongoDB

🛡️  Found 2 admin user(s) to preserve:
   ✅ admin@sellit.com - Admin User [ADMIN]
   ✅ meetmee09@gmail.com - pranav [USER]

📊 PREVIEW: What will be deleted

======================================================================

👥 USERS TO DELETE: 2669
Sample users:
   - dummy1@example.com | Dummy User 1 | USER
   - dummy2@example.com | Dummy User 2 | USER
   ... and 2659 more

📦 ADS TO DELETE: 1795 (ALL ads)

🔗 RELATED DATA TO DELETE:
   - 7 favorites
   - 1949 notifications
   - 0 chat rooms
   - 0 chat messages

📊 TOTAL RECORDS TO DELETE: 6420

======================================================================
⚠️  DRY RUN MODE (Preview Only)
======================================================================

To actually delete data, run:
  node scripts/delete-all-except-admin.js --confirm
```

### Execution Mode

```
🔥 DELETING ALL DATA (EXCEPT ADMINS)...

======================================================================

1️⃣  Deleting ALL ads...
   ✅ Deleted 1795 ads

2️⃣  Deleting non-admin users...
   ✅ Deleted 2669 users

3️⃣  Deleting all favorites...
   ✅ Deleted 7 favorites

4️⃣  Deleting all notifications...
   ✅ Deleted 1949 notifications

... (16 more steps)

✅ DELETION COMPLETE!

🔍 Clearing Meilisearch index...
   ✅ Meilisearch index cleared

📊 FINAL DATABASE STATE

======================================================================

👥 Users:           2 (2 admins)
📦 Ads:             0
⭐ Favorites:       0
🔔 Notifications:   0
💬 Chat Rooms:      0
💬 Chat Messages:   0

======================================================================

✨ DELETION SUMMARY
======================================================================

✅ Total records deleted: 6420
✅ Admin users preserved: 2
✅ Meilisearch index cleared
✅ Database cleaned

======================================================================
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
- Must use `--confirm` to execute

### 3. Confirmation Required
- Must explicitly add `--confirm` flag
- Prevents accidental deletion

### 4. Backup Recommendation
- Script prompts to backup first
- Shows backup command

### 5. Error Handling
- Stops if no admin users found
- Rolls back on error (where possible)

---

## 🔄 What Happens After Deletion

### 1. Meilisearch Index
- ✅ Automatically cleared
- ✅ All search documents removed

### 2. Database State
- ✅ Only admin users remain
- ✅ No ads/posts
- ✅ No user-generated content
- ✅ Categories preserved
- ✅ System data preserved

### 3. Application State
- ✅ Admin can still login
- ✅ Fresh start for users
- ✅ No orphaned records

---

## ⚠️ Important Warnings

### THIS ACTION CANNOT BE UNDONE

Once you run with `--confirm`:
- ❌ All users (except admins) are **permanently deleted**
- ❌ All ads/posts are **permanently deleted**
- ❌ All user data is **permanently deleted**
- ❌ Cannot be recovered without a backup

### Before Running

1. ✅ **BACKUP YOUR DATABASE**
2. ✅ Run preview mode first
3. ✅ Verify admin users are protected
4. ✅ Ensure you have backup restore plan
5. ✅ Confirm this is what you want

### After Running

1. ✅ Verify admin users still exist
2. ✅ Test admin login
3. ✅ Check database state
4. ✅ Restart application if needed

---

## 🔄 Rollback Plan

If you need to restore:

```bash
# Restore from backup
mongorestore --uri="YOUR_URI" --drop ./backup/

# Or restore specific collections
mongorestore --uri="YOUR_URI" --nsInclude="olx_app.users" ./backup/
mongorestore --uri="YOUR_URI" --nsInclude="olx_app.ads" ./backup/
```

---

## 📋 Checklist

### Before Deletion
- [ ] Backup database created
- [ ] Preview mode executed
- [ ] Admin users verified in "will be kept" list
- [ ] Understand this cannot be undone
- [ ] Have restore plan ready
- [ ] Confirmed this is what you want

### After Deletion
- [ ] Admin users still exist
- [ ] Admin can login
- [ ] Database shows expected state
- [ ] Application works correctly
- [ ] Meilisearch index cleared

---

## 🚨 Common Use Cases

### Use Case 1: Fresh Start
**When**: Starting over with clean database
```bash
# Backup
mongodump --uri="YOUR_URI" --out="./backup"

# Delete all
node scripts/delete-all-except-admin.js --confirm
```

### Use Case 2: Remove Test Data
**When**: After testing, want production-ready database
```bash
# Use cleanup script instead (safer)
node scripts/cleanup-all-dummy-data.js --confirm
```

### Use Case 3: Database Reset
**When**: Need to reset everything except admin
```bash
node scripts/delete-all-except-admin.js --confirm
```

---

## 🎯 Quick Commands

```bash
# Preview what will be deleted (SAFE)
node scripts/delete-all-except-admin.js

# Backup database
mongodump --uri="YOUR_URI" --out="./backup"

# Execute deletion (DANGEROUS)
node scripts/delete-all-except-admin.js --confirm

# Restore from backup
mongorestore --uri="YOUR_URI" --drop ./backup/
```

---

## 📚 Related Scripts

| Script | Purpose | Safety |
|--------|---------|--------|
| `delete-all-except-admin.js` | Delete ALL data | ⚠️ Extreme |
| `cleanup-all-dummy-data.js` | Delete only dummy data | ✅ Safe |
| `validate-cleanup.js` | Check database state | ✅ Safe |

**Recommendation**: Use `cleanup-all-dummy-data.js` if you only want to remove test/dummy data.

---

## ✅ Summary

| What | Count | Action |
|------|-------|--------|
| Users to delete | 2,669 | ❌ Deleted |
| Admin users | 2 | ✅ Kept |
| Ads to delete | 1,795 | ❌ Deleted |
| Related data | 1,956+ | ❌ Deleted |
| Categories | 20 | ✅ Kept |
| **Total deletion** | **6,420+** | ❌ |

---

## 🚀 Ready to Use

**Preview command** (safe):
```bash
cd backend
node scripts/delete-all-except-admin.js
```

**Execution command** (dangerous):
```bash
cd backend
node scripts/delete-all-except-admin.js --confirm
```

---

**⚠️ USE WITH EXTREME CAUTION! ⚠️**

**This deletes ALL users and posts except admins!**

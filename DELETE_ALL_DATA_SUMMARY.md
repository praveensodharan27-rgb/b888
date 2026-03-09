# ⚠️ Delete All Data - Summary

## Current Database State

| Item | Count | Action |
|------|-------|--------|
| **Users** | 2,671 | |
| ├─ Admin users | 2 | ✅ **KEEP** |
| └─ Regular users | 2,669 | ❌ **DELETE** |
| **Ads** | 1,795 | ❌ **DELETE ALL** |
| **Favorites** | 7 | ❌ **DELETE** |
| **Notifications** | 1,949 | ❌ **DELETE** |
| **Categories** | 20 | ✅ **KEEP** |
| **Total to Delete** | **6,420+** | ❌ |

---

## ⚡ Quick Commands

### Preview (Safe - See what will be deleted)
```bash
cd backend
node scripts/delete-all-except-admin.js
```

### Execute (Dangerous - Actually delete)
```bash
cd backend
node scripts/delete-all-except-admin.js --confirm
```

### PowerShell (Windows)
```powershell
cd backend
.\delete-all-data.ps1 -Preview    # Safe preview
.\delete-all-data.ps1 -Execute    # Requires double confirmation
```

---

## 🛡️ Admin Users (Protected)

These users will **NEVER** be deleted:

1. ✅ `admin@sellit.com` - Admin User [ADMIN]
2. ✅ `meetmee09@gmail.com` - pranav [USER]

---

## ❌ What Gets Deleted

### All Users (Except Admins)
- 2,669 users
- Including: dummy users, test users, real users
- **Only admins are kept**

### All Ads
- 1,795 ads
- **Every single ad/post**
- No exceptions

### All Related Data
- Favorites (7)
- Notifications (1,949)
- Chat rooms (0)
- Chat messages (0)
- Orders (all)
- Payments (all)
- Wallets (non-admin)
- OTP codes (all)
- Refresh tokens (non-admin)
- Businesses (non-admin)
- Follows, blocks, contact requests (all)

---

## ✅ What Gets Kept

- ✅ 2 admin users
- ✅ 20 categories
- ✅ System configurations
- ✅ Specifications
- ✅ Filter configurations

---

## 📋 Step-by-Step Process

### Step 1: Preview (REQUIRED)
```bash
cd backend
node scripts/delete-all-except-admin.js
```

**Shows**:
- Exact count of records to delete
- Sample users to be deleted
- Admin users that will be kept
- Total records affected

### Step 2: Backup (HIGHLY RECOMMENDED)
```bash
mongodump --uri="YOUR_MONGODB_URI" --out="./backup-$(date +%Y%m%d)"
```

### Step 3: Execute
```bash
cd backend
node scripts/delete-all-except-admin.js --confirm
```

**Deletes**:
- All non-admin users
- All ads
- All related data
- Clears Meilisearch index

---

## ⚠️ Warnings

### THIS CANNOT BE UNDONE

- ❌ No recovery without backup
- ❌ All user data permanently deleted
- ❌ All posts permanently deleted
- ❌ Cannot be reversed

### Before Running

1. **BACKUP YOUR DATABASE**
2. Run preview mode
3. Verify admin users are protected
4. Understand consequences
5. Have restore plan ready

---

## 🔄 Rollback

If you need to restore:

```bash
# Restore entire database
mongorestore --uri="YOUR_URI" --drop ./backup/
```

---

## 📊 Expected Results

### Before
```
👥 Users:           2,671 (2 admins)
📦 Ads:             1,795
⭐ Favorites:       7
🔔 Notifications:   1,949
```

### After
```
👥 Users:           2 (2 admins)
📦 Ads:             0
⭐ Favorites:       0
🔔 Notifications:   0
```

---

## 🎯 Use Cases

### When to Use This Script
- ✅ Starting completely fresh
- ✅ Removing all test/production data
- ✅ Database reset (keep only admin)

### When NOT to Use
- ❌ Only want to remove dummy data → Use `cleanup-all-dummy-data.js`
- ❌ Want to keep some users → Manual deletion
- ❌ Want to keep some ads → Manual deletion

---

## 📚 Files Created

1. ✅ `backend/scripts/delete-all-except-admin.js` - Main script
2. ✅ `backend/delete-all-data.ps1` - PowerShell wrapper
3. ✅ `backend/DELETE_ALL_DATA_GUIDE.md` - Complete guide
4. ✅ `DELETE_ALL_DATA_SUMMARY.md` - This file

---

## ✅ Safety Features

- ✅ Preview mode by default
- ✅ Requires `--confirm` flag
- ✅ Admin protection (never deleted)
- ✅ Shows what will be deleted
- ✅ Backup recommendation
- ✅ Double confirmation in PowerShell
- ✅ Error handling
- ✅ Meilisearch cleanup

---

## 🚀 Quick Start

**Recommended workflow**:

```bash
# 1. Preview
cd backend
node scripts/delete-all-except-admin.js

# 2. Backup
mongodump --uri="YOUR_URI" --out="./backup"

# 3. Execute
node scripts/delete-all-except-admin.js --confirm
```

---

## 📞 Quick Help

**"How do I see what will be deleted?"**
```bash
node scripts/delete-all-except-admin.js
```

**"How do I actually delete?"**
```bash
node scripts/delete-all-except-admin.js --confirm
```

**"How do I backup?"**
```bash
mongodump --uri="YOUR_URI" --out="./backup"
```

**"How do I restore?"**
```bash
mongorestore --uri="YOUR_URI" --drop ./backup/
```

---

**⚠️ USE WITH EXTREME CAUTION! ⚠️**

This deletes **6,420+ records** including **ALL users** (except admins) and **ALL ads**!

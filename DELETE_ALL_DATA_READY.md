# ✅ Delete All Data Script - Ready

## 🎯 Script Created & Tested

Your script to delete all users and posts (except admins) is ready to use!

---

## 📊 Current Database Preview

Based on the preview run:

| Item | Count | Action |
|------|-------|--------|
| **Total Users** | 2,671 | |
| ├─ Admin Users | 2 | ✅ **KEEP** |
| └─ Regular Users | 2,669 | ❌ **DELETE** |
| **Total Ads** | 1,795 | ❌ **DELETE ALL** |
| **Favorites** | 7 | ❌ **DELETE** |
| **Notifications** | 1,949 | ❌ **DELETE** |
| **Chat Rooms** | 0 | ❌ **DELETE** |
| **Chat Messages** | 0 | ❌ **DELETE** |
| **Categories** | 20 | ✅ **KEEP** |
| | | |
| **TOTAL TO DELETE** | **6,420+** | ❌ |

---

## 🛡️ Admin Users (Protected)

These users will **NEVER** be deleted:

1. ✅ `admin@sellit.com` - Admin User [ADMIN]
2. ✅ `meetmee09@gmail.com` - pranav [USER]

---

## 🚀 How to Use

### Option 1: Node.js (Recommended)

```bash
# Step 1: Preview (SAFE - shows what will be deleted)
cd backend
node scripts/delete-all-except-admin.js

# Step 2: Backup (HIGHLY RECOMMENDED)
mongodump --uri="YOUR_MONGODB_URI" --out="./backup-$(date +%Y%m%d)"

# Step 3: Execute (DANGEROUS - actually deletes)
node scripts/delete-all-except-admin.js --confirm
```

### Option 2: PowerShell (Windows)

```powershell
cd backend

# Preview
.\delete-all-data.ps1 -Preview

# Execute (requires double confirmation)
.\delete-all-data.ps1 -Execute
```

---

## 📁 Files Created

### Scripts
1. ✅ `backend/scripts/delete-all-except-admin.js` - Main deletion script
2. ✅ `backend/delete-all-data.ps1` - PowerShell wrapper

### Documentation
3. ✅ `backend/DELETE_ALL_DATA_GUIDE.md` - Complete guide
4. ✅ `DELETE_ALL_DATA_SUMMARY.md` - Quick summary
5. ✅ `DELETE_ALL_DATA_READY.md` - This file

**Total: 5 files created** ✨

---

## ⚠️ Important Warnings

### THIS CANNOT BE UNDONE

Once you run with `--confirm`:
- ❌ **2,669 users** permanently deleted
- ❌ **1,795 ads** permanently deleted
- ❌ **6,420+ total records** permanently deleted
- ❌ Cannot be recovered without backup

### Before Running

**REQUIRED**:
1. ✅ Run preview mode first
2. ✅ Verify admin users are protected
3. ✅ **BACKUP YOUR DATABASE**

**RECOMMENDED**:
4. ✅ Test backup restore process
5. ✅ Have rollback plan ready
6. ✅ Understand consequences

---

## 📋 What Happens When You Run

### Preview Mode (Default - Safe)

```
✅ Connects to database
✅ Finds admin users to protect
✅ Counts users to delete (2,669)
✅ Counts ads to delete (1,795)
✅ Counts related data
✅ Shows sample users
✅ Shows total: 6,420+ records
❌ Does NOT delete anything
```

### Execution Mode (--confirm - Dangerous)

```
🔥 Deletes ALL ads (1,795)
🔥 Deletes non-admin users (2,669)
🔥 Deletes all favorites (7)
🔥 Deletes all notifications (1,949)
🔥 Deletes all chat rooms (0)
🔥 Deletes all chat messages (0)
🔥 Deletes all orders
🔥 Deletes all payments
🔥 Deletes all wallets (non-admin)
🔥 Deletes all OTP codes
🔥 Deletes all refresh tokens (non-admin)
🔥 Deletes all businesses (non-admin)
🔥 Deletes all follows, blocks, contacts
🔥 Clears Meilisearch index
✅ Shows final statistics
✅ Preserves 2 admin users
✅ Preserves 20 categories
```

---

## 📊 Expected Results

### Before Deletion
```
👥 Users:           2,671 (2 admins, 2,669 regular)
📦 Ads:             1,795
⭐ Favorites:       7
🔔 Notifications:   1,949
💬 Chat Rooms:      0
💬 Chat Messages:   0
📁 Categories:      20
```

### After Deletion
```
👥 Users:           2 (2 admins only) ✅
📦 Ads:             0 ✅
⭐ Favorites:       0 ✅
🔔 Notifications:   0 ✅
💬 Chat Rooms:      0 ✅
💬 Chat Messages:   0 ✅
📁 Categories:      20 (preserved) ✅
```

**Net Result**: 6,420+ records deleted, 2 admins + 20 categories preserved

---

## 🔄 Rollback Plan

If something goes wrong:

```bash
# Restore entire database from backup
mongorestore --uri="YOUR_MONGODB_URI" --drop ./backup/

# Or restore specific collections
mongorestore --uri="YOUR_URI" --nsInclude="olx_app.users" ./backup/
mongorestore --uri="YOUR_URI" --nsInclude="olx_app.ads" ./backup/
```

---

## ✅ Safety Features

1. **Preview Mode**: Default mode shows what will be deleted
2. **Admin Protection**: Never deletes users with role=ADMIN or specific emails
3. **Confirmation Required**: Must use `--confirm` flag
4. **Double Confirmation**: PowerShell script requires typing "DELETE ALL" and "YES"
5. **Backup Prompt**: Reminds to backup before deletion
6. **Error Handling**: Stops if no admin users found
7. **Meilisearch Cleanup**: Automatically clears search index
8. **Final Stats**: Shows database state after deletion

---

## 🎯 Common Scenarios

### Scenario 1: Fresh Start
**Goal**: Delete everything except admin, start fresh

```bash
# 1. Preview
node scripts/delete-all-except-admin.js

# 2. Backup
mongodump --uri="YOUR_URI" --out="./backup"

# 3. Execute
node scripts/delete-all-except-admin.js --confirm
```

### Scenario 2: Remove All Test Data
**Goal**: Clean database but keep categories

```bash
# This script is perfect - deletes all users/ads, keeps admin + categories
node scripts/delete-all-except-admin.js --confirm
```

### Scenario 3: Database Reset
**Goal**: Reset to admin-only state

```bash
node scripts/delete-all-except-admin.js --confirm
```

---

## 🚨 Troubleshooting

### "No admin users found"
**Problem**: Script stops because no admin users exist
**Solution**: Create an admin user first

### "Connection refused"
**Problem**: Cannot connect to MongoDB
**Solution**: Check `DATABASE_URL` in `backend/.env`

### "Meilisearch error"
**Problem**: Cannot clear search index
**Solution**: This is non-critical, deletion continues

---

## 📚 Documentation Reference

| Document | Purpose | Location |
|----------|---------|----------|
| Quick Summary | Overview & commands | `DELETE_ALL_DATA_SUMMARY.md` |
| Complete Guide | Full documentation | `backend/DELETE_ALL_DATA_GUIDE.md` |
| Ready Status | This file | `DELETE_ALL_DATA_READY.md` |

---

## ✅ Verification After Deletion

```bash
# Check database state
cd backend
node scripts/validate-cleanup.js

# Should show:
# - 2 users (both admins)
# - 0 ads
# - 0 dummy data
```

---

## 💡 Alternative: Delete Only Dummy Data

If you want to **keep real users** and only delete dummy/test data:

```bash
# Use this instead (safer)
cd backend
node scripts/cleanup-all-dummy-data.js --confirm
```

This will:
- ✅ Keep real users
- ✅ Keep real ads
- ❌ Delete only dummy/test data

---

## 🚀 Ready to Use!

Your deletion script is:
- ✅ Created and tested
- ✅ Preview mode working
- ✅ Admin protection verified
- ✅ Safety features in place
- ✅ Documentation complete

**Next Step**: Run preview mode

```bash
cd backend
node scripts/delete-all-except-admin.js
```

This will show you exactly what will be deleted without actually deleting anything.

---

## ⚠️ FINAL WARNING

**This script will delete**:
- ❌ 2,669 users (all non-admin)
- ❌ 1,795 ads (ALL ads)
- ❌ 6,420+ total records

**This script will keep**:
- ✅ 2 admin users
- ✅ 20 categories

**THIS CANNOT BE UNDONE WITHOUT A BACKUP!**

---

**Your deletion script is ready!** 🗑️

**Start with**: `cd backend && node scripts/delete-all-except-admin.js` (preview mode)

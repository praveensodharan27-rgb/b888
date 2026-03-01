# 🧹 Database Cleanup - Visual Guide

## 🎯 One-Page Quick Reference

```
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE CLEANUP WORKFLOW                  │
└─────────────────────────────────────────────────────────────┘

Step 1: VALIDATE                Step 2: PREVIEW
┌──────────────────┐           ┌──────────────────┐
│ node scripts/    │           │ node scripts/    │
│ validate-        │  ──────>  │ cleanup-all-     │
│ cleanup.js       │           │ dummy-data.js    │
└──────────────────┘           └──────────────────┘
        │                              │
        ▼                              ▼
   Connection OK?               Review what will
   Admin users OK?              be deleted
   Dummy data found?            
                                       │
                                       ▼
                              Step 3: BACKUP (Optional)
                              ┌──────────────────┐
                              │ mongodump        │
                              │ --uri="..."      │
                              └──────────────────┘
                                       │
                                       ▼
                              Step 4: EXECUTE
                              ┌──────────────────┐
                              │ node scripts/    │
                              │ cleanup-all-     │
                              │ dummy-data.js    │
                              │ --confirm        │
                              └──────────────────┘
                                       │
                                       ▼
                              Step 5: VERIFY
                              ┌──────────────────┐
                              │ node scripts/    │
                              │ validate-        │
                              │ cleanup.js       │
                              └──────────────────┘
                                       │
                                       ▼
                                   ✅ DONE!
```

---

## 📊 Current Database State

```
╔════════════════════════════════════════════════════════════╗
║                    BEFORE CLEANUP                          ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  👥 Total Users:           2,671                          ║
║     ├─ Admin Users:        2 ✅ (protected)              ║
║     ├─ Real Users:         2,559 ✅ (kept)               ║
║     └─ Dummy Users:        110 ❌ (will be deleted)      ║
║                                                            ║
║  📦 Total Ads:             1,795                          ║
║     ├─ Real Ads:           1,792 ✅ (kept)               ║
║     └─ Dummy Ads:          3 ❌ (will be deleted)        ║
║                                                            ║
║  📁 Categories:            20 ✅ (all kept)               ║
║                                                            ║
║  🔔 Notifications:         ~284 ❌ (dummy, deleted)       ║
║                                                            ║
║  🗑️  TOTAL TO DELETE:      397 records                    ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

                            ⬇️ CLEANUP ⬇️

╔════════════════════════════════════════════════════════════╗
║                     AFTER CLEANUP                          ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  👥 Total Users:           2,561 ✅                       ║
║     ├─ Admin Users:        2 ✅ (preserved)              ║
║     ├─ Real Users:         2,559 ✅ (preserved)          ║
║     └─ Dummy Users:        0 ✅ (cleaned)                ║
║                                                            ║
║  📦 Total Ads:             1,792 ✅                       ║
║     ├─ Real Ads:           1,792 ✅ (preserved)          ║
║     └─ Dummy Ads:          0 ✅ (cleaned)                ║
║                                                            ║
║  📁 Categories:            20 ✅ (preserved)              ║
║                                                            ║
║  🔔 Notifications:         Real only ✅                   ║
║                                                            ║
║  🗑️  DUMMY DATA:           0 ✅ (clean!)                  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

---

## 🛡️ Safety Matrix

```
┌─────────────────────────────────────────────────────────────┐
│                    WHAT GETS DELETED                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ❌ Users                                                   │
│     • dummy1@example.com through dummy110@example.com      │
│     • Any email matching: test|dummy|sample|seed|demo      │
│     • Fake phone numbers: 0000000000                       │
│                                                             │
│  ❌ Ads                                                     │
│     • Titles matching: test|dummy|sample|lorem|ipsum       │
│     • Descriptions with test patterns                      │
│                                                             │
│  ❌ Orders                                                  │
│     • isTestOrder = true                                   │
│                                                             │
│  ❌ Categories                                              │
│     • Names matching: test|dummy|sample                    │
│                                                             │
│  ❌ Related Data (Cascading)                                │
│     • Favorites of deleted users/ads                       │
│     • Notifications of deleted users                       │
│     • Chat rooms with deleted users                        │
│     • Messages from/to deleted users                       │
│     • Orphaned records                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    WHAT GETS KEPT                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ Admin Users (ALWAYS)                                    │
│     • role = 'ADMIN'                                       │
│     • admin@sellit.com                                     │
│     • meetmee09@gmail.com                                  │
│                                                             │
│  ✅ Production Users                                        │
│     • Real email addresses                                 │
│     • Valid phone numbers                                  │
│     • Non-dummy names                                      │
│                                                             │
│  ✅ Production Ads                                          │
│     • Real product titles                                  │
│     • Genuine descriptions                                 │
│     • All statuses (APPROVED, PENDING, etc.)              │
│                                                             │
│  ✅ Real Orders                                             │
│     • isTestOrder = false                                  │
│     • All payment records                                  │
│                                                             │
│  ✅ Production Categories                                   │
│     • All real categories                                  │
│     • All subcategories                                    │
│                                                             │
│  ✅ Related Data                                            │
│     • Favorites of real users/ads                          │
│     • Notifications of real users                          │
│     • Chat rooms between real users                        │
│     • Messages between real users                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Command Cheat Sheet

```
╔════════════════════════════════════════════════════════════╗
║                    COMMAND REFERENCE                       ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  📍 VALIDATE CONNECTION & DATA                            ║
║  ─────────────────────────────────────────────────────    ║
║  $ cd backend                                             ║
║  $ node scripts/validate-cleanup.js                       ║
║                                                            ║
║  📍 PREVIEW CLEANUP (SAFE - NO DELETION)                  ║
║  ─────────────────────────────────────────────────────    ║
║  $ cd backend                                             ║
║  $ node scripts/cleanup-all-dummy-data.js                 ║
║                                                            ║
║  📍 BACKUP DATABASE (RECOMMENDED)                         ║
║  ─────────────────────────────────────────────────────    ║
║  $ mongodump --uri="YOUR_URI" --out="./backup"           ║
║                                                            ║
║  📍 EXECUTE CLEANUP (REQUIRES --confirm)                  ║
║  ─────────────────────────────────────────────────────    ║
║  $ cd backend                                             ║
║  $ node scripts/cleanup-all-dummy-data.js --confirm       ║
║                                                            ║
║  📍 VERIFY CLEANUP                                        ║
║  ─────────────────────────────────────────────────────    ║
║  $ cd backend                                             ║
║  $ node scripts/validate-cleanup.js                       ║
║                                                            ║
║  📍 RESTORE FROM BACKUP (IF NEEDED)                       ║
║  ─────────────────────────────────────────────────────    ║
║  $ mongorestore --uri="YOUR_URI" --drop ./backup/        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

---

## 📊 Execution Timeline

```
┌─────────────────────────────────────────────────────────────┐
│                    CLEANUP PROCESS                          │
└─────────────────────────────────────────────────────────────┘

Time: 0s
├─ 🔌 Connect to MongoDB
│  └─ ✅ Connection successful
│
Time: 1s
├─ 🛡️  Find admin users
│  └─ ✅ Found 2 admin users to preserve
│
Time: 2s
├─ 🔍 Scan for dummy data
│  ├─ Found 110 dummy users
│  ├─ Found 3 dummy ads
│  └─ Found 284 related notifications
│
Time: 3s
├─ 🔥 Delete dummy users
│  └─ ✅ Deleted 110 users
│
Time: 4s
├─ 🔥 Delete dummy ads
│  └─ ✅ Deleted 3 ads
│
Time: 5s
├─ 🔥 Delete test orders
│  └─ ✅ Deleted 0 orders
│
Time: 6s
├─ 🔥 Delete dummy categories
│  └─ ✅ Deleted 0 categories
│
Time: 7s
├─ 🔥 Delete related favorites
│  └─ ✅ Deleted 0 favorites
│
Time: 8s
├─ 🔥 Delete related notifications
│  └─ ✅ Deleted 284 notifications
│
Time: 9s
├─ 🔥 Delete related chat rooms
│  └─ ✅ Deleted 0 chat rooms
│
Time: 10s
├─ 🔥 Delete related chat messages
│  └─ ✅ Deleted 0 chat messages
│
Time: 11s
├─ 🧹 Clean orphaned records
│  └─ ✅ Deleted 0 orphaned records
│
Time: 12s
├─ 🔥 Delete premium orders
│  └─ ✅ Deleted 0 premium orders
│
Time: 13s
├─ 🔧 Optimize database
│  └─ ✅ Database optimized
│
Time: 14s
└─ ✅ CLEANUP COMPLETE!
   Total time: ~14 seconds
   Total deleted: 397 records
```

---

## 🎯 Decision Tree

```
                    START
                      │
                      ▼
        Do you need to clean dummy data?
                      │
            ┌─────────┴─────────┐
            │                   │
           YES                 NO
            │                   │
            ▼                   ▼
    Run validate-cleanup    You're done!
            │
            ▼
    Connection OK?
            │
      ┌─────┴─────┐
      │           │
     YES         NO
      │           │
      ▼           ▼
Run preview    Fix connection
      │         (check .env)
      ▼
Review what will
be deleted
      │
      ▼
Admin users
protected?
      │
  ┌───┴───┐
  │       │
 YES     NO
  │       │
  ▼       ▼
Backup?  STOP!
  │     Fix admin
  │     protection
  ▼
Run cleanup
--confirm
  │
  ▼
Verify
cleanup
  │
  ▼
✅ DONE!
```

---

## 📚 File Quick Reference

```
┌─────────────────────────────────────────────────────────────┐
│                    FILE STRUCTURE                           │
└─────────────────────────────────────────────────────────────┘

backend/
├── scripts/
│   ├── 📄 validate-cleanup.js          ← Test connection
│   ├── 📄 cleanup-all-dummy-data.js    ← Main cleanup ⭐
│   ├── 📄 cleanup-dummy-data.js        ← Basic cleanup
│   └── 📄 README-CLEANUP.md            ← Scripts docs
│
├── 📄 cleanup-database.ps1             ← Windows launcher
├── 📄 cleanup-database.sh              ← Linux/Mac launcher
├── 📄 CLEANUP_DUMMY_DATA_GUIDE.md      ← Complete guide
├── 📄 CLEANUP_SUMMARY.md               ← Summary
└── 📄 CLEANUP_VISUAL_GUIDE.md          ← This file

root/
├── 📄 CLEANUP_QUICK_START.md           ← Quick reference
├── 📄 DATABASE_CLEANUP_COMPLETE.md     ← System overview
└── 📄 CLEANUP_SYSTEM_READY.md          ← Ready status
```

---

## ✅ Checklist

```
┌─────────────────────────────────────────────────────────────┐
│                   PRE-CLEANUP CHECKLIST                     │
└─────────────────────────────────────────────────────────────┘

Before running cleanup:

□ Database connection tested
□ Admin users verified (should be 2+)
□ Preview mode executed
□ Sample data reviewed
□ Admin users in "will be kept" list
□ Backup created (recommended)
□ Ready to delete dummy data

┌─────────────────────────────────────────────────────────────┐
│                   POST-CLEANUP CHECKLIST                    │
└─────────────────────────────────────────────────────────────┘

After running cleanup:

□ Validation script shows 0 dummy records
□ Admin users still exist
□ Production data intact
□ Application tested
□ No errors in logs
```

---

**Your visual guide to database cleanup!** 🧹✨

**Quick Start**: `cd backend && node scripts/validate-cleanup.js`

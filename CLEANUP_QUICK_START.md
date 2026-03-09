# 🧹 Database Cleanup - Quick Start

Remove all dummy, test, and seed data safely.

---

## ⚡ Quick Commands

### Windows (PowerShell)

```powershell
# Preview what will be deleted (safe)
cd backend
.\cleanup-database.ps1 -Preview

# Execute cleanup (requires confirmation)
.\cleanup-database.ps1 -Execute
```

### Linux/Mac (Bash)

```bash
# Make script executable (first time only)
chmod +x backend/cleanup-database.sh

# Preview what will be deleted (safe)
cd backend
./cleanup-database.sh preview

# Execute cleanup (requires confirmation)
./cleanup-database.sh execute
```

### Direct Node.js

```bash
cd backend

# Preview
node scripts/cleanup-all-dummy-data.js

# Execute
node scripts/cleanup-all-dummy-data.js --confirm
```

---

## 🛡️ Safety Guarantees

### ✅ Always Preserved
- All users with `role = ADMIN`
- User: `admin@sellit.com`
- User: `meetmee09@gmail.com`
- All production data

### ❌ Will Be Deleted
- Users with test/dummy emails
- Ads with test/dummy titles
- Test orders (`isTestOrder = true`)
- Dummy categories
- Related orphaned data

---

## 📋 Recommended Workflow

### Step 1: Preview (Safe)
```bash
cd backend
node scripts/cleanup-all-dummy-data.js
```

**Output shows:**
- Number of records to delete
- Sample data preview
- Admin users that will be kept

### Step 2: Backup (Optional but Recommended)
```bash
# Backup entire database
mongodump --uri="YOUR_MONGODB_URI" --out="./backup-$(date +%Y%m%d)"
```

### Step 3: Execute
```bash
cd backend
node scripts/cleanup-all-dummy-data.js --confirm
```

**Output shows:**
- Real-time deletion progress
- Final statistics
- Optimization results

---

## 🎯 What You'll See

### Preview Mode Output
```
╔════════════════════════════════════════════════════════════════════╗
║               🧹 DATABASE CLEANUP SCRIPT                           ║
╚════════════════════════════════════════════════════════════════════╝

✅ Connected to MongoDB

🛡️  Found 2 admin users to preserve:
   ✅ admin@sellit.com - Admin User [ADMIN]

📊 PREVIEW: What will be deleted

👥 USERS (15):
   - test@example.com | Test User | USER
   ... and 12 more

📦 ADS (45):
   - Test Product for Sale | APPROVED | 1000
   ... and 42 more

💰 TEST ORDERS (8)
📁 CATEGORIES (0)

🔗 RELATED DATA (Cascading):
   - 23 favorites
   - 67 notifications
   - 12 chat rooms
   - 89 chat messages

📊 TOTAL RECORDS TO DELETE: 259

⚠️  DRY RUN MODE (Preview Only)

To actually delete data, run:
  node scripts/cleanup-all-dummy-data.js --confirm
```

### Execution Mode Output
```
🔥 PERFORMING CLEANUP...

1️⃣  Deleting dummy users...
   ✅ Deleted 15 users

2️⃣  Deleting dummy ads...
   ✅ Deleted 45 ads

3️⃣  Deleting test orders...
   ✅ Deleted 8 orders

... (more steps)

✅ CLEANUP COMPLETE!

📊 FINAL DATABASE STATE

👥 Users:        5 (2 admins)
📦 Ads:          120
📁 Categories:   25

✅ Total records deleted: 267
✅ Admin users preserved
✅ Production data preserved
✅ Database optimized
```

---

## 🔍 Dummy Data Patterns

### Emails (Users)
```
❌ test@example.com
❌ dummy@test.com
❌ faker123@gmail.com
❌ sample@example.com
✅ john.doe@gmail.com (kept - real)
✅ admin@sellit.com (kept - admin)
```

### Titles (Ads)
```
❌ "Test iPhone for Sale"
❌ "Dummy Product"
❌ "Sample Laptop"
❌ "Lorem ipsum dolor"
✅ "iPhone 12 Pro Max" (kept - real)
```

### Orders
```
❌ isTestOrder: true
✅ isTestOrder: false (kept)
```

---

## ⚠️ Important Notes

1. **Preview First**: Always run preview mode before executing
2. **Backup**: Recommended for production databases
3. **Admin Safe**: Admin users are NEVER deleted
4. **Cascading**: Related data is automatically cleaned
5. **Optimization**: Database is optimized after cleanup

---

## 🚨 Troubleshooting

### "Cannot find module"
```bash
cd backend
npm install
```

### "Connection refused"
```bash
# Check .env file has DATABASE_URL
cat .env | grep DATABASE_URL
```

### "No admin users found"
```bash
# Verify admin exists first
mongo "YOUR_URI" --eval "db.users.find({role:'ADMIN'}).pretty()"
```

---

## 📚 Full Documentation

For detailed information, see:
- `backend/CLEANUP_DUMMY_DATA_GUIDE.md` - Complete guide
- `backend/scripts/cleanup-all-dummy-data.js` - Script source

---

## ✅ Verification After Cleanup

```bash
# Check no dummy users remain
mongo "YOUR_URI" --eval "db.users.find({email:/test|dummy/i}).count()"
# Should return: 0

# Check admin users still exist
mongo "YOUR_URI" --eval "db.users.find({role:'ADMIN'}).count()"
# Should return: 1 or more

# Check no test ads remain
mongo "YOUR_URI" --eval "db.ads.find({title:/test|dummy/i}).count()"
# Should return: 0
```

---

## 🎯 Common Use Cases

### Before Production Launch
```bash
# 1. Preview
node scripts/cleanup-all-dummy-data.js

# 2. Backup
mongodump --uri="YOUR_URI" --out="./backup-pre-launch"

# 3. Execute
node scripts/cleanup-all-dummy-data.js --confirm

# 4. Verify
node scripts/cleanup-all-dummy-data.js
# Should show 0 records to delete
```

### After Development Testing
```bash
# Quick cleanup
node scripts/cleanup-all-dummy-data.js --confirm
```

### Regular Maintenance
```bash
# Run weekly/monthly to remove test data
node scripts/cleanup-all-dummy-data.js --confirm
```

---

## 📞 Need Help?

1. Run preview mode to see what will happen
2. Check `CLEANUP_DUMMY_DATA_GUIDE.md` for details
3. Verify admin users are protected
4. Backup before executing

---

**Ready to clean your database!** 🧹

**Start with**: `node scripts/cleanup-all-dummy-data.js` (preview mode)

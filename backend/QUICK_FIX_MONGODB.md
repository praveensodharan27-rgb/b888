# Quick Fix: MongoDB Authentication Error

## The Problem
```
SCRAM failure: bad auth : authentication failed
```

Your MongoDB username/password is incorrect in the connection string.

## Quick Fix Steps

### Step 1: Stop All Node.js Processes
```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Step 2: Get Your Correct MongoDB Connection String

**For MongoDB Atlas:**
1. Go to https://cloud.mongodb.com
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your actual password

**Example:**
```
mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/sellit?retryWrites=true&w=majority&appName=Cluster0
```

### Step 3: Update .env File

Edit `backend/.env` and update these lines:

```env
DATABASE_URL="mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/database?retryWrites=true&w=majority"
MONGO_URI="mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/database?retryWrites=true&w=majority"
```

**⚠️ Important:** If your password has special characters, URL-encode them:
- `@` → `%40`
- `#` → `%23`
- `!` → `%21`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `=` → `%3D`
- `?` → `%3F`
- `/` → `%2F`

**Example:**
- Password: `P@ssw0rd!`
- Encoded: `P%40ssw0rd%21`
- Connection: `mongodb+srv://user:P%40ssw0rd%21@cluster.mongodb.net/db`

### Step 4: Remove Old Prisma Client (Fix File Lock)

```powershell
cd d:\sellit\backend
Remove-Item -Path "node_modules\.prisma\client" -Recurse -Force -ErrorAction SilentlyContinue
```

### Step 5: Regenerate Prisma Client

```powershell
npx prisma generate
```

### Step 6: Test Connection

```powershell
node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.\$connect().then(() => { console.log('✅ Connected to MongoDB!'); process.exit(0); }).catch(e => { console.error('❌ Connection failed:', e.message); process.exit(1); });"
```

### Step 7: Start Server

```powershell
npm run dev
```

## One-Line Fix (If you have the connection string ready)

```powershell
cd d:\sellit\backend; Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force; $conn = Read-Host "Enter MongoDB connection string"; (Get-Content .env) -replace 'DATABASE_URL=.*', "DATABASE_URL=$conn" -replace 'MONGO_URI=.*', "MONGO_URI=$conn" | Set-Content .env; Remove-Item "node_modules\.prisma\client" -Recurse -Force -ErrorAction SilentlyContinue; npx prisma generate
```

## Common Issues

### Issue: Password has `@` symbol
**Solution:** Replace `@` with `%40` in the connection string

### Issue: User doesn't exist
**Solution:** 
1. Go to MongoDB Atlas → Database Access
2. Create a new database user
3. Copy the new connection string

### Issue: IP not whitelisted
**Solution:**
1. Go to MongoDB Atlas → Network Access
2. Click "Add IP Address"
3. Add `0.0.0.0/0` for all IPs (or your specific IP)

### Issue: File still locked
**Solution:**
1. Close all terminals/editors
2. Restart your computer (if needed)
3. Try again

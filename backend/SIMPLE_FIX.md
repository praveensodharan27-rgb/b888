# Simple Fix for Prisma Client Error

## The Problem
`Error: Cannot find module '@prisma/client'`

This means Prisma Client hasn't been generated yet.

## Quick Fix (Copy & Paste)

Open PowerShell in the `backend` directory and run:

```powershell
cd d:\sellit\backend

# Step 1: Generate Prisma Client
npx prisma generate

# Step 2: Wait a few seconds, then test
Start-Sleep -Seconds 3
node scripts/test-mongodb-connection-full.js
```

## Or Use the Fix Script

```powershell
cd d:\sellit\backend
powershell -ExecutionPolicy Bypass -File fix-and-test-mongodb.ps1
```

## What Should Happen

After `npx prisma generate`, you should see:
```
✔ Generated Prisma Client (5.22.0) to .\node_modules\@prisma\client
```

After the test, you should see:
```
✅ Connected to MongoDB successfully
✅ All Tests Passed!
```

## If It Still Fails

1. **Check if Prisma is installed:**
   ```powershell
   npm list @prisma/client prisma
   ```

2. **Reinstall if needed:**
   ```powershell
   npm install @prisma/client prisma
   npx prisma generate
   ```

3. **Verify schema:**
   ```powershell
   Get-Content prisma\schema.prisma | Select-String "provider"
   ```
   Should show: `provider = "mongodb"`

4. **Check .env file:**
   ```powershell
   Get-Content .env | Select-String "MONGO_URI|DATABASE_URL"
   ```

## Manual Steps (If Scripts Don't Work)

1. **Clear cache:**
   ```powershell
   Remove-Item -Recurse -Force node_modules\.prisma -ErrorAction SilentlyContinue
   ```

2. **Generate Prisma Client:**
   ```powershell
   npx prisma generate
   ```

3. **Verify it exists:**
   ```powershell
   Test-Path node_modules\@prisma\client\index.js
   ```
   Should return: `True`

4. **Test connection:**
   ```powershell
   node scripts/test-mongodb-connection-full.js
   ```

5. **Start server:**
   ```powershell
   npm run dev
   ```

# Quick Fix for MODULE_NOT_FOUND Error

## The Problem
Your server can't find `@prisma/client` because Prisma Client hasn't been generated.

## Quick Fix (Copy & Paste These Commands)

Open PowerShell in the `backend` directory and run:

```powershell
# 1. Clear cache
cd d:\sellit\backend
Remove-Item -Recurse -Force node_modules\.prisma -ErrorAction SilentlyContinue

# 2. Generate Prisma Client
npx prisma generate

# 3. Test it works
node test-prisma-import.js

# 4. Start server
npm run dev
```

## What Should Happen

After `npx prisma generate`, you should see:
```
✔ Generated Prisma Client (5.22.0) to .\node_modules\@prisma\client
```

After `node test-prisma-import.js`, you should see:
```
✅ PrismaClient imported successfully
✅ PrismaClient instance created
✅ Connected to database successfully
✅ All tests passed!
```

## If It Still Fails

1. **Check Prisma is installed:**
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

4. **Check MongoDB connection:**
   ```powershell
   node scripts/check-mongodb-ready.js
   ```

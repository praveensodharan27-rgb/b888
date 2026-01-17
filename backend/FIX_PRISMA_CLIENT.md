# Fix Prisma Client MODULE_NOT_FOUND Error

## Problem
The error `MODULE_NOT_FOUND` for `@prisma/client` means Prisma Client hasn't been generated yet.

## Solution

Run these commands in PowerShell (in the `backend` directory):

### Step 1: Clear Prisma Cache
```powershell
cd d:\sellit\backend
Remove-Item -Recurse -Force node_modules\.prisma -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\@prisma\client -ErrorAction SilentlyContinue
```

### Step 2: Verify Schema is MongoDB
```powershell
# Check that line 10 of prisma/schema.prisma shows:
# provider = "mongodb"
Get-Content prisma\schema.prisma | Select-String -Pattern "provider"
```

### Step 3: Generate Prisma Client
```powershell
npx prisma generate
```

You should see output like:
```
✔ Generated Prisma Client (5.22.0) to .\node_modules\@prisma\client in XXXms
```

### Step 4: Test Import
```powershell
node test-prisma-import.js
```

You should see:
```
Testing Prisma Client import...

1. Attempting to require @prisma/client...
✅ PrismaClient imported successfully

2. Creating PrismaClient instance...
✅ PrismaClient instance created

3. Testing connection...
✅ Connected to database successfully

✅ All tests passed!
```

### Step 5: Start Server
```powershell
npm run dev
```

## Alternative: Use the Fix Script

If the above doesn't work, run:
```powershell
powershell -ExecutionPolicy Bypass -File fix-prisma-client.ps1
```

## Troubleshooting

If `npx prisma generate` fails:
1. Make sure you're in the `backend` directory
2. Check that `prisma/schema.prisma` exists
3. Verify Node.js and npm are installed: `node --version` and `npm --version`
4. Try reinstalling Prisma: `npm install @prisma/client prisma --save`

If the connection test fails:
1. Check your `.env` file has the correct MongoDB URI
2. Run: `node scripts/check-mongodb-ready.js`

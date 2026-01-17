# Fix DATABASE_URL Protocol Error

## ❌ Error Message
```
Error validating datasource `db`: the URL must start with the protocol `mongo`.
```

## 🔍 Problem
The `DATABASE_URL` in your `.env` file is missing the `mongodb://` or `mongodb+srv://` protocol prefix.

## ✅ Solution

### Option 1: Automatic Fix (Recommended)

Run this command in PowerShell:

```powershell
cd d:\sellit\backend
node fix-url-simple.js
npm run prisma:generate
npm run add-dummy-data
```

### Option 2: Manual Fix

1. Open `backend/.env` file in a text editor
2. Find the line starting with `DATABASE_URL=`
3. Make sure it starts with `mongodb://` or `mongodb+srv://`

**Correct format:**
```env
DATABASE_URL="mongodb+srv://b888:password@cluster0.xxxxx.mongodb.net/olx_app?retryWrites=true&w=majority&appName=Cluster0"
```

**Incorrect format (missing protocol):**
```env
DATABASE_URL="b888:password@cluster0.xxxxx.mongodb.net/olx_app"
```

### Option 3: PowerShell Script

```powershell
cd d:\sellit\backend
powershell -ExecutionPolicy Bypass -File .\fix-env-database-url.ps1
```

## ⚠️ Important Note

**DO NOT** try to set environment variables in PowerShell like this:
```powershell
# ❌ WRONG - This is bash syntax, not PowerShell!
DATABASE_URL="mongodb+srv://..."
```

In PowerShell, setting environment variables for the current session uses:
```powershell
# ✅ Correct for current session only
$env:DATABASE_URL = "mongodb+srv://..."
```

But to **permanently** fix it, you must edit the `.env` file directly (which the scripts do automatically).

## 📋 After Fixing

1. **Regenerate Prisma Client:**
   ```powershell
   npm run prisma:generate
   ```

2. **Test Connection:**
   ```powershell
   npm run test-mongodb
   ```

3. **Add Dummy Data:**
   ```powershell
   npm run add-dummy-data
   ```

## 🔧 Troubleshooting

If you still get errors:

1. **Check .env file exists:**
   ```powershell
   Test-Path .env
   ```

2. **View DATABASE_URL (first 50 chars):**
   ```powershell
   (Get-Content .env | Select-String "DATABASE_URL").Line.Substring(0, 50)
   ```

3. **Verify protocol:**
   ```powershell
   $url = (Get-Content .env | Select-String "DATABASE_URL").Line -replace 'DATABASE_URL="?([^"]+)"?', '$1'
   if ($url -match "^mongodb(\+srv)?://") { Write-Host "✅ Correct" } else { Write-Host "❌ Missing protocol" }
   ```

## 📝 Example .env File

```env
# Database
DATABASE_URL="mongodb+srv://b888:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/olx_app?retryWrites=true&w=majority&appName=Cluster0"
MONGO_URI="mongodb+srv://b888:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/olx_app?retryWrites=true&w=majority&appName=Cluster0"

# Other variables...
NODE_ENV=development
PORT=5000
```

Make sure to replace `YOUR_PASSWORD` with your actual MongoDB password!

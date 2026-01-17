# Create Admin User Guide

## Quick Create (Default Credentials)

Run this command:

```powershell
cd d:\sellit\backend
npm run create-admin
```

**Default Admin Credentials:**
- Email: `admin@sellit.com`
- Password: `admin123`
- Name: `Admin User`

## Custom Admin Credentials

### Option 1: Using Environment Variables

Edit `backend/.env` and add:

```env
ADMIN_EMAIL=your-admin@email.com
ADMIN_PASSWORD=your-secure-password
ADMIN_NAME=Your Admin Name
ADMIN_PHONE=+1234567890
```

Then run:
```powershell
npm run create-admin
```

### Option 2: Using Interactive Script

```powershell
cd d:\sellit\backend
node scripts/create-admin-interactive.js
```

This will prompt you for:
- Admin name
- Admin email
- Admin phone (optional)
- Admin password

### Option 3: Direct Script

```powershell
cd d:\sellit\backend
node create-admin-simple.js
```

## Prerequisites

Before creating admin user:

1. **MongoDB Connection Must Work**
   ```powershell
   # Test connection first
   node -e "require('dotenv').config(); const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.\$connect().then(() => console.log('✅ Connected')).catch(e => console.error('❌', e.message));"
   ```

2. **If Connection Fails:**
   - Fix MongoDB authentication: `powershell -ExecutionPolicy Bypass -File .\update-mongodb-password.ps1`
   - Regenerate Prisma Client: `npm run prisma:generate`

## What the Script Does

1. ✅ Tests MongoDB connection
2. ✅ Checks if admin already exists
3. ✅ Creates admin user with ADMIN role
4. ✅ Sets user as verified
5. ✅ Creates wallet for admin
6. ✅ Generates referral code
7. ✅ Shows admin credentials

## Login After Creation

### Via Frontend
- Go to: http://localhost:3000/admin
- Login with admin credentials

### Via API
```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "admin@sellit.com",
  "password": "admin123"
}
```

## Check Existing Admin

```powershell
npm run check-admin
```

This will show:
- If admin exists
- Admin email
- Admin ID
- Admin role

## Update Admin Password

If admin already exists, running `npm run create-admin` will update the password if you've changed `ADMIN_PASSWORD` in `.env`.

## Troubleshooting

### Error: "authentication failed"
**Solution:** Fix MongoDB password first
```powershell
powershell -ExecutionPolicy Bypass -File .\update-mongodb-password.ps1
```

### Error: "Cannot connect to MongoDB"
**Solution:** 
1. Check MongoDB Atlas cluster is running
2. Verify connection string in `.env`
3. Check IP whitelist in MongoDB Atlas

### Error: "Admin already exists"
**Solution:** 
- The script will show existing admin details
- To update password, change `ADMIN_PASSWORD` in `.env` and run again

## Security Notes

⚠️ **Important:**
- Change default password in production
- Use strong passwords
- Don't commit `.env` file to git
- Rotate admin passwords regularly

## Example: Create Admin with Custom Credentials

```powershell
# Set environment variables
$env:ADMIN_EMAIL="myadmin@example.com"
$env:ADMIN_PASSWORD="MySecurePassword123!"
$env:ADMIN_NAME="My Admin"

# Create admin
npm run create-admin
```

Or add to `.env`:
```env
ADMIN_EMAIL=myadmin@example.com
ADMIN_PASSWORD=MySecurePassword123!
ADMIN_NAME=My Admin
```

Then run:
```powershell
npm run create-admin
```

# MongoDB Connection Update

## ✅ What Was Updated

All MongoDB connection configurations have been centralized and updated across the project.

### 1. Centralized Connection Utility
Created `backend/src/config/mongodb.js` - A centralized MongoDB connection manager with:
- Singleton Prisma Client instance
- Connection/disconnection helpers
- Connection testing utilities
- Connection info getter

### 2. Updated Files
- ✅ `backend/src/config/env.js` - Added default MongoDB URI
- ✅ `backend/scripts/fix-mongodb-connection.js` - Updated connection string
- ✅ `backend/scripts/setup-mongodb.js` - Updated connection string
- ✅ `backend/scripts/complete-db-setup.js` - Updated connection string
- ✅ `backend/FINAL_MONGODB_FIX.ps1` - Updated connection string
- ✅ `backend/update-env-mongodb.ps1` - Updated connection string

### 3. New Scripts
- ✅ `backend/scripts/update-mongodb-connection.js` - Updates all connection strings
- ✅ `backend/scripts/test-mongodb-connection-full.js` - Comprehensive connection test

### 4. New NPM Scripts
```json
"update-mongodb": "node scripts/update-mongodb-connection.js",
"test-mongodb": "node scripts/test-mongodb-connection-full.js"
```

## 🔧 Current MongoDB Connection

```
mongodb+srv://b888:Ponkunnam4433!@cluster0.zfcaepv.mongodb.net/olx_app?retryWrites=true&w=majority&appName=Cluster0
```

**Database:** `olx_app`  
**Cluster:** `cluster0.zfcaepv.mongodb.net`

## 📋 Usage

### Update Connection String
If you need to update the MongoDB connection string everywhere:
```bash
npm run update-mongodb
```

### Test Connection
Run comprehensive connection test:
```bash
npm run test-mongodb
```

### Use Centralized Connection (Optional)
In your code, you can now use:
```javascript
const { getPrismaClient, connectMongoDB, disconnectMongoDB } = require('./src/config/mongodb');

// Get Prisma Client
const prisma = getPrismaClient();

// Or connect explicitly
await connectMongoDB();

// Disconnect when done
await disconnectMongoDB();
```

## 🚀 Quick Start

1. **Update all connection strings:**
   ```bash
   npm run update-mongodb
   ```

2. **Update .env file:**
   ```bash
   node scripts/fix-mongodb-connection.js
   ```

3. **Generate Prisma Client:**
   ```bash
   npm run prisma:generate
   ```

4. **Test connection:**
   ```bash
   npm run test-mongodb
   ```

5. **Start server:**
   ```bash
   npm run dev
   ```

## 📝 Files Structure

```
backend/
├── src/
│   └── config/
│       ├── env.js          # Environment config (updated)
│       └── mongodb.js      # NEW: Centralized MongoDB connection
├── scripts/
│   ├── update-mongodb-connection.js      # NEW: Update all connections
│   ├── test-mongodb-connection-full.js  # NEW: Comprehensive test
│   ├── fix-mongodb-connection.js         # Updated
│   ├── setup-mongodb.js                  # Updated
│   └── complete-db-setup.js              # Updated
└── package.json                          # Updated with new scripts
```

## 🔍 Verification

Run these commands to verify everything is working:

```bash
# 1. Check environment
node -e "require('dotenv').config(); console.log(process.env.MONGO_URI || process.env.DATABASE_URL)"

# 2. Check schema
Get-Content prisma\schema.prisma | Select-String "provider"

# 3. Test connection
npm run test-mongodb

# 4. Check Prisma Client
node -e "const {PrismaClient} = require('@prisma/client'); console.log('OK')"
```

## ⚠️ Important Notes

1. **Connection String Security:** Never commit `.env` files with real credentials
2. **IP Whitelist:** Make sure your IP is whitelisted in MongoDB Atlas
3. **Network Access:** Ensure network access is configured in MongoDB Atlas
4. **Prisma Client:** Always run `npm run prisma:generate` after schema changes

## 🐛 Troubleshooting

### Connection Refused
- Check MongoDB Atlas IP whitelist
- Verify connection string credentials
- Check network/firewall settings

### Prisma Client Errors
- Run: `npm run prisma:generate`
- Clear cache: `Remove-Item -Recurse -Force node_modules\.prisma`
- Verify schema: `Get-Content prisma\schema.prisma | Select-String "mongodb"`

### Module Not Found
- Run: `npm install`
- Run: `npm run prisma:generate`
- Check: `Test-Path node_modules\@prisma\client`

## 📚 Related Documentation

- `MONGODB_MIGRATION_GUIDE.md` - Full migration guide
- `MIGRATION_QUICK_START.md` - Quick start guide
- `DATABASE_SETUP_GUIDE.md` - Database setup instructions

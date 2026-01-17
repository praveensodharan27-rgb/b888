# Payment Gateway Error Fix

## Issue
Error: "can't access property 'call', originalFactory is undefined"

## Root Cause
Multiple PrismaClient instances were being created inside route handler functions, causing Prisma initialization conflicts.

## Solution Applied

### 1. Fixed Prisma Client Instantiation
Changed from creating multiple instances inside functions to a single shared instance at the top of the routes file:

**Before:**
```javascript
// Inside each route handler
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
```

**After:**
```javascript
// At the top of the file
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Use the shared instance in all handlers
```

### 2. Files Updated
- ✅ `backend/routes/payment-gateway.js` - Fixed all PrismaClient instantiations

### 3. Prisma Client Generation
Make sure Prisma Client is generated with the PaymentOrder model:

```bash
cd backend
npm run prisma:generate
```

## Testing

After fixing, test the endpoints:

```bash
# Check status
curl http://localhost:5000/api/payment-gateway/status

# Create order (with auth token)
curl -X POST http://localhost:5000/api/payment-gateway/order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount": 100.50}'
```

## If Error Persists

1. **Regenerate Prisma Client:**
   ```bash
   cd backend
   npm run prisma:generate
   ```

2. **Restart Server:**
   ```bash
   npm run dev
   ```

3. **Check Prisma Schema:**
   - Ensure `PaymentOrder` model exists in `backend/prisma/schema.prisma`
   - Run `npx prisma validate` to check schema

4. **Clear Node Modules (if needed):**
   ```bash
   rm -rf node_modules/.prisma
   npm run prisma:generate
   ```

## Status
✅ Fixed - Single PrismaClient instance now used throughout the routes file


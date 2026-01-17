# Fix MongoDB Atlas Connection (P2010 Error)

## Error: Prisma P2010 - Server Selection Timeout

This error occurs when Prisma cannot connect to MongoDB Atlas. The issue is **NOT with Prisma queries** - it's a **MongoDB Atlas connectivity problem**.

## Common Causes

1. **IP Address Not Whitelisted** ⚠️ Most Common
2. **Cluster is Paused/Stopped**
3. **TLS/SSL Handshake Failure**
4. **Incorrect DATABASE_URL**
5. **Network/Firewall Blocking Connection**

## Step-by-Step Fix

### Step 1: Check MongoDB Atlas Cluster Status

1. Go to https://cloud.mongodb.com
2. Navigate to **Clusters** → Select your cluster
3. Verify status shows **"Running"** (not "Paused" or "Stopped")
4. If paused, click **"Resume"** or **"Unpause"**

### Step 2: Whitelist Your IP Address

1. In MongoDB Atlas Dashboard → **Network Access**
2. Click **"Add IP Address"**
3. Choose one:
   - **Option A**: Add your current IP (click "Add Current IP Address")
   - **Option B**: Allow all IPs for development: `0.0.0.0/0` (⚠️ Less secure)
4. Click **"Confirm"**
5. Wait 1-2 minutes for changes to propagate

### Step 3: Verify DATABASE_URL Format

Your `.env` file should have:

```env
DATABASE_URL=mongodb+srv://b888:YOUR_PASSWORD@cluster0.cj9oi8t.mongodb.net/olx_app?retryWrites=true&w=majority&appName=SellIt
```

**Important:**
- Replace `YOUR_PASSWORD` with actual password
- URL-encode special characters in password:
  - `@` → `%40`
  - `#` → `%23`
  - `$` → `%24`
  - `%` → `%25`
  - `&` → `%26`
  - `+` → `%2B`
  - `=` → `%3D`

### Step 4: Test Connection

Run the diagnostic script:

```bash
cd backend
node diagnose-mongodb.js
```

Or test with Prisma:

```bash
cd backend
node test-mongodb-connection.js
```

### Step 5: Check TLS/SSL Configuration

If TLS errors persist:

1. **Verify Connection String includes TLS:**
   - `mongodb+srv://` automatically uses TLS
   - Don't use `mongodb://` (non-TLS) with Atlas

2. **Check MongoDB Atlas → Security → Network Access:**
   - Ensure "Require IP Whitelist" is enabled
   - Your IP must be in the whitelist

3. **Try adding TLS parameters to connection string:**
   ```
   ?retryWrites=true&w=majority&tls=true&ssl=true
   ```

### Step 6: Restart Your Server

After making changes:

```bash
# Stop the server (Ctrl+C)
# Then restart:
cd backend
npm run dev
```

## Quick Fix Checklist

- [ ] MongoDB Atlas cluster is **Running** (not paused)
- [ ] Your IP address is **whitelisted** in Network Access
- [ ] DATABASE_URL is correct in `.env` file
- [ ] Password is URL-encoded if it has special characters
- [ ] Connection string uses `mongodb+srv://` (not `mongodb://`)
- [ ] Server restarted after changes

## Verify Fix

Once fixed, you should see:
- ✅ No more P2010 errors
- ✅ Database queries work
- ✅ Premium settings load from database
- ✅ All API endpoints respond correctly

## Still Having Issues?

1. **Check MongoDB Atlas Status:** https://status.mongodb.com/
2. **Verify Database User:** Atlas → Database Access → User `b888` exists
3. **Check Connection String:** Get fresh connection string from Atlas → Connect → Drivers
4. **Contact MongoDB Support:** If cluster is healthy but still can't connect

## Your Current Connection Details

- **Username:** b888
- **Host:** cluster0.cj9oi8t.mongodb.net
- **Database:** olx_app
- **Protocol:** mongodb+srv (TLS enabled)

**Most likely issue:** IP address not whitelisted in MongoDB Atlas Network Access.






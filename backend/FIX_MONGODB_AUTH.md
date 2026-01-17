# Fix MongoDB Authentication Error

## Error Message
```
ConnectorError: SCRAM failure: bad auth : authentication failed
```

This means your MongoDB username/password is incorrect.

## Quick Fix

### Option 1: Use the Automated Script (Recommended)

```powershell
cd d:\sellit\backend
powershell -ExecutionPolicy Bypass -File .\fix-mongodb-auth.ps1
```

### Option 2: Manual Fix

#### Step 1: Get Your MongoDB Connection String

**For MongoDB Atlas (Cloud):**
1. Go to https://cloud.mongodb.com
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your actual password

**For Local MongoDB:**
```
mongodb://localhost:27017/sellit
```

Or with authentication:
```
mongodb://username:password@localhost:27017/sellit
```

#### Step 2: Update .env File

Edit `backend/.env` and update:

```env
DATABASE_URL="mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/database?retryWrites=true&w=majority"
MONGO_URI="mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/database?retryWrites=true&w=majority"
```

**Important:** 
- Replace `USERNAME` with your MongoDB username
- Replace `PASSWORD` with your MongoDB password (URL-encode special characters)
- Replace `cluster.mongodb.net` with your actual cluster URL
- Replace `database` with your database name

#### Step 3: URL-Encode Special Characters in Password

If your password has special characters, encode them:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `=` → `%3D`
- `?` → `%3F`
- `/` → `%2F`
- `!` → `%21`

Example:
- Password: `P@ssw0rd!`
- Encoded: `P%40ssw0rd%21`

#### Step 4: Regenerate Prisma Client

```powershell
cd d:\sellit\backend
npx prisma generate
```

#### Step 5: Test Connection

```powershell
node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.\$connect().then(() => { console.log('✅ Connected to MongoDB!'); process.exit(0); }).catch(e => { console.error('❌ Connection failed:', e.message); process.exit(1); });"
```

#### Step 6: Restart Server

```powershell
npm run dev
```

## Common Issues

### Issue: Password has special characters
**Solution:** URL-encode the password in the connection string

### Issue: User doesn't exist in MongoDB
**Solution:** 
1. Go to MongoDB Atlas → Database Access
2. Create a new database user
3. Set username and password
4. Update connection string

### Issue: IP address not whitelisted (MongoDB Atlas)
**Solution:**
1. Go to MongoDB Atlas → Network Access
2. Click "Add IP Address"
3. Add `0.0.0.0/0` for all IPs (or your specific IP)

### Issue: Database doesn't exist
**Solution:** MongoDB will create the database automatically on first connection

## Test Your Connection String

You can test your connection string directly:

```powershell
# Using MongoDB Compass or mongo shell
mongosh "your_connection_string"

# Or using Node.js
node -e "require('mongodb').MongoClient.connect('your_connection_string').then(() => console.log('✅ Connected')).catch(e => console.error('❌', e))"
```

## Reset MongoDB Password

If you need to reset your MongoDB Atlas password:

1. Go to MongoDB Atlas → Database Access
2. Click on your user
3. Click "Edit"
4. Set a new password
5. Update your `.env` file with the new password

## Example .env File

```env
# MongoDB Connection
DATABASE_URL="mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/sellit?retryWrites=true&w=majority&appName=Cluster0"
MONGO_URI="mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/sellit?retryWrites=true&w=majority&appName=Cluster0"

# Other environment variables...
NODE_ENV=development
PORT=5000
JWT_SECRET=your-secret-key
```

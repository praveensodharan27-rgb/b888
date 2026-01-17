# Quick Start: Enable Dummy Ads

## Step 1: Create/Update .env file

Create or update `backend/.env` file and add:

```env
USE_DUMMY_DATA=true
DUMMY_ADS_INTERVAL_SECONDS=30
```

## Step 2: Restart Server

```bash
cd backend
npm run dev
```

## Step 3: Check Console Logs

You should see:
- `✅ Real-time dummy ads generation started (every 30 seconds)`
- `🔧 Dummy mode enabled, injecting dummy ads...`
- `📦 Generating X dummy ads...`

## Step 4: Test

1. Open browser to `http://localhost:3000`
2. Check browser console for Socket.IO connection
3. Check backend console for dummy ads generation logs
4. New ads should appear every 30 seconds

## Troubleshooting

### If dummy ads not showing:

1. **Check .env file exists:**
   ```bash
   cat backend/.env | grep USE_DUMMY_DATA
   ```

2. **Check server logs:**
   - Look for "Dummy mode enabled" messages
   - Look for error messages

3. **Check database:**
   - Ensure categories exist
   - Ensure Prisma schema is updated

4. **Check Socket.IO:**
   - Frontend should show "✅ Socket.IO connected"
   - Backend should show "User connected"

### Common Issues:

- **No .env file**: Create `backend/.env` with `USE_DUMMY_DATA=true`
- **Server not restarted**: Restart after adding env variable
- **Database errors**: Run `npm run prisma:generate`
- **No categories**: Ensure categories are seeded in database









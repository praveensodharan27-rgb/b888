# Database Migration Instructions

## ⚠️ IMPORTANT: Follow These Steps Carefully

The Prisma migration needs to run while the server is **completely stopped** to avoid file locking issues.

### Step-by-Step Instructions

#### 1. Stop the Backend Server

If your server is running in a terminal, press `Ctrl+C` to stop it.

```powershell
# In the terminal running the server, press Ctrl+C
# Wait for "Server stopped" or similar message
```

#### 2. Navigate to Backend Directory

```powershell
cd D:\sellit\backend
```

#### 3. Run the Migration

```powershell
npx prisma migrate dev --name add_search_alerts
```

**Expected Output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "sellit"

Applying migration `20241203_add_search_alerts`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20241203_add_search_alerts/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client (5.7.1) to .\node_modules\@prisma\client
```

#### 4. Generate Prisma Client

```powershell
npx prisma generate
```

**Expected Output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client (5.7.1) to .\node_modules\@prisma\client
```

#### 5. Initialize Default Settings

```powershell
npm run init-search-alerts
```

**Expected Output:**
```
🔧 Initializing search alert settings...
✅ Search alert settings created successfully
Settings: {
  "id": "...",
  "enabled": true,
  "maxEmailsPerUser": 5,
  ...
}

📝 Available template variables:
   - {{query}} - The search query
   - {{products}} - HTML list of matching products
   - {{count}} - Number of matching products

✅ Initialization complete
```

#### 6. Verify SMTP Configuration

Check your `.env` file contains:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FRONTEND_URL=http://localhost:3000
```

#### 7. Start the Server

```powershell
npm run dev
```

**Look for these log messages:**
```
Server running on port 5000
✅ Cron jobs scheduled:
   - Delete deactivated accounts: Daily at 2 AM
   - Process search alerts: Every hour
   - Initial search alerts check: 30 seconds after startup
```

After 30 seconds, you should see:
```
⏰ Running initial search alerts check on startup...
🔍 Starting search alerts processing...
📊 Found 0 unprocessed search queries
✅ Search alerts processing complete: 0 emails sent, 0 queries processed
```

## Troubleshooting

### Error: "migration failed to apply cleanly"

**Solution:**
```powershell
# Stop the server
# Then run:
npx prisma migrate reset
npx prisma migrate dev
```

### Error: "EPERM: operation not permitted"

**Cause:** Server is still running or file is locked

**Solution:**
1. Make sure server is completely stopped
2. Close any database management tools (Prisma Studio, etc.)
3. Wait 10 seconds
4. Try again

### Error: "Can't reach database server"

**Solution:**
1. Make sure PostgreSQL is running
2. Check DATABASE_URL in `.env`
3. Test connection: `npm run check-db`

### Migration Succeeded but No Tables Created

**Solution:**
```powershell
# Check Prisma Studio
npx prisma studio

# Or query directly
psql -U your_user -d sellit -c "\dt"
```

You should see:
- `SearchQuery` table
- `search_alert_settings` table

## Verification Steps

### 1. Check Database Tables

```sql
-- Connect to your database
psql -U your_user -d sellit

-- List tables
\dt

-- Check SearchQuery table structure
\d "SearchQuery"

-- Check search_alert_settings table structure
\d search_alert_settings

-- Verify settings
SELECT * FROM search_alert_settings;
```

### 2. Test API Endpoints

```bash
# Get settings (requires admin token)
curl http://localhost:5000/api/search-alerts/settings \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get statistics
curl http://localhost:5000/api/search-alerts/statistics \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 3. Test Search Query Capture

1. Login as a user with email
2. Perform a search: http://localhost:3000/search?q=test
3. Check database:
   ```sql
   SELECT * FROM "SearchQuery" ORDER BY "createdAt" DESC LIMIT 5;
   ```

### 4. Test Email Sending

```bash
curl -X POST http://localhost:5000/api/search-alerts/test-email \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","testQuery":"iPhone"}'
```

## What Was Added to the Database?

### SearchQuery Table
- `id` (String, Primary Key)
- `query` (String) - The search query text
- `userId` (String, Optional) - User who searched
- `userEmail` (String, Optional) - User's email for alerts
- `category` (String, Optional) - Category filter
- `location` (String, Optional) - Location filter
- `filters` (JSON, Optional) - Additional filters
- `processed` (Boolean) - Whether alert was sent
- `createdAt` (DateTime) - When query was made

### search_alert_settings Table
- `id` (String, Primary Key)
- `enabled` (Boolean) - Enable/disable system
- `maxEmailsPerUser` (Int) - Email limit per user
- `checkIntervalHours` (Int) - Processing interval
- `emailSubject` (String) - Email subject template
- `emailBody` (String) - Email body template
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

## Next Steps

After successful migration:

1. **Configure Admin Panel** - Add the search alerts admin page to your frontend
2. **Test Thoroughly** - Send test emails, verify query capture
3. **Monitor Logs** - Watch for cron job execution
4. **Customize Templates** - Edit email templates via admin panel
5. **Set User Limits** - Adjust `maxEmailsPerUser` as needed

## Support

If you encounter issues:

1. Check logs: Server console, Prisma output
2. Verify PostgreSQL is running: `psql --version`
3. Test database connection: `npm run check-db`
4. Review documentation: `SEARCH_ALERTS_SETUP.md`

## Rollback (If Needed)

If you need to undo the migration:

```powershell
npx prisma migrate dev --name remove_search_alerts

# Then manually drop tables in psql:
DROP TABLE IF EXISTS "SearchQuery" CASCADE;
DROP TABLE IF EXISTS "search_alert_settings" CASCADE;
```

**Note:** This will delete all search query data. Backup first if needed!

---

✅ Once migration is complete, the Search Alerts system will be fully operational!


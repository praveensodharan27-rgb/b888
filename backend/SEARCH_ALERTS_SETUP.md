# Search Alerts System - Setup & Documentation

## Overview

The Search Alerts system automatically captures user search queries and sends email notifications when new products matching those searches are posted. This feature enhances user engagement by keeping them informed about products they're interested in.

## Architecture

### Components

1. **Prisma Models** (`prisma/schema.prisma`)
   - `SearchQuery`: Stores user search queries with filters
   - `SearchAlertSettings`: Admin-configurable settings for the alert system

2. **Service Layer** (`services/searchAlerts.js`)
   - Search query processing
   - Product matching logic
   - Email generation and sending
   - Settings management

3. **API Routes** (`routes/search-alerts.js`)
   - Admin endpoints for managing settings
   - Statistics and analytics
   - Test email functionality

4. **Cron Jobs** (`utils/cron.js`)
   - Scheduled processing of search alerts (hourly)
   - Automatic cleanup of old queries

5. **Search Integration** (`routes/search.js`)
   - Captures user search queries automatically
   - Non-blocking query storage

## Installation & Setup

### Step 1: Database Migration

The server must be stopped before running migrations to avoid file locking issues.

```powershell
# Stop the server first
# Then run:
cd backend
npx prisma migrate dev --name add_search_alerts
npx prisma generate
```

### Step 2: Initialize Default Settings

```powershell
npm run init-search-alerts
```

This creates the default SearchAlertSettings configuration in the database.

### Step 3: Configure SMTP (Required for Email Sending)

Add these environment variables to your `.env` file:

```env
# SMTP Configuration (required for search alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend URL for email links
FRONTEND_URL=http://localhost:3000
```

**Gmail Setup:**
1. Enable 2-factor authentication
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the App Password as `SMTP_PASS`

### Step 4: Start the Server

```powershell
npm run dev
```

The system will automatically:
- Initialize cron jobs
- Process search alerts every hour
- Run an initial check 30 seconds after startup

## Features

### 1. Automatic Query Capture
- Captures all search queries from authenticated users with email addresses
- Stores query text, filters, and user information
- Non-blocking operation - doesn't slow down search

### 2. Scheduled Processing
- Runs hourly to check for new matching products
- Processes unprocessed queries within the configured time window
- Respects per-user email limits

### 3. Admin Configuration Panel

#### Available Settings:
- **Enabled**: Turn alerts on/off globally
- **Max Emails Per User**: Limit alerts per user per check (default: 5)
- **Check Interval Hours**: How often to process alerts (default: 24)
- **Email Subject**: Customizable subject line
- **Email Body**: HTML template with placeholders

#### Template Variables:
- `{{query}}` - The user's search query
- `{{products}}` - Formatted product list (HTML)
- `{{count}}` - Number of products found

### 4. Smart Product Matching
- Matches title and description against query
- Respects original search filters (category, location, price)
- Only includes approved, non-expired products
- Focuses on products posted in last 24 hours
- Limits to 10 products per alert

### 5. Beautiful Email Templates
- Responsive HTML design
- Product images and details
- Direct links to products
- Branded SellIt styling

## API Endpoints

### Admin Routes (Require Admin Authentication)

#### Get Settings
```http
GET /api/search-alerts/settings
Authorization: Bearer <admin-token>
```

#### Update Settings
```http
PUT /api/search-alerts/settings
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "enabled": true,
  "maxEmailsPerUser": 5,
  "checkIntervalHours": 24,
  "emailSubject": "New products for you!",
  "emailBody": "<p>Custom template...</p>"
}
```

#### Get Statistics
```http
GET /api/search-alerts/statistics
Authorization: Bearer <admin-token>
```

Returns:
- Total queries
- Processed vs pending queries
- Unique users
- Queries in last 7 days
- Top 10 searched queries

#### Get Recent Queries
```http
GET /api/search-alerts/queries?page=1&limit=20&processed=false
Authorization: Bearer <admin-token>
```

#### Cleanup Old Queries
```http
DELETE /api/search-alerts/queries/cleanup?days=30
Authorization: Bearer <admin-token>
```

Deletes processed queries older than specified days.

#### Test Email
```http
POST /api/search-alerts/test-email
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "email": "test@example.com",
  "testQuery": "iPhone 13"
}
```

## Cron Schedule

The system runs on the following schedule:

1. **Search Alerts Processing**: Every hour (`0 * * * *`)
2. **Initial Check**: 30 seconds after server startup
3. **Account Deletion**: Daily at 2 AM (`0 2 * * *`)

## Troubleshooting

### Emails Not Sending

1. **Check SMTP Configuration**
   ```javascript
   // The console will show:
   📧 Checking SMTP configuration...
      SMTP_HOST: ✅ Set
      SMTP_USER: ✅ Set
      SMTP_PASS: ✅ Set (hidden)
   ```

2. **Test Email Sending**
   Use the test email endpoint to verify SMTP works

3. **Check Logs**
   Look for error messages in server console

### No Alerts Being Sent

1. **Verify Settings Are Enabled**
   ```http
   GET /api/search-alerts/settings
   ```
   Ensure `enabled: true`

2. **Check for Pending Queries**
   ```http
   GET /api/search-alerts/statistics
   ```
   Look at `pendingQueries` count

3. **Check Cron Job Status**
   Server logs should show:
   ```
   ✅ Cron jobs scheduled:
      - Process search alerts: Every hour
   ```

4. **Manual Trigger**
   You can manually trigger processing by restarting the server (runs after 30 seconds)

### Migration Issues

If Prisma migration fails:

1. **Stop the Server**
   ```powershell
   # Press Ctrl+C in server terminal
   ```

2. **Check Database Connection**
   ```powershell
   npm run check-db
   ```

3. **Reset and Migrate**
   ```powershell
   npx prisma migrate reset
   npx prisma migrate dev
   ```

## Performance Considerations

### Query Storage
- Queries are stored asynchronously
- Doesn't impact search response time
- Automatically cleaned up after processing

### Email Sending
- Runs in background (cron job)
- Rate limited per user
- Graceful error handling

### Database Indexes
The schema includes optimized indexes:
- `userId` - Fast user query lookups
- `userEmail` - Email-based filtering
- `processed` - Quick pending query selection
- `createdAt` - Time-based filtering

## Security

### Authentication
- Admin routes require admin role
- User searches require authentication
- Email addresses validated

### Data Privacy
- Only captures queries from authenticated users
- Users can be excluded by not providing email
- Queries can be cleaned up regularly

### Rate Limiting
- Per-user email limits prevent spam
- Configurable check intervals
- Failed emails logged, not retried indefinitely

## Maintenance

### Regular Tasks

1. **Cleanup Old Queries** (Recommended: Monthly)
   ```http
   DELETE /api/search-alerts/queries/cleanup?days=30
   ```

2. **Monitor Statistics** (Recommended: Weekly)
   ```http
   GET /api/search-alerts/statistics
   ```

3. **Review Top Queries** (For business insights)
   Check statistics to see what users search for most

### Database Maintenance

```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename IN ('SearchQuery', 'search_alert_settings')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Customization

### Email Template Customization

Edit via admin panel or directly in database:

```javascript
// Example custom template
const customTemplate = `
  <div style="background: #f9f9f9; padding: 20px;">
    <h2>Hey! We found {{count}} products for "{{query}}"</h2>
    {{products}}
    <p>Check back regularly for more deals!</p>
  </div>
`;

// Update via API
PUT /api/search-alerts/settings
{
  "emailBody": customTemplate
}
```

### Cron Schedule Customization

Edit `utils/cron.js`:

```javascript
// Run every 30 minutes instead of hourly
cron.schedule('*/30 * * * *', async () => {
  await processSearchAlerts();
});

// Run every 6 hours
cron.schedule('0 */6 * * *', async () => {
  await processSearchAlerts();
});
```

### Product Matching Logic

Edit `services/searchAlerts.js` → `findMatchingProducts()`:

```javascript
// Example: Include products from last 48 hours instead of 24
whereClause.createdAt = {
  gte: new Date(Date.now() - 48 * 60 * 60 * 1000)
};

// Example: Increase product limit to 20
take: 20
```

## Integration with Frontend

### Admin Panel Integration

Create an admin page in Next.js:

```typescript
// pages/admin/search-alerts.tsx
import { useState, useEffect } from 'react';

export default function SearchAlertsAdmin() {
  const [settings, setSettings] = useState(null);
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    // Fetch settings
    fetch('/api/search-alerts/settings', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setSettings(data.settings));

    // Fetch statistics
    fetch('/api/search-alerts/statistics', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setStatistics(data.statistics));
  }, []);

  // Render settings form and statistics
}
```

## Best Practices

1. **Email Limits**: Keep `maxEmailsPerUser` reasonable (5-10) to avoid spam
2. **Check Interval**: 24 hours is recommended; hourly checks are frequent enough
3. **Cleanup**: Run cleanup monthly to keep database lean
4. **Monitoring**: Regularly check statistics for insights
5. **Testing**: Use test email endpoint before enabling for users
6. **SMTP**: Use a reliable SMTP service (Gmail, SendGrid, AWS SES)

## Future Enhancements

Potential features to add:

1. **User Preferences**: Allow users to opt-in/out of alerts
2. **Alert Frequency**: Per-user alert frequency settings
3. **Category-Specific Alerts**: Subscribe to specific categories
4. **Price Drop Alerts**: Notify when prices decrease
5. **Digest Emails**: Combine multiple alerts into daily digest
6. **Push Notifications**: Add push notification support
7. **Advanced Matching**: Use ML for better product matching
8. **Analytics Dashboard**: Detailed admin analytics UI

## Support

For issues or questions:
1. Check server logs for error messages
2. Verify SMTP configuration
3. Test with test email endpoint
4. Review this documentation

## Version History

- **v1.0.0** (2024-12-03): Initial release
  - Basic search query capture
  - Hourly cron processing
  - Admin configuration panel
  - Email template system
  - Statistics and analytics


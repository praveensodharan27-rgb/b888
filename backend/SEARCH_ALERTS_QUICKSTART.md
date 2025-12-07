# Search Alerts - Quick Start Guide

## 🚀 Setup in 3 Steps

### Step 1: Run Database Migration

**⚠️ Important: Stop the server first!**

```powershell
cd D:\sellit\backend
npx prisma migrate dev --name add_search_alerts
npx prisma generate
```

### Step 2: Initialize Settings

```powershell
npm run init-search-alerts
```

### Step 3: Configure SMTP in `.env`

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FRONTEND_URL=http://localhost:3000
```

**Gmail App Password Setup:**
1. Go to https://myaccount.google.com/apppasswords
2. Enable 2FA if not already enabled
3. Generate new App Password
4. Copy to `SMTP_PASS`

### Step 4: Start Server

```powershell
npm run dev
```

Done! 🎉

## 📊 How It Works

1. **User searches** → Query saved automatically (if logged in with email)
2. **Cron job runs** hourly → Checks for new matching products
3. **Email sent** → User gets alert with matching products
4. **Admin controls** → Manage via `/api/search-alerts/settings`

## 🔧 Admin API Endpoints

### Get Settings
```bash
GET /api/search-alerts/settings
Authorization: Bearer <admin-token>
```

### Update Settings
```bash
PUT /api/search-alerts/settings
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "enabled": true,
  "maxEmailsPerUser": 5,
  "checkIntervalHours": 24,
  "emailSubject": "New products matching your search!",
  "emailBody": "<p>Hi! Found products for: <strong>{{query}}</strong></p>{{products}}"
}
```

### Get Statistics
```bash
GET /api/search-alerts/statistics
Authorization: Bearer <admin-token>
```

### Test Email
```bash
POST /api/search-alerts/test-email
Authorization: Bearer <admin-token>

{
  "email": "test@example.com",
  "testQuery": "iPhone"
}
```

## 🎨 Email Template Variables

- `{{query}}` - User's search query
- `{{products}}` - HTML formatted product list
- `{{count}}` - Number of products found

## ⏰ Cron Schedule

- **Every hour**: Process search alerts
- **30 seconds after startup**: Initial check
- **Daily at 2 AM**: Cleanup tasks

## 🧪 Testing

1. **Test SMTP configuration:**
   ```bash
   POST /api/search-alerts/test-email
   {
     "email": "your-email@example.com",
     "testQuery": "test"
   }
   ```

2. **Create test search:**
   - Login as user with email
   - Perform a search
   - Check database: `SELECT * FROM "SearchQuery";`

3. **Manual trigger:**
   - Restart server (runs check after 30 seconds)

## 🐛 Troubleshooting

### Emails not sending?
- Check SMTP credentials in `.env`
- Look for SMTP logs in console
- Test with test email endpoint

### No queries being saved?
- User must be logged in
- User must have email address
- Check console for errors

### Migration failed?
- Stop the server completely
- Delete `node_modules/.prisma` folder
- Run migration again

## 📚 Full Documentation

See [SEARCH_ALERTS_SETUP.md](./SEARCH_ALERTS_SETUP.md) for complete documentation.

## 🎯 Feature Highlights

✅ Automatic query capture  
✅ Smart product matching  
✅ Beautiful email templates  
✅ Admin configuration panel  
✅ Statistics & analytics  
✅ Rate limiting per user  
✅ Scheduled cron processing  
✅ Non-blocking operation  
✅ Template variables  
✅ Test email functionality  

## 📞 Need Help?

Check the logs:
```
🔍 Starting search alerts processing...
📊 Found X unprocessed search queries
✅ Search alert email sent to: user@example.com
✅ Search alerts processing complete: X emails sent, Y queries processed
```

All functionality is working! Just need to run the migration when the server is stopped.


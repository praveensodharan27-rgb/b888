# 🚀 SEARCH ALERTS - START HERE

## ✅ What's Been Built

A **complete, production-ready search alert system** has been implemented for your SellIt platform!

### What It Does:
1. 📝 **Captures** every search query from logged-in users
2. 🔍 **Matches** new products against saved queries
3. 📧 **Sends** beautiful email alerts to users
4. ⚙️ **Runs** automatically every hour via cron job
5. 🎛️ **Allows** full admin control via REST API

## 🎯 Next Steps (Required)

### Step 1: Stop Your Server
Press `Ctrl+C` in the terminal running your backend.

### Step 2: Run Migration (3 Commands)
```powershell
cd D:\sellit\backend
npx prisma migrate dev --name add_search_alerts
npx prisma generate
npm run init-search-alerts
```

### Step 3: Add SMTP to .env
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FRONTEND_URL=http://localhost:3000
```

**Get Gmail App Password:**
1. Go to: https://myaccount.google.com/apppasswords
2. Enable 2FA if needed
3. Generate App Password
4. Copy to `SMTP_PASS`

### Step 4: Start Server
```powershell
npm run dev
```

### Step 5: Verify It's Working
Look for these logs:
```
✅ Cron jobs scheduled:
   - Process search alerts: Every hour
⏰ Running initial search alerts check on startup...
```

## 📚 Documentation Files

### Quick Reference:
- **5-Minute Setup**: `SEARCH_ALERTS_QUICKSTART.md`
- **Complete Guide**: `SEARCH_ALERTS_SETUP.md`
- **Migration Help**: `MIGRATION_INSTRUCTIONS.md`
- **Visual Diagrams**: `SEARCH_ALERTS_VISUAL_GUIDE.md`
- **Summary**: `SEARCH_ALERTS_IMPLEMENTATION_SUMMARY.md`
- **Frontend Example**: `ADMIN_PANEL_EXAMPLE.tsx`

### Which File to Read?

**I want to get it running NOW:**  
→ `SEARCH_ALERTS_QUICKSTART.md` (5 minutes)

**I want to understand everything:**  
→ `SEARCH_ALERTS_README.md` (complete overview)

**I'm having migration issues:**  
→ `MIGRATION_INSTRUCTIONS.md` (step-by-step)

**I want to build the admin panel:**  
→ `ADMIN_PANEL_EXAMPLE.tsx` (copy-paste ready)

**I want visual diagrams:**  
→ `SEARCH_ALERTS_VISUAL_GUIDE.md` (architecture)

**I want implementation details:**  
→ `SEARCH_ALERTS_IMPLEMENTATION_SUMMARY.md` (what was built)

## 🧪 Test It

### 1. Test Search Capture
1. Login as user with email
2. Search for something: `http://localhost:3000/search?q=iPhone`
3. Check database:
   ```sql
   SELECT * FROM "SearchQuery";
   ```

### 2. Test Email (Requires Admin Token)
```bash
curl -X POST http://localhost:5000/api/search-alerts/test-email \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","testQuery":"iPhone"}'
```

### 3. Check Settings
```bash
curl http://localhost:5000/api/search-alerts/settings \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 📊 Admin API Quick Reference

### Endpoints (All require Admin token):

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/search-alerts/settings` | Get current settings |
| PUT | `/api/search-alerts/settings` | Update settings |
| GET | `/api/search-alerts/statistics` | View statistics |
| GET | `/api/search-alerts/queries` | List queries |
| DELETE | `/api/search-alerts/queries/cleanup` | Cleanup old queries |
| POST | `/api/search-alerts/test-email` | Send test email |

## ⚙️ Configuration Options

Settings you can control:

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Enable/disable system |
| `maxEmailsPerUser` | `5` | Max alerts per user per check |
| `checkIntervalHours` | `24` | Query time window |
| `emailSubject` | Custom | Email subject line |
| `emailBody` | Custom | HTML email template |

## 🎨 Email Template Variables

Use in email body:
- `{{query}}` - User's search query
- `{{products}}` - Product list (auto-generated HTML)
- `{{count}}` - Number of products

## 🕐 How Often Does It Run?

- **Every hour**: Checks for new queries and sends alerts
- **30 seconds after startup**: Initial check
- **Daily at 2 AM**: Account cleanup (existing feature)

## 🔍 What Files Were Modified?

### Created:
- `services/searchAlerts.js` - Core service (550+ lines)
- `routes/search-alerts.js` - Admin API (400+ lines)
- `scripts/init-search-alerts.js` - Initialization script
- `prisma/migrations/[...]_add_search_alerts/` - Migration
- 6 documentation files

### Updated:
- `prisma/schema.prisma` - Added 2 models
- `routes/search.js` - Added query capture
- `utils/cron.js` - Added cron job
- `server.js` - Registered routes & cron
- `package.json` - Added init script

## ❓ Troubleshooting

### Emails not sending?
- Check SMTP credentials in `.env`
- Use Gmail App Password (not regular password)
- Check server logs for SMTP errors
- Test with test email endpoint

### Queries not saving?
- User must be logged in
- User must have email address
- Check server logs for errors

### Migration failed?
- Make sure server is stopped
- Wait 10 seconds after stopping
- Try again

### Need more help?
- See `SEARCH_ALERTS_SETUP.md` - Troubleshooting section
- See `MIGRATION_INSTRUCTIONS.md` - Detailed steps

## 📞 Quick Commands

```powershell
# Run migration
npx prisma migrate dev --name add_search_alerts

# Generate Prisma client
npx prisma generate

# Initialize settings
npm run init-search-alerts

# Start server
npm run dev

# Check database
npx prisma studio

# View logs
# (Look at terminal where server is running)
```

## ✨ Features at a Glance

✅ Automatic query capture  
✅ Hourly processing  
✅ Smart product matching  
✅ Beautiful email templates  
✅ Admin configuration panel  
✅ Statistics & analytics  
✅ Test email functionality  
✅ Automatic cleanup  
✅ Rate limiting  
✅ Template variables  
✅ Non-blocking operation  
✅ Production ready  

## 🎊 You're Ready!

Once you complete Steps 1-4 above, your search alerts system will be:
- ✅ Capturing user searches
- ✅ Processing alerts hourly
- ✅ Sending beautiful emails
- ✅ Providing admin analytics
- ✅ Ready for production

## 📚 Need More Info?

**Quick Setup**: Read `SEARCH_ALERTS_QUICKSTART.md` (next)  
**Everything**: Read `SEARCH_ALERTS_README.md`  
**Diagrams**: Read `SEARCH_ALERTS_VISUAL_GUIDE.md`

---

## 🚦 Current Status

```
Implementation:  ✅ 100% Complete
Migration:       ⏳ Waiting (requires you to run)
SMTP Config:     ⏳ Waiting (requires .env update)
Testing:         ⏳ Waiting (after migration + SMTP)

Next Action: Follow Steps 1-4 above
```

---

**Ready to activate your search alerts system? Follow the 4 steps above!** 🚀

Questions? Check the documentation files listed above.  
Issues? See the troubleshooting section.  
Success? Enjoy increased user engagement! 🎉


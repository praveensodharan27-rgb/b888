# 🚀 Notification System - Quick Start Guide

**5-minute setup**

---

## 📦 1. Install Dependencies

```bash
cd backend
npm install bullmq ioredis node-cron
```

---

## ⚙️ 2. Configure Environment

Add to `backend/.env`:

```env
# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SMS
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# App
FRONTEND_URL=http://localhost:3000
APP_NAME=SellIt
```

---

## 🗄️ 3. Update Database

```bash
npx prisma db push
```

---

## 🔧 4. Update Server.js

Add to `backend/server.js`:

```javascript
// Import cron and queue
const { startAdExpiryCron } = require('./cron/adExpiryCron');
require('./queues/notificationQueue');

// Start cron
startAdExpiryCron();

// Add routes
app.use('/api/notifications', require('./routes/notifications'));
```

---

## 🚀 5. Start Redis

```bash
# Docker
docker run -d -p 6379:6379 redis:alpine

# Or WSL
wsl
sudo service redis-server start
```

---

## 🎯 6. Usage

### Send Notification

```javascript
const { queueAdCreatedNotification } = require('./queues/notificationQueue');

// Queue notification
await queueAdCreatedNotification(userId, adId);
```

### Check Queue Stats

```bash
GET /api/notifications/queue/stats
```

### View History

```bash
GET /api/notifications/history
```

---

## ✅ Done!

Your notification system is ready. All 10 events will automatically send email + SMS notifications.

---

## 📚 Full Documentation

See `NOTIFICATION_SYSTEM_COMPLETE.md` for:
- All 10 notification events
- Email template customization
- SMS format examples
- Queue management
- Cron job configuration
- API reference
- Troubleshooting

---

**Ready to use! 🎉**

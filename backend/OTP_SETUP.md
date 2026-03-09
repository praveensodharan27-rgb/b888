# OTP System Setup

OTP delivery uses **real email (nodemailer)**, **real SMS (Twilio)**, and **BullMQ worker** for async processing.

## Flow

1. `sendOTP()` stores OTP in DB, then adds `sendMail` or `sendSMS` job to BullMQ
2. **Notification worker** (`npm run worker`) processes jobs and sends via nodemailer/Twilio
3. If Redis is down, jobs fall back to direct send in the main process

## Required .env Variables

```env
# Email (nodemailer) - required for email OTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SMS (Twilio) - required for phone OTP  
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890

# Redis - required for BullMQ queue
REDIS_URL=redis://127.0.0.1:6379

# OTP config
OTP_EXPIRES_IN=600
APP_NAME=SellIt
```

## Run Worker

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Notification worker (processes OTP email/SMS jobs)
cd backend && npm run worker
```

## Files

| File | Role |
|------|------|
| `utils/otp.js` | OTP storage, queue jobs via `sendEmail`/`sendSMS` |
| `utils/notifications.js` | Queue + nodemailer/Twilio low-level send |
| `src/queues/notification.queue.js` | BullMQ queue |
| `src/workers/notification.worker.js` | Processes jobs |

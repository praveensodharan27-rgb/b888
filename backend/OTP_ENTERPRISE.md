# Enterprise OTP System

Production-ready OTP with security, rate limiting, and reliability.

## Features

| Feature | Implementation |
|---------|----------------|
| **Hashed OTP** | bcrypt (never store plaintext) |
| **5-min expiry** | `OTP_EXPIRES_IN=300` |
| **Rate limiting** | Redis sliding window |
| **Max failed lockout** | 5 attempts → 15 min lock |
| **BullMQ queue** | Async email/SMS delivery |
| **Retry mechanism** | 3 attempts, exponential backoff |
| **Secure verification** | bcrypt.compare, constant-time |
| **Logging** | Pino (structured JSON in prod) |

## .env Variables

```env
# OTP (5 min default)
OTP_EXPIRES_IN=300

# Rate limiting (Redis)
OTP_RATE_LIMIT_MAX=5
OTP_RATE_WINDOW_SEC=300

# Lockout after failed attempts
OTP_MAX_FAILED_ATTEMPTS=5
OTP_LOCKOUT_MINUTES=15

# bcrypt
OTP_BCRYPT_ROUNDS=10

# BullMQ retry
OTP_JOB_RETRY_ATTEMPTS=3
OTP_JOB_RETRY_DELAY_MS=2000
OTP_WORKER_CONCURRENCY=5

# Email & SMS (nodemailer, Twilio)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...

TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Redis (required for rate limit & queue)
REDIS_URL=redis://127.0.0.1:6379
```

## Migration

If upgrading from old OTP schema (plaintext `code`):

```bash
node scripts/migrate-otp-to-hash.js
```

Then:

```bash
npx prisma generate --schema=prisma/schema.mongodb.prisma
```

## Run

```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Notification worker
npm run worker
```

## API (unchanged)

- `POST /api/auth/send-otp` – `{ email?, phone }`
- `POST /api/auth/verify-otp` – `{ email?, phone, code }`
- `POST /api/auth/verify-reset-otp` – `{ email?, phone, code }`
- `POST /api/auth/reset-password` – `{ email?, phone, code, newPassword }`

## Files

| File | Role |
|------|------|
| `services/otpService.js` | Core: bcrypt, rate limit, lockout, send/verify |
| `utils/otp.js` | Thin wrapper for routes |
| `utils/notifications.js` | Queue + nodemailer/Twilio, retry config |
| `src/workers/notification.worker.js` | BullMQ worker |
| `config/redis.js` | Redis for rate limiting |

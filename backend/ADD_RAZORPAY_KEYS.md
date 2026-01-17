# How to Add Razorpay API Keys to Backend

## Quick Steps

### 1. Create `.env` file in backend directory

If you don't have a `.env` file:

```bash
cd backend
cp .env.example .env
```

### 2. Get Razorpay Keys

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Login or Sign up
3. Go to **Settings** → **API Keys**
4. Click **Generate Test Key** (for development)
5. Copy **Key ID** and **Key Secret**

### 3. Add to `.env` file

Open `backend/.env` and add:

```env
# Payment Gateway Configuration
PAYMENT_GATEWAY_DEV_MODE=false

# Razorpay API Keys (Test Mode)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret_key_here

# Razorpay Webhook Secret (Optional)
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

### 4. Restart Server

```bash
cd backend
npm run dev
```

### 5. Verify

Check status:
```bash
curl http://localhost:5000/api/payment-gateway/status
```

Should show:
```json
{
  "success": true,
  "razorpayConfigured": true,
  "message": "Payment gateway running in production mode with Razorpay"
}
```

---

## Example `.env` File

```env
# Server
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=mongodb+srv://...

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# Razorpay Payment Gateway
PAYMENT_GATEWAY_DEV_MODE=false
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret_key
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

---

## For Production

Use Live Mode keys:

```env
PAYMENT_GATEWAY_DEV_MODE=false
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_live_secret_key
RAZORPAY_WEBHOOK_SECRET=your_live_webhook_secret
```

---

## Development Mode (No Keys Needed)

For testing without real payments:

```env
PAYMENT_GATEWAY_DEV_MODE=true
# Razorpay keys not required
```

---

**See `RAZORPAY_SETUP.md` for detailed guide**



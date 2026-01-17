# Razorpay API Keys Setup Guide

## Quick Setup

### Step 1: Get Razorpay API Keys

1. **Sign up/Login to Razorpay:**
   - Go to [https://dashboard.razorpay.com/](https://dashboard.razorpay.com/)
   - Sign up for a new account or login

2. **Get Test Mode Keys (for development):**
   - Go to **Settings** → **API Keys**
   - Click **Generate Test Key** (if not already generated)
   - Copy the **Key ID** (starts with `rzp_test_`)
   - Copy the **Key Secret**

3. **Get Live Mode Keys (for production):**
   - Switch to **Live Mode** in Razorpay Dashboard
   - Go to **Settings** → **API Keys**
   - Generate Live keys
   - Copy the **Key ID** (starts with `rzp_live_`)
   - Copy the **Key Secret**

### Step 2: Add Keys to Backend

1. **Create `.env` file in backend directory:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Edit `.env` file and add your Razorpay keys:**
   ```env
   # For Development (Test Mode)
   PAYMENT_GATEWAY_DEV_MODE=false
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_test_secret_key_here
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
   ```

3. **For Production, use Live keys:**
   ```env
   PAYMENT_GATEWAY_DEV_MODE=false
   RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_live_secret_key_here
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
   ```

### Step 3: Setup Webhook (Optional but Recommended)

1. **In Razorpay Dashboard:**
   - Go to **Settings** → **Webhooks**
   - Click **Add New Webhook**
   - Webhook URL: `https://yourdomain.com/api/payment-gateway/webhook`
   - Select Events:
     - `payment.captured`
     - `payment.failed`
     - `order.paid`
     - `refund.created`
   - Copy the **Webhook Secret**
   - Add to `.env` as `RAZORPAY_WEBHOOK_SECRET`

2. **For Local Development (using ngrok):**
   ```bash
   # Install ngrok: https://ngrok.com/
   ngrok http 5000
   # Use the ngrok URL in webhook configuration
   ```

### Step 4: Restart Server

```bash
cd backend
npm run dev
```

### Step 5: Verify Setup

Check if Razorpay is configured:

```bash
curl http://localhost:5000/api/payment-gateway/status
```

Expected response:
```json
{
  "success": true,
  "devMode": false,
  "razorpayConfigured": true,
  "razorpayKeyId": "rzp_test_xx...",
  "message": "Payment gateway running in production mode with Razorpay"
}
```

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `RAZORPAY_KEY_ID` | Razorpay Key ID | `rzp_test_xxxxxxxxxxxxx` |
| `RAZORPAY_KEY_SECRET` | Razorpay Secret Key | `your_secret_key_here` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PAYMENT_GATEWAY_DEV_MODE` | Enable mock payments | `false` |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook secret for verification | Not set |

---

## Development vs Production

### Development Mode (Mock Payments)

Set `PAYMENT_GATEWAY_DEV_MODE=true`:
- No real charges
- Automatic payment verification
- Test users available
- No Razorpay keys needed

```env
PAYMENT_GATEWAY_DEV_MODE=true
# Razorpay keys not required in dev mode
```

### Production Mode (Real Payments)

Set `PAYMENT_GATEWAY_DEV_MODE=false`:
- Real payments processed
- Razorpay keys required
- Webhook support

```env
PAYMENT_GATEWAY_DEV_MODE=false
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_live_secret_key
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

---

## Test Cards (Razorpay Test Mode)

When using Test Mode keys, use these test cards:

### Success Cards:
- **Card Number:** `4111 1111 1111 1111`
- **CVV:** Any 3 digits
- **Expiry:** Any future date
- **Name:** Any name

### Failure Cards:
- **Card Number:** `4000 0000 0000 0002` (Card declined)
- **Card Number:** `4000 0000 0000 0069` (Card expired)

---

## Troubleshooting

### Issue: Razorpay not initialized

**Error:** `Razorpay payment gateway not configured`

**Solution:**
1. Check if keys are in `.env` file
2. Verify key format (should start with `rzp_test_` or `rzp_live_`)
3. Restart server after adding keys
4. Check server logs for initialization messages

### Issue: Invalid key error

**Error:** `Invalid Razorpay key`

**Solution:**
1. Verify keys are copied correctly (no extra spaces)
2. Check if using correct mode (test vs live)
3. Regenerate keys in Razorpay dashboard if needed

### Issue: Webhook not working

**Error:** Webhook requests failing

**Solution:**
1. Verify webhook URL is accessible
2. Check webhook secret matches dashboard
3. Ensure webhook events are selected
4. Check server logs for webhook errors

---

## Security Best Practices

1. **Never commit `.env` file** to version control
2. **Use different keys** for development and production
3. **Rotate keys** periodically
4. **Keep secret keys secure** - never expose in frontend code
5. **Use webhook secrets** for webhook verification
6. **Enable HTTPS** in production

---

## Quick Reference

### Check Razorpay Status
```bash
curl http://localhost:5000/api/payment-gateway/status
```

### Test Payment Order Creation
```bash
curl -X POST http://localhost:5000/api/payment-gateway/order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount": 100.50}'
```

### View Razorpay Dashboard
- Test Mode: [https://dashboard.razorpay.com/app/test](https://dashboard.razorpay.com/app/test)
- Live Mode: [https://dashboard.razorpay.com/app/live](https://dashboard.razorpay.com/app/live)

---

## Support

- **Razorpay Documentation:** [https://razorpay.com/docs/](https://razorpay.com/docs/)
- **Razorpay Dashboard:** [https://dashboard.razorpay.com/](https://dashboard.razorpay.com/)
- **Payment Gateway API:** See `RAZORPAY_API_LIST.md`

---

**Last Updated:** 2024



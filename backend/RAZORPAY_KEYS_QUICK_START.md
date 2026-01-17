# Razorpay API Keys - Quick Start Guide

## 🚀 Quick Setup (3 Steps)

### Step 1: Get Your Razorpay Keys

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Login/Sign up
3. Go to **Settings** → **API Keys**
4. Click **Generate Test Key**
5. Copy **Key ID** (starts with `rzp_test_`)
6. Copy **Key Secret**

### Step 2: Add to `.env` File

Create or edit `backend/.env` file:

```env
# Payment Gateway Configuration
PAYMENT_GATEWAY_DEV_MODE=false

# Razorpay API Keys
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret_key_here

# Optional: Webhook Secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

### Step 3: Restart Server

```bash
cd backend
npm run dev
```

---

## ✅ Verify Setup

Check if Razorpay is configured:

```bash
curl http://localhost:5000/api/payment-gateway/status
```

Should return:
```json
{
  "success": true,
  "razorpayConfigured": true,
  "message": "Payment gateway running in production mode with Razorpay"
}
```

---

## 🔧 Using Setup Scripts

### Windows (PowerShell):
```powershell
cd backend
.\setup-razorpay-keys.ps1
```

### Linux/Mac (Bash):
```bash
cd backend
chmod +x setup-razorpay-keys.sh
./setup-razorpay-keys.sh
```

---

## 📝 Manual Setup

If you prefer to add keys manually:

1. **Create `.env` file** in `backend/` directory (if not exists)

2. **Add these lines:**
   ```env
   PAYMENT_GATEWAY_DEV_MODE=false
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_secret_key_here
   ```

3. **Restart server**

---

## 🧪 Test Mode vs Live Mode

### Test Mode (Development)
- Use keys starting with `rzp_test_`
- No real charges
- Use test cards: `4111 1111 1111 1111`

### Live Mode (Production)
- Use keys starting with `rzp_live_`
- Real payments processed
- Switch to Live Mode in Razorpay Dashboard

---

## 🔐 Security Notes

- ✅ Never commit `.env` file to git
- ✅ Use different keys for dev and production
- ✅ Keep secret keys secure
- ✅ Rotate keys periodically

---

## 📚 More Information

- **Detailed Guide:** `RAZORPAY_SETUP.md`
- **API Documentation:** `RAZORPAY_API_LIST.md`
- **Quick Add Guide:** `ADD_RAZORPAY_KEYS.md`

---

## 🆘 Troubleshooting

### Keys not working?
1. Check key format (should start with `rzp_test_` or `rzp_live_`)
2. Verify no extra spaces in `.env` file
3. Restart server after adding keys
4. Check server logs for errors

### Need help?
- Razorpay Docs: https://razorpay.com/docs/
- Razorpay Dashboard: https://dashboard.razorpay.com/

---

**That's it! Your Razorpay integration is ready.** 🎉



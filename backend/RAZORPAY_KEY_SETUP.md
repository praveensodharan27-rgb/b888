# Backend Razorpay Key Setup

## 📍 Where to Add Razorpay Keys

Add Razorpay API keys to your **`backend/.env`** file.

---

## 🔑 Required Environment Variables

Add these to `backend/.env`:

```env
# Payment Gateway Configuration
PAYMENT_GATEWAY_DEV_MODE=false

# Razorpay API Keys
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret_key_here

# Optional: Webhook Secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

---

## 📝 Step-by-Step Instructions

### 1. Create/Edit `.env` File

Navigate to backend directory:
```bash
cd backend
```

Create `.env` file if it doesn't exist:
```bash
# Windows PowerShell
New-Item .env -ItemType File

# Linux/Mac
touch .env
```

### 2. Get Razorpay Keys

1. **Go to Razorpay Dashboard:**
   - Visit: https://dashboard.razorpay.com/
   - Login or Sign up

2. **Get Test Mode Keys (for development):**
   - Click **Settings** → **API Keys**
   - Click **Generate Test Key** (if not already generated)
   - Copy **Key ID** (starts with `rzp_test_`)
   - Copy **Key Secret**

3. **Get Live Mode Keys (for production):**
   - Switch to **Live Mode** in dashboard
   - Go to **Settings** → **API Keys**
   - Generate Live keys
   - Copy **Key ID** (starts with `rzp_live_`)
   - Copy **Key Secret**

### 3. Add Keys to `.env`

Open `backend/.env` and add:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database (your existing config)
DATABASE_URL=your_database_url

# JWT (your existing config)
JWT_SECRET=your_jwt_secret

# ============================================
# Razorpay Payment Gateway
# ============================================
PAYMENT_GATEWAY_DEV_MODE=false
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret_key_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

**Replace:**
- `rzp_test_xxxxxxxxxxxxx` with your actual Key ID
- `your_razorpay_secret_key_here` with your actual Secret Key
- `your_webhook_secret_here` with your Webhook Secret (optional)

### 4. Restart Server

After adding keys, restart your backend server:

```bash
cd backend
npm run dev
```

---

## ✅ Verify Configuration

### Check Status Endpoint

```bash
curl http://localhost:5000/api/payment-gateway/status
```

**Expected Response:**
```json
{
  "success": true,
  "devMode": false,
  "razorpayConfigured": true,
  "razorpayKeyId": "rzp_test_xx...",
  "message": "Payment gateway running in production mode with Razorpay"
}
```

### Check Server Logs

When server starts, you should see:
```
✅ Razorpay initialized for payment gateway
```

---

## 🔧 Quick Setup Scripts

### Windows PowerShell:
```powershell
cd backend
.\setup-razorpay-keys.ps1
```

### Linux/Mac:
```bash
cd backend
chmod +x setup-razorpay-keys.sh
./setup-razorpay-keys.sh
```

---

## 📋 Example `.env` File

Complete example with Razorpay keys:

```env
# Server
NODE_ENV=development
PORT=5000
HOST=0.0.0.0
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/database

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Razorpay Payment Gateway
PAYMENT_GATEWAY_DEV_MODE=false
RAZORPAY_KEY_ID=rzp_test_1234567890abcdef
RAZORPAY_KEY_SECRET=abcdef1234567890abcdef1234567890
RAZORPAY_WEBHOOK_SECRET=webhook_secret_1234567890

# Email (your existing config)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
```

---

## 🧪 Test Mode vs Production

### Test Mode (Development)
```env
PAYMENT_GATEWAY_DEV_MODE=false
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_test_secret_key
```
- Use test cards: `4111 1111 1111 1111`
- No real charges

### Production Mode
```env
PAYMENT_GATEWAY_DEV_MODE=false
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_live_secret_key
```
- Real payments processed
- Use Live Mode keys from Razorpay Dashboard

---

## 🔐 Security Notes

1. **Never commit `.env` file** to git (already in `.gitignore`)
2. **Use different keys** for development and production
3. **Keep secret keys secure** - never expose in frontend code
4. **Rotate keys** periodically for security

---

## 🆘 Troubleshooting

### Issue: Keys not working

**Check:**
1. Key format is correct (starts with `rzp_test_` or `rzp_live_`)
2. No extra spaces in `.env` file
3. Server restarted after adding keys
4. Check server logs for errors

### Issue: "Razorpay not configured"

**Solution:**
1. Verify keys are in `.env` file
2. Check key format
3. Restart server
4. Check `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set

### Issue: Invalid key error

**Solution:**
1. Verify keys copied correctly (no spaces)
2. Check if using correct mode (test vs live)
3. Regenerate keys in Razorpay dashboard

---

## 📚 Related Files

- **Quick Start:** `RAZORPAY_KEYS_QUICK_START.md`
- **Detailed Guide:** `RAZORPAY_SETUP.md`
- **API List:** `RAZORPAY_API_LIST.md`

---

## 🔗 Useful Links

- **Razorpay Dashboard:** https://dashboard.razorpay.com/
- **Razorpay Docs:** https://razorpay.com/docs/
- **API Keys Page:** https://dashboard.razorpay.com/app/keys

---

**Location:** `backend/.env`  
**Required Keys:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`  
**Optional:** `RAZORPAY_WEBHOOK_SECRET`



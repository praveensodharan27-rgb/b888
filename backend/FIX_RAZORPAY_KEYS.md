# Fix Missing Razorpay Keys

## 🔍 Check Current Status

Run this to check what's missing:
```bash
cd backend
# Windows PowerShell
Get-Content .env | Select-String "RAZORPAY"

# Linux/Mac
grep RAZORPAY .env
```

---

## ✅ Quick Fix - Add Missing Keys

### Step 1: Open `.env` File

```bash
cd backend
# Edit .env file
notepad .env  # Windows
nano .env     # Linux/Mac
```

### Step 2: Add Missing Keys

Add these lines to your `backend/.env` file:

```env
# Payment Gateway Configuration
PAYMENT_GATEWAY_DEV_MODE=false

# Razorpay API Keys
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret_key_here

# Optional: Webhook Secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

### Step 3: Get Your Razorpay Keys

1. **Go to Razorpay Dashboard:**
   - https://dashboard.razorpay.com/
   - Login or Sign up

2. **Get Test Keys:**
   - Click **Settings** → **API Keys**
   - Click **Generate Test Key** (if not already generated)
   - Copy **Key ID** (starts with `rzp_test_`)
   - Copy **Key Secret**

3. **Replace in `.env`:**
   - Replace `rzp_test_xxxxxxxxxxxxx` with your actual Key ID
   - Replace `your_razorpay_secret_key_here` with your actual Secret Key

### Step 4: Restart Server

```bash
cd backend
npm run dev
```

---

## 🔧 Using Setup Script

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

## ✅ Verify Keys Are Added

After adding keys, verify:

```bash
# Check status endpoint
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

## 📝 Example `.env` Entry

Make sure your `.env` has:

```env
PAYMENT_GATEWAY_DEV_MODE=false
RAZORPAY_KEY_ID=rzp_test_RjV7befLdRKBZa
RAZORPAY_KEY_SECRET=your_actual_secret_key_here
```

**Important:**
- No spaces around `=`
- No quotes around values
- Key ID starts with `rzp_test_` or `rzp_live_`
- Secret key is a long string

---

## 🆘 Common Issues

### Issue: Key ID exists but Secret is missing

**Solution:** Add `RAZORPAY_KEY_SECRET` to `.env`:
```env
RAZORPAY_KEY_SECRET=your_secret_key_from_razorpay_dashboard
```

### Issue: Keys not working after adding

**Check:**
1. No extra spaces in `.env` file
2. Keys copied correctly from Razorpay dashboard
3. Server restarted after adding keys
4. Check server logs for errors

### Issue: "Razorpay not configured" error

**Solution:**
1. Verify both `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are in `.env`
2. Check key format (should start with `rzp_test_` or `rzp_live_`)
3. Restart server
4. Check: `curl http://localhost:5000/api/payment-gateway/status`

---

## 🔗 Get Razorpay Keys

**Dashboard:** https://dashboard.razorpay.com/app/keys

**Steps:**
1. Login to Razorpay Dashboard
2. Go to Settings → API Keys
3. Generate Test Key (for development)
4. Copy Key ID and Key Secret
5. Add to `backend/.env` file

---

## 📚 More Help

- **Quick Setup:** `RAZORPAY_KEYS_QUICK_START.md`
- **Detailed Guide:** `RAZORPAY_SETUP.md`
- **Key Setup:** `RAZORPAY_KEY_SETUP.md`

---

**After adding keys, restart your server!**



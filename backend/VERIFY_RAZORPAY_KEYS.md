# Verify Razorpay Keys Configuration

## ✅ Current Status

Your Razorpay keys are configured:
- ✅ **RAZORPAY_KEY_ID:** `rzp_test_RjV7befLdRKBZa`
- ✅ **RAZORPAY_KEY_SECRET:** Configured

---

## 🔍 If Server Shows "Missing" Error

Even though keys are in `.env`, the server might not be reading them. Try these fixes:

### Fix 1: Restart Server

```bash
# Stop the server (Ctrl+C)
# Then restart:
cd backend
npm run dev
```

Look for this message in server logs:
```
✅ Razorpay initialized for payment gateway
```

### Fix 2: Check Server Logs

When server starts, you should see:
- ✅ `Razorpay initialized for payment gateway` - Keys working
- ❌ `Razorpay not initialized - keys missing` - Keys not found

### Fix 3: Verify Keys Format

Check your `backend/.env` file:

```env
# Correct format (no spaces, no quotes)
RAZORPAY_KEY_ID=rzp_test_RjV7befLdRKBZa
RAZORPAY_KEY_SECRET=your_secret_key_here

# Wrong format (has spaces or quotes)
RAZORPAY_KEY_ID = rzp_test_RjV7befLdRKBZa  ❌
RAZORPAY_KEY_ID="rzp_test_RjV7befLdRKBZa"  ❌
```

### Fix 4: Test Gateway Status

```bash
curl http://localhost:5000/api/payment-gateway/status
```

**Expected Response:**
```json
{
  "success": true,
  "razorpayConfigured": true,
  "razorpayKeyId": "rzp_test_RjV7be...",
  "message": "Payment gateway running in production mode with Razorpay"
}
```

**If shows `razorpayConfigured: false`:**
- Keys not being read by server
- Restart server
- Check `.env` file location (must be in `backend/` directory)

---

## 🔧 Quick Fix Script

Run this to verify and fix:

```powershell
# Windows PowerShell
cd backend
.\setup-razorpay-keys.ps1
```

Or manually check:

```bash
# Check if keys are in .env
cd backend
grep RAZORPAY .env

# Should show:
# RAZORPAY_KEY_ID=rzp_test_...
# RAZORPAY_KEY_SECRET=...
```

---

## 📝 Ensure Proper Configuration

Your `backend/.env` should have:

```env
# Payment Gateway
PAYMENT_GATEWAY_DEV_MODE=false
RAZORPAY_KEY_ID=rzp_test_RjV7befLdRKBZa
RAZORPAY_KEY_SECRET=your_actual_secret_key_here
```

**Important:**
- ✅ No spaces around `=`
- ✅ No quotes around values
- ✅ Key ID starts with `rzp_test_` or `rzp_live_`
- ✅ Secret key is a long string (usually 32+ characters)

---

## 🆘 Troubleshooting

### Error: "Razorpay payment gateway not configured"

**Causes:**
1. Server not restarted after adding keys
2. `.env` file not in `backend/` directory
3. Keys have wrong format (spaces/quotes)
4. Environment variables not loaded

**Solutions:**
1. Restart server: `npm run dev`
2. Verify `.env` is in `backend/` directory
3. Check key format (no spaces/quotes)
4. Check server logs for initialization message

### Error: "Invalid Razorpay key"

**Causes:**
1. Key copied incorrectly
2. Extra spaces or characters
3. Wrong key (test vs live)

**Solutions:**
1. Copy key again from Razorpay dashboard
2. Remove any spaces or quotes
3. Verify you're using correct mode (test/live)

---

## ✅ Verification Checklist

- [ ] `.env` file exists in `backend/` directory
- [ ] `RAZORPAY_KEY_ID` is set (starts with `rzp_test_` or `rzp_live_`)
- [ ] `RAZORPAY_KEY_SECRET` is set (long string)
- [ ] No spaces around `=` sign
- [ ] No quotes around values
- [ ] Server restarted after adding keys
- [ ] Server logs show "Razorpay initialized"
- [ ] Status endpoint shows `razorpayConfigured: true`

---

## 🔗 Get New Keys (If Needed)

If you need to regenerate keys:

1. Go to: https://dashboard.razorpay.com/app/keys
2. Click **Generate Test Key** (or **Generate Live Key** for production)
3. Copy new Key ID and Key Secret
4. Update `backend/.env` file
5. Restart server

---

## 📞 Need Help?

- **Razorpay Dashboard:** https://dashboard.razorpay.com/
- **Razorpay Docs:** https://razorpay.com/docs/
- **Setup Guide:** `RAZORPAY_SETUP.md`

---

**Your keys are configured! If server shows missing, restart it.**



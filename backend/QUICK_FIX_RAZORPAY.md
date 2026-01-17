# Quick Fix: Razorpay Keys Missing Error

## ✅ Your Keys Are Configured!

Your `.env` file has:
- ✅ **RAZORPAY_KEY_ID:** `rzp_test_RjV7befLdRKBZa`
- ✅ **RAZORPAY_KEY_SECRET:** Configured

---

## 🔧 Quick Fix (3 Steps)

### Step 1: Restart Server

**Stop the server** (press `Ctrl+C` in terminal), then:

```bash
cd backend
npm run dev
```

### Step 2: Check Server Logs

When server starts, look for:
```
✅ Razorpay initialized for payment gateway
```

If you see this, keys are working!

If you see:
```
⚠️ Razorpay not initialized - keys missing
```

Then proceed to Step 3.

### Step 3: Verify `.env` File Location

Make sure `.env` is in the **`backend/`** directory:

```
sellit/
  └── backend/
      ├── .env          ← Must be here!
      ├── server.js
      └── ...
```

---

## 🔍 Verify Keys Are Loaded

### Test 1: Check Status Endpoint

```bash
curl http://localhost:5000/api/payment-gateway/status
```

**Should return:**
```json
{
  "success": true,
  "razorpayConfigured": true,
  "razorpayKeyId": "rzp_test_RjV7be...",
  "message": "Payment gateway running in production mode with Razorpay"
}
```

### Test 2: Check Server Logs

Look for initialization message when server starts:
- ✅ `✅ Razorpay initialized for payment gateway` - Working!
- ❌ `⚠️ Razorpay not initialized` - Not working

---

## 📝 Ensure Correct Format

Your `backend/.env` should have:

```env
PAYMENT_GATEWAY_DEV_MODE=false
RAZORPAY_KEY_ID=rzp_test_RjV7befLdRKBZa
RAZORPAY_KEY_SECRET=your_secret_key_here
```

**Important:**
- ✅ No spaces: `RAZORPAY_KEY_ID=value` (correct)
- ❌ With spaces: `RAZORPAY_KEY_ID = value` (wrong)
- ✅ No quotes: `RAZORPAY_KEY_ID=value` (correct)
- ❌ With quotes: `RAZORPAY_KEY_ID="value"` (wrong)

---

## 🆘 If Still Not Working

### Option 1: Re-add Keys

1. Open `backend/.env`
2. Find `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` lines
3. Make sure they're exactly:
   ```env
   RAZORPAY_KEY_ID=rzp_test_RjV7befLdRKBZa
   RAZORPAY_KEY_SECRET=your_actual_secret_key
   ```
4. Save file
5. Restart server

### Option 2: Use Setup Script

```powershell
cd backend
.\setup-razorpay-keys.ps1
```

### Option 3: Check dotenv Loading

Make sure `server.js` has at the top:
```javascript
require('dotenv').config();
```

---

## ✅ Success Indicators

After fixing, you should see:

1. **Server logs:**
   ```
   ✅ Razorpay initialized for payment gateway
   ```

2. **Status endpoint:**
   ```json
   {
     "razorpayConfigured": true
   }
   ```

3. **Payment order creation works:**
   ```bash
   POST /api/payment-gateway/order
   ```

---

## 📚 More Help

- **Detailed Guide:** `RAZORPAY_SETUP.md`
- **Key Setup:** `RAZORPAY_KEY_SETUP.md`
- **Verification:** `VERIFY_RAZORPAY_KEYS.md`

---

**Most common fix: Restart the server after adding keys!** 🔄



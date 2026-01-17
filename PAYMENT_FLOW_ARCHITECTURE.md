# 💳 Payment Flow Architecture

## 🎯 Core Principles

1. **Order Creation: Backend Only** ✅
   - All payment orders are created in the backend
   - Frontend only calls API to create order
   - No client-side order creation

2. **Verification: Backend Only** ✅
   - Payment verification happens in backend
   - Frontend sends payment details to backend for verification
   - Backend verifies signature and saves payment record

3. **Activation: Webhook Only** ✅
   - Service activation happens ONLY via Razorpay webhook
   - Verify endpoint does NOT activate services
   - This ensures reliable activation even if client-side verification fails

---

## 🔄 Complete Payment Flow

### Step 1: Create Order (Backend)
```
Frontend → POST /api/payment-gateway/order
         → Backend creates Razorpay order
         → Returns orderId and razorpayKeyId
```

**Backend:**
- Creates order in database
- Creates Razorpay order
- Returns order details to frontend

### Step 2: User Pays (Razorpay)
```
Frontend → Opens Razorpay Checkout
         → User completes payment
         → Razorpay returns payment details
```

### Step 3: Verify Payment (Backend Only - No Activation)
```
Frontend → POST /api/payment-gateway/verify
         → Backend verifies signature
         → Backend saves payment record
         → Backend does NOT activate service
         → Returns: "Payment verified. Service will be activated via webhook."
```

**Backend Verification:**
- Verifies Razorpay signature
- Saves payment record to database
- Updates order status to `verified`
- **Skips activation** (skipActivation: true)

### Step 4: Activation (Webhook Only)
```
Razorpay → POST /api/payment-gateway/webhook (payment.captured)
         → Backend verifies webhook signature
         → Backend activates service
         → Service is now active
```

**Webhook Activation:**
- Razorpay sends webhook when payment is captured
- Backend verifies webhook signature
- Backend activates service (premium ad, business package, etc.)
- Updates order status to `activated`

---

## 📊 Flow Diagram

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │
       │ 1. Create Order
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐    ┌─────────────┐
│   Backend   │───▶│  Razorpay   │
│  (Create)   │    │   (Order)   │
└──────┬──────┘    └─────────────┘
       │
       │ 2. Return Order Details
       │
       ▼
┌─────────────┐
│   Frontend  │
│  (Razorpay  │
│   Checkout) │
└──────┬──────┘
       │
       │ 3. User Pays
       │
       ▼
┌─────────────┐
│  Razorpay   │
│  (Payment)  │
└──────┬──────┘
       │
       │ 4a. Payment Details
       │     (to Frontend)
       │
       ▼
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │
       │ 4b. Verify Payment
       ├─────────────────┐
       │                 │
       ▼                 │
┌─────────────┐          │
│   Backend   │          │
│  (Verify)   │          │
│  ✅ Verify  │          │
│  ❌ No Act. │          │
└─────────────┘          │
                          │
                          │ 5. Webhook
                          │    (payment.captured)
                          │
                          ▼
                   ┌─────────────┐
                   │   Backend   │
                   │  (Webhook)  │
                   │  ✅ Activate│
                   └─────────────┘
```

---

## 🔐 Security Benefits

### Why Webhook-Only Activation?

1. **Reliability**
   - Activation doesn't depend on client-side verification
   - Even if user closes browser, activation happens
   - No race conditions

2. **Security**
   - Webhook signature is verified by Razorpay
   - Cannot be spoofed by client
   - Server-to-server communication

3. **Idempotency**
   - Webhook can be retried safely
   - Duplicate activations are prevented
   - Payment records prevent double processing

---

## 📝 Code Implementation

### Verify Endpoint (No Activation)
```javascript
// backend/routes/payment-gateway.js
router.post('/verify', authenticate, async (req, res) => {
  const result = await processPaymentVerification({
    orderId,
    paymentId,
    signature,
    userId,
    skipActivation: true // ✅ Skip activation - webhook will handle it
  });
  
  res.json({
    success: true,
    message: 'Payment verified. Service will be activated via webhook.',
    ...result
  });
});
```

### Webhook Handler (Activation)
```javascript
// backend/routes/payment-gateway.js
async function handlePaymentCaptured(payment) {
  const result = await processPaymentVerification({
    orderId: payment.order_id,
    paymentId: payment.id,
    signature: '',
    userId: null,
    amount: payment.amount / 100,
    skipSignatureVerification: true,
    // ✅ skipActivation is NOT passed (defaults to false)
    // ✅ Activation happens here
  });
}
```

---

## ✅ Verification Checklist

- [x] Order creation: Backend only
- [x] Payment verification: Backend only
- [x] Service activation: Webhook only
- [x] Verify endpoint skips activation
- [x] Webhook handlers activate services
- [x] Payment records saved before activation
- [x] Duplicate prevention in place

---

## 🚀 Benefits

1. **Reliable Activation**
   - Services activate even if user closes browser
   - No dependency on client-side code

2. **Better Security**
   - Server-to-server webhook communication
   - Signature verification at multiple levels

3. **Better UX**
   - User sees "Payment verified" immediately
   - Service activates in background via webhook
   - No waiting for activation to complete

4. **Scalability**
   - Webhook processing can be queued
   - Can handle high volume payments
   - Retry mechanism for failed activations

---

**Last Updated:** 2024




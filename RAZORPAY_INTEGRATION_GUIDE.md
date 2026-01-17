# Razorpay Payment Gateway Integration Guide

## Overview

This guide covers the complete Razorpay payment gateway integration for the SellIt platform. The payment gateway supports both development (mock) and production (Razorpay) modes.

---

## Features

✅ **Order Creation** - Create payment orders via Razorpay  
✅ **Payment Verification** - Verify payments with signature validation  
✅ **Refund Processing** - Process full and partial refunds  
✅ **Webhook Support** - Handle Razorpay webhook events  
✅ **Payment Capture** - Capture authorized payments  
✅ **Order Management** - Track and manage payment orders  
✅ **Development Mode** - Mock payments for testing  
✅ **4 Test Users** - Pre-configured test users for development  

---

## Setup

### 1. Install Dependencies

Razorpay SDK is already included in `package.json`:

```json
{
  "razorpay": "^2.9.2"
}
```

### 2. Environment Variables

Add these to your `backend/.env` file:

```env
# Payment Gateway Configuration
PAYMENT_GATEWAY_DEV_MODE=false  # Set to true for mock payments

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx  # Your Razorpay Key ID
RAZORPAY_KEY_SECRET=your_razorpay_secret_key  # Your Razorpay Secret Key
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret  # Webhook secret from Razorpay dashboard
```

### 3. Get Razorpay Credentials

1. Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to **Settings** → **API Keys**
3. Generate **Test/Live** keys
4. Copy **Key ID** and **Key Secret**
5. For webhooks, go to **Settings** → **Webhooks** and configure webhook secret

---

## API Endpoints

### Base URL
```
/api/payment-gateway
```

### 1. Create Payment Order

**Endpoint:** `POST /api/payment-gateway/order`

**Request:**
```json
{
  "amount": 100.50,
  "currency": "INR",
  "notes": {
    "description": "Payment for premium ad",
    "adId": "ad_123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment order created successfully",
  "order": {
    "id": "order_db_id",
    "orderId": "order_MjA3NzY4NzY4",
    "amount": 10050,
    "currency": "INR",
    "status": "created"
  },
  "razorpayOrder": {
    "id": "order_MjA3NzY4NzY4",
    "amount": 10050,
    "currency": "INR",
    "status": "created",
    "key": "rzp_test_xxxxxxxxxxxxx"
  },
  "razorpayKeyId": "rzp_test_xxxxxxxxxxxxx"
}
```

**Note:** `razorpayKeyId` is always included in the response (even in dev mode) so mobile apps can open Razorpay checkout.

**Frontend Integration:**
```javascript
// 1. Create order
const response = await fetch('/api/payment-gateway/order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    amount: 100.50,
    notes: { description: 'Premium ad' }
  })
});

const { razorpayOrder } = await response.json();

// 2. Initialize Razorpay Checkout
const options = {
  key: razorpayOrder.key || process.env.RAZORPAY_KEY_ID,
  amount: razorpayOrder.amount,
  currency: razorpayOrder.currency,
  name: 'SellIt',
  description: 'Payment for premium ad',
  order_id: razorpayOrder.id,
  handler: function(response) {
    // 3. Verify payment
    verifyPayment(response);
  },
  prefill: {
    name: user.name,
    email: user.email,
    contact: user.phone
  },
  theme: {
    color: '#3399cc'
  }
};

const razorpay = new Razorpay(options);
razorpay.open();
```

---

### 2. Verify Payment

**Endpoint:** `POST /api/payment-gateway/verify`

**Request:**
```json
{
  "orderId": "order_MjA3NzY4NzY4",
  "paymentId": "pay_MjA3NzY4NzY5",
  "signature": "signature_hash_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "order": {
    "id": "order_db_id",
    "orderId": "order_MjA3NzY4NzY4",
    "status": "paid",
    "paymentId": "pay_MjA3NzY4NzY5",
    "paidAt": "2024-01-15T10:30:00.000Z"
  },
  "paymentId": "pay_MjA3NzY4NzY5"
}
```

**Frontend Integration:**
```javascript
async function verifyPayment(response) {
  const verifyResponse = await fetch('/api/payment-gateway/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      orderId: response.razorpay_order_id,
      paymentId: response.razorpay_payment_id,
      signature: response.razorpay_signature
    })
  });

  const result = await verifyResponse.json();
  
  if (result.success) {
    alert('Payment successful!');
    // Redirect or update UI
  } else {
    alert('Payment verification failed');
  }
}
```

---

### 3. Process Refund

**Endpoint:** `POST /api/payment-gateway/refund`

**Request:**
```json
{
  "orderId": "order_MjA3NzY4NzY4",
  "amount": 50.25,
  "reason": "Customer requested partial refund"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Refund processed successfully",
  "order": {
    "id": "order_db_id",
    "status": "refunded",
    "refundId": "rfnd_MjA3NzY4NzY6",
    "refundAmount": 5025,
    "refundedAt": "2024-01-15T11:00:00.000Z"
  },
  "refundId": "rfnd_MjA3NzY4NzY6",
  "refundAmount": 5025
}
```

---

### 4. Capture Authorized Payment

**Endpoint:** `POST /api/payment-gateway/capture`

**Request:**
```json
{
  "paymentId": "pay_MjA3NzY4NzY5",
  "amount": 100.50
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment captured successfully",
  "payment": {
    "id": "pay_MjA3NzY4NzY5",
    "status": "captured",
    "amount": 10050
  }
}
```

---

### 5. Get Order Status

**Endpoint:** `GET /api/payment-gateway/order/:orderId`

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "order_db_id",
    "orderId": "order_MjA3NzY4NzY4",
    "amount": 10050,
    "currency": "INR",
    "status": "paid",
    "paymentId": "pay_MjA3NzY4NzY5",
    "paidAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 6. Get Payment Details

**Endpoint:** `GET /api/payment-gateway/payment/:paymentId`

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "pay_MjA3NzY4NzY5",
    "amount": 10050,
    "currency": "INR",
    "status": "captured",
    "method": "card",
    "created_at": 1705312200
  }
}
```

---

### 7. Get Razorpay Order Details

**Endpoint:** `GET /api/payment-gateway/razorpay-order/:orderId`

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "order_MjA3NzY4NzY4",
    "amount": 10050,
    "currency": "INR",
    "status": "paid",
    "receipt": "receipt_1234567890"
  }
}
```

---

### 8. Webhook Handler

**Endpoint:** `POST /api/payment-gateway/webhook`

**Note:** This endpoint is called by Razorpay, not your frontend.

**Webhook Events Handled:**
- `payment.captured` - Payment successfully captured
- `payment.failed` - Payment failed
- `order.paid` - Order marked as paid
- `refund.created` - Refund created

**Webhook Configuration in Razorpay Dashboard:**
1. Go to **Settings** → **Webhooks**
2. Add webhook URL: `https://yourdomain.com/api/payment-gateway/webhook`
3. Select events:
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
   - `refund.created`
4. Copy webhook secret and add to `.env` as `RAZORPAY_WEBHOOK_SECRET`

---

### 9. Gateway Status

**Endpoint:** `GET /api/payment-gateway/status`

**Response:**
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

## Payment Flow

### Complete Payment Flow

```
1. User initiates payment
   ↓
2. Frontend calls: POST /api/payment-gateway/order
   ↓
3. Backend creates Razorpay order
   ↓
4. Frontend receives order details
   ↓
5. Frontend opens Razorpay Checkout
   ↓
6. User completes payment on Razorpay
   ↓
7. Razorpay redirects back with payment details
   ↓
8. Frontend calls: POST /api/payment-gateway/verify
   ↓
9. Backend verifies signature and updates order
   ↓
10. Payment successful!
```

---

## Error Handling

### Common Errors

**1. Payment Gateway Not Configured**
```json
{
  "success": false,
  "message": "Razorpay payment gateway not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET"
}
```

**Solution:** Add Razorpay keys to `.env` file

**2. Invalid Payment Signature**
```json
{
  "success": false,
  "message": "Invalid payment signature. Payment verification failed."
}
```

**Solution:** Ensure signature is generated correctly on frontend

**3. Amount Too Small**
```json
{
  "success": false,
  "message": "Amount must be at least ₹1.00 (100 paise)"
}
```

**Solution:** Razorpay minimum amount is ₹1.00

**4. Payment Not Successful**
```json
{
  "success": false,
  "message": "Payment not successful. Status: failed"
}
```

**Solution:** Payment failed on Razorpay side. Check payment details.

---

## Testing

### Development Mode

Set `PAYMENT_GATEWAY_DEV_MODE=true` in `.env`:

```env
PAYMENT_GATEWAY_DEV_MODE=true
```

In development mode:
- All payments are mocked
- No real charges occur
- Payment verification is automatic
- Test users are available

### Test Users

4 test users are available in development mode:

1. **Test User 1** - Balance: ₹100.00
2. **Test User 2** - Balance: ₹50.00
3. **Test User 3** - Balance: ₹200.00
4. **Test User 4** - Balance: ₹0.00

### Test Cards (Razorpay Test Mode)

When using Razorpay test keys, use these test cards:

**Success Cards:**
- `4111 1111 1111 1111` - Any CVV, Any expiry date
- `5555 5555 5555 4444` - Any CVV, Any expiry date

**Failure Cards:**
- `4000 0000 0000 0002` - Card declined
- `4000 0000 0000 0069` - Card expired

---

## Security Best Practices

1. **Never expose secret keys** - Keep `RAZORPAY_KEY_SECRET` server-side only
2. **Always verify signatures** - Never trust payment data without signature verification
3. **Use HTTPS** - Always use HTTPS in production
4. **Validate webhooks** - Always verify webhook signatures
5. **Store payment IDs** - Store Razorpay order and payment IDs for reference
6. **Handle failures** - Implement proper error handling and retry logic

---

## Database Schema

The payment gateway uses the `PaymentOrder` model:

```prisma
model PaymentOrder {
  id                String   @id @default(auto()) @map("_id") @db.ObjectId
  orderId           String   @unique  // Razorpay order ID
  userId            String   @db.ObjectId
  amount            Int      // Amount in paise
  currency          String   @default("INR")
  status            String   @default("created") // created, paid, refunded, failed
  paymentId         String?  // Razorpay payment ID
  signature         String?
  refundId          String?  // Razorpay refund ID
  refundAmount      Int?
  notes             String?
  isTestOrder       Boolean  @default(false)
  paidAt            DateTime?
  refundedAt        DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  user              User     @relation(...)
}
```

---

## Troubleshooting

### Razorpay Not Initialized

**Check:**
1. Environment variables are set correctly
2. Keys are valid (test/live match environment)
3. Server restarted after adding keys

**Solution:**
```bash
# Check environment variables
echo $RAZORPAY_KEY_ID
echo $RAZORPAY_KEY_SECRET

# Restart server
npm run dev
```

### Webhook Not Working

**Check:**
1. Webhook URL is accessible from internet
2. Webhook secret is configured correctly
3. Events are selected in Razorpay dashboard

**Solution:**
- Use ngrok for local testing: `ngrok http 5000`
- Verify webhook secret matches dashboard
- Check server logs for webhook requests

### Payment Verification Fails

**Check:**
1. Signature is generated correctly
2. Order ID matches
3. Payment ID is correct

**Solution:**
- Verify signature generation on frontend
- Check order exists in database
- Verify payment status on Razorpay dashboard

---

## Additional Resources

- [Razorpay Documentation](https://razorpay.com/docs/)
- [Razorpay Checkout Integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/)
- [Razorpay Webhooks](https://razorpay.com/docs/webhooks/)
- [Razorpay Test Cards](https://razorpay.com/docs/payments/test-cards/)

---

## Support

For issues or questions:
1. Check Razorpay dashboard logs
2. Review server logs
3. Verify environment variables
4. Test with Razorpay test keys first

---

**Last Updated:** 2024  
**Version:** 1.0.0


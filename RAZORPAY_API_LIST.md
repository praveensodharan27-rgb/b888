# Razorpay Payment Gateway API List

**Base URL:** `/api/payment-gateway`  
**Authentication:** Most endpoints require JWT token: `Authorization: Bearer {token}`

---

## 📋 Complete API Endpoints List

### 1. Gateway Status
**Endpoint:** `GET /api/payment-gateway/status`  
**Auth:** Public  
**Description:** Get payment gateway status and configuration

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

### 2. Create Payment Order
**Endpoint:** `POST /api/payment-gateway/order`  
**Auth:** Private (JWT required)  
**Description:** Create a new Razorpay payment order

**Request Body:**
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

**Important:** `razorpayKeyId` is always included in the response (even in dev mode) because mobile apps require it to open Razorpay checkout.

**Frontend Usage:**
```javascript
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
// Use razorpayOrder.id and razorpayOrder.key for Razorpay Checkout
```

---

### 3. Verify Payment
**Endpoint:** `POST /api/payment-gateway/verify`  
**Auth:** Private (JWT required)  
**Description:** Verify Razorpay payment after user completes payment

**Request Body:**
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

**Frontend Usage:**
```javascript
// After Razorpay payment success callback
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
  console.log('Payment verified!');
}
```

---

### 4. Process Refund
**Endpoint:** `POST /api/payment-gateway/refund`  
**Auth:** Private (JWT required)  
**Description:** Process full or partial refund for a paid order

**Request Body:**
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

**Note:** If `amount` is not provided, full refund is processed.

---

### 5. Capture Authorized Payment
**Endpoint:** `POST /api/payment-gateway/capture`  
**Auth:** Private (JWT required)  
**Description:** Capture an authorized payment (for cards that require capture)

**Request Body:**
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

### 6. Get Order Status
**Endpoint:** `GET /api/payment-gateway/order/:orderId`  
**Auth:** Private (JWT required)  
**Description:** Get status of a payment order

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
    "paidAt": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-15T10:25:00.000Z"
  }
}
```

**Order Statuses:**
- `created` - Order created, payment pending
- `paid` - Payment successful
- `refunded` - Refund processed
- `failed` - Payment failed

---

### 7. Get Payment History
**Endpoint:** `GET /api/payment-gateway/payments`  
**Auth:** Private (JWT required)  
**Description:** Get user's payment history with pagination

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Example:** `GET /api/payment-gateway/payments?page=1&limit=20`

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "id": "order_db_id",
      "orderId": "order_MjA3NzY4NzY4",
      "amount": 10050,
      "currency": "INR",
      "status": "paid",
      "createdAt": "2024-01-15T10:25:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

---

### 8. Get Payment Details
**Endpoint:** `GET /api/payment-gateway/payment/:paymentId`  
**Auth:** Private (JWT required)  
**Description:** Get detailed information about a Razorpay payment

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
    "created_at": 1705312200,
    "order_id": "order_MjA3NzY4NzY4"
  }
}
```

---

### 9. Get Razorpay Order Details
**Endpoint:** `GET /api/payment-gateway/razorpay-order/:orderId`  
**Auth:** Private (JWT required)  
**Description:** Get detailed information from Razorpay about an order

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

### 10. Webhook Handler
**Endpoint:** `POST /api/payment-gateway/webhook`  
**Auth:** Public (Signature verified)  
**Description:** Razorpay webhook endpoint for payment notifications

**Note:** This endpoint is called by Razorpay, not your frontend.

**Headers:**
- `x-razorpay-signature`: Webhook signature

**Webhook Events Handled:**
- `payment.captured` - Payment successfully captured
- `payment.failed` - Payment failed
- `order.paid` - Order marked as paid
- `refund.created` - Refund created

**Configuration:**
1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/payment-gateway/webhook`
3. Select events: `payment.captured`, `payment.failed`, `order.paid`, `refund.created`
4. Copy webhook secret and add to `.env` as `RAZORPAY_WEBHOOK_SECRET`

---

### 11. Reinitialize Razorpay
**Endpoint:** `POST /api/payment-gateway/reinitialize`  
**Auth:** Private (Admin only)  
**Description:** Reinitialize Razorpay with updated keys

**Response:**
```json
{
  "success": true,
  "message": "Razorpay reinitialized successfully",
  "razorpayConfigured": true
}
```

---

### 12. Get Test Users (Development Only)
**Endpoint:** `GET /api/payment-gateway/test-users`  
**Auth:** Private (Dev mode or Admin)  
**Description:** Get list of test users for development

**Response:**
```json
{
  "success": true,
  "devMode": true,
  "testUsers": [
    {
      "id": "test_user_1",
      "email": "testuser1@example.com",
      "name": "Test User 1",
      "balance": 10000
    },
    {
      "id": "test_user_2",
      "email": "testuser2@example.com",
      "name": "Test User 2",
      "balance": 5000
    },
    {
      "id": "test_user_3",
      "email": "testuser3@example.com",
      "name": "Test User 3",
      "balance": 20000
    },
    {
      "id": "test_user_4",
      "email": "testuser4@example.com",
      "name": "Test User 4",
      "balance": 0
    }
  ]
}
```

---

### 13. Get Test User Info (Development Only)
**Endpoint:** `GET /api/payment-gateway/test-user/:userId`  
**Auth:** Private (Dev mode or Admin)  
**Description:** Get information about a specific test user

**Response:**
```json
{
  "success": true,
  "devMode": true,
  "testUser": {
    "id": "test_user_1",
    "email": "testuser1@example.com",
    "name": "Test User 1",
    "balance": 10000
  }
}
```

---

## 🔄 Complete Payment Flow

### Step-by-Step Integration

**1. Create Order:**
```javascript
POST /api/payment-gateway/order
{
  "amount": 100.50,
  "notes": { "description": "Premium ad" }
}
```

**2. Initialize Razorpay Checkout:**
```javascript
const options = {
  key: razorpayOrder.key,
  amount: razorpayOrder.amount,
  currency: 'INR',
  name: 'SellIt',
  order_id: razorpayOrder.id,
  handler: function(response) {
    // Step 3: Verify payment
    verifyPayment(response);
  }
};

const razorpay = new Razorpay(options);
razorpay.open();
```

**3. Verify Payment:**
```javascript
POST /api/payment-gateway/verify
{
  "orderId": response.razorpay_order_id,
  "paymentId": response.razorpay_payment_id,
  "signature": response.razorpay_signature
}
```

**4. Handle Success:**
```javascript
if (result.success) {
  // Payment verified, proceed with your logic
  console.log('Payment successful!');
}
```

---

## 📊 Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/status` | GET | Public | Get gateway status |
| `/order` | POST | Private | Create payment order |
| `/verify` | POST | Private | Verify payment |
| `/refund` | POST | Private | Process refund |
| `/capture` | POST | Private | Capture authorized payment |
| `/order/:orderId` | GET | Private | Get order status |
| `/payments` | GET | Private | Get payment history |
| `/payment/:paymentId` | GET | Private | Get payment details |
| `/razorpay-order/:orderId` | GET | Private | Get Razorpay order details |
| `/webhook` | POST | Public* | Razorpay webhook handler |
| `/reinitialize` | POST | Admin | Reinitialize Razorpay |
| `/test-users` | GET | Dev/Admin | Get test users |
| `/test-user/:userId` | GET | Dev/Admin | Get test user info |

*Webhook is public but signature is verified

---

## 🔑 Environment Variables

```env
# Payment Gateway
PAYMENT_GATEWAY_DEV_MODE=false

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret_key
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

---

## 🧪 Testing

### Test Cards (Razorpay Test Mode)

**Success Cards:**
- `4111 1111 1111 1111` - Any CVV, Any expiry date
- `5555 5555 5555 4444` - Any CVV, Any expiry date

**Failure Cards:**
- `4000 0000 0000 0002` - Card declined
- `4000 0000 0000 0069` - Card expired

---

## 📚 Related Documentation

- **Complete Integration Guide:** `RAZORPAY_INTEGRATION_GUIDE.md`
- **Payment Gateway API:** `PAYMENT_GATEWAY_API.md`
- **API List:** `API_LIST.md`

---

**Total Endpoints:** 13  
**Last Updated:** 2024




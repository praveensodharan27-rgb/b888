# Razorpay Payment Gateway API Endpoints

**Base URL:** `/api/payment-gateway`  
**Authentication:** Most endpoints require JWT token: `Authorization: Bearer {token}`

---

## 📋 Complete Razorpay API Endpoints List

### 1. Gateway Status
**`GET /api/payment-gateway/status`**  
**Auth:** Public  
**Description:** Check payment gateway status and Razorpay configuration

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
**`POST /api/payment-gateway/order`**  
**Auth:** Private (JWT required)  
**Description:** Create a new Razorpay payment order

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
    "orderId": "order_MjA3NzY4NzY4",
    "amount": 10050,
    "currency": "INR",
    "status": "created"
  },
  "razorpayOrder": {
    "id": "order_MjA3NzY4NzY4",
    "amount": 10050,
    "currency": "INR",
    "key": "rzp_test_xxxxxxxxxxxxx"
  }
}
```

---

### 3. Verify Payment
**`POST /api/payment-gateway/verify`**  
**Auth:** Private (JWT required)  
**Description:** Verify Razorpay payment after user completes payment

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
    "orderId": "order_MjA3NzY4NzY4",
    "status": "paid",
    "paymentId": "pay_MjA3NzY4NzY5",
    "paidAt": "2024-01-15T10:30:00.000Z"
  },
  "paymentId": "pay_MjA3NzY4NzY5"
}
```

---

### 4. Process Refund
**`POST /api/payment-gateway/refund`**  
**Auth:** Private (JWT required)  
**Description:** Process full or partial refund for a paid order

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

### 5. Capture Authorized Payment
**`POST /api/payment-gateway/capture`**  
**Auth:** Private (JWT required)  
**Description:** Capture an authorized payment (for cards requiring capture)

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

### 6. Get Order Status
**`GET /api/payment-gateway/order/:orderId`**  
**Auth:** Private (JWT required)  
**Description:** Get status of a payment order

**Response:**
```json
{
  "success": true,
  "order": {
    "orderId": "order_MjA3NzY4NzY4",
    "amount": 10050,
    "currency": "INR",
    "status": "paid",
    "paymentId": "pay_MjA3NzY4NzY5",
    "paidAt": "2024-01-15T10:30:00.000Z"
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
**`GET /api/payment-gateway/payments`**  
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
**`GET /api/payment-gateway/payment/:paymentId`**  
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
**`GET /api/payment-gateway/razorpay-order/:orderId`**  
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
**`POST /api/payment-gateway/webhook`**  
**Auth:** Public (Signature verified)  
**Description:** Razorpay webhook endpoint for payment notifications

**Note:** Called by Razorpay, not your frontend.

**Headers:**
- `x-razorpay-signature`: Webhook signature

**Webhook Events:**
- `payment.captured` - Payment successfully captured
- `payment.failed` - Payment failed
- `order.paid` - Order marked as paid
- `refund.created` - Refund created

---

### 11. Reinitialize Razorpay
**`POST /api/payment-gateway/reinitialize`**  
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
**`GET /api/payment-gateway/test-users`**  
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
    }
  ]
}
```

---

### 13. Get Test User Info (Development Only)
**`GET /api/payment-gateway/test-user/:userId`**  
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

## 📊 Quick Reference Table

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 1 | GET | `/status` | Public | Get gateway status |
| 2 | POST | `/order` | Private | Create payment order |
| 3 | POST | `/verify` | Private | Verify payment |
| 4 | POST | `/refund` | Private | Process refund |
| 5 | POST | `/capture` | Private | Capture authorized payment |
| 6 | GET | `/order/:orderId` | Private | Get order status |
| 7 | GET | `/payments` | Private | Get payment history |
| 8 | GET | `/payment/:paymentId` | Private | Get payment details |
| 9 | GET | `/razorpay-order/:orderId` | Private | Get Razorpay order details |
| 10 | POST | `/webhook` | Public* | Razorpay webhook handler |
| 11 | POST | `/reinitialize` | Admin | Reinitialize Razorpay |
| 12 | GET | `/test-users` | Dev/Admin | Get test users |
| 13 | GET | `/test-user/:userId` | Dev/Admin | Get test user info |

*Webhook is public but signature is verified

---

## 🔄 Complete Payment Flow

### Step 1: Create Order
```bash
POST /api/payment-gateway/order
{
  "amount": 100.50,
  "notes": { "description": "Premium ad" }
}
```

### Step 2: Open Razorpay Checkout
```javascript
const options = {
  key: razorpayOrder.key,
  amount: razorpayOrder.amount,
  currency: 'INR',
  order_id: razorpayOrder.id,
  handler: function(response) {
    verifyPayment(response);
  }
};
const razorpay = new Razorpay(options);
razorpay.open();
```

### Step 3: Verify Payment
```bash
POST /api/payment-gateway/verify
{
  "orderId": "order_xxx",
  "paymentId": "pay_xxx",
  "signature": "signature_xxx"
}
```

---

## 🧪 Testing

### Test Cards (Razorpay Test Mode)
- **Success:** `4111 1111 1111 1111` (Any CVV, Any expiry)
- **Failure:** `4000 0000 0000 0002` (Card declined)

### Test Endpoint
```bash
curl http://localhost:5000/api/payment-gateway/status
```

---

## 📚 Related Documentation

- **Complete Guide:** `RAZORPAY_INTEGRATION_GUIDE.md`
- **API List:** `RAZORPAY_API_LIST.md`
- **Setup Guide:** `backend/RAZORPAY_SETUP.md`
- **Keys Setup:** `backend/RAZORPAY_KEY_SETUP.md`

---

**Total Endpoints:** 13  
**Last Updated:** 2024


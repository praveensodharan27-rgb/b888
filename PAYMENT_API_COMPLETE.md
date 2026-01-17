# 💳 Complete Payment API Documentation

**Base URL:** `/api/payment-gateway`  
**Authentication:** Most endpoints require JWT token: `Authorization: Bearer {token}`

---

## 📋 All Payment API Endpoints

### 1. **Gateway Status**
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

### 2. **Create Payment Order**
**Endpoint:** `POST /api/payment-gateway/order`  
**Auth:** Private (JWT required)  
**Description:** Create a new payment order (supports both amount-based and purpose+plan-based)

**Request Body (Option 1 - Amount-based):**
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

**Request Body (Option 2 - Purpose+Plan-based):**
```json
{
  "purpose": "ad_promotion",
  "plan": "TOP",
  "currency": "INR",
  "metadata": {
    "adId": "ad_123"
  }
}
```

**Purpose Types:**
- `ad_promotion` + plan: `TOP` | `FEATURED` | `BUMP_UP` | `URGENT`
- `business_package` + plan: `MAX_VISIBILITY` | `SELLER_PLUS` | `SELLER_PRIME`
- `membership` + plan: `PREMIUM` | `GOLD` | `PLATINUM`
- `ad_posting` + plan (optional): Premium type if any

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
  "razorpayKeyId": "rzp_test_xxxxxxxxxxxxx",
  "calculatedAmount": {
    "purpose": "ad_promotion",
    "plan": "TOP",
    "amount": 299.00,
    "details": {}
  }
}
```

---

### 3. **Verify Payment**
**Endpoint:** `POST /api/payment-gateway/verify`  
**Auth:** Private (JWT required)  
**Description:** Verify Razorpay payment after user completes payment. **Note:** Only verifies payment - activation happens via webhook.

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
  "message": "Payment verified. Service will be activated via webhook.",
  "state": "verified",
  "order": {
    "id": "order_db_id",
    "orderId": "order_MjA3NzY4NzY4",
    "status": "verified",
    "paymentId": "pay_MjA3NzY4NzY5",
    "paidAt": "2024-01-15T10:30:00.000Z"
  },
  "paymentRecord": {
    "id": "payment_record_id",
    "paymentId": "pay_MjA3NzY4NzY5",
    "purpose": "ad_promotion",
    "status": "paid"
  },
  "activation": {
    "serviceActivated": false,
    "message": "Activation will be processed via webhook",
    "pendingActivation": true
  }
}
```

**Important:** 
- Verify endpoint only verifies payment signature and saves payment record
- Service activation happens automatically via Razorpay webhook (`payment.captured` or `order.paid` events)
- This ensures activation is reliable and not dependent on client-side verification

---

### 4. **Process Refund**
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

**Note:** If `amount` is not provided, full refund is processed.

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

### 5. **Cancel Order**
**Endpoint:** `POST /api/payment-gateway/cancel`  
**Auth:** Private (JWT required)  
**Description:** Cancel a payment order (only if not paid)

**Request Body:**
```json
{
  "orderId": "order_MjA3NzY4NzY4"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order cancelled successfully"
}
```

---

### 6. **Capture Authorized Payment**
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

### 7. **Get Order Status**
**Endpoint:** `GET /api/payment-gateway/order/:orderId`  
**Auth:** Private (JWT required)  
**Description:** Get comprehensive order status with activation details

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
  },
  "paymentRecord": {
    "id": "payment_record_id",
    "purpose": "ad_promotion",
    "referenceId": "ad_123",
    "status": "paid"
  },
  "activationStatus": {
    "activated": true,
    "serviceType": "premium_ad",
    "expiresAt": "2024-01-22T10:30:00.000Z"
  },
  "serviceActivated": true
}
```

**Order Statuses:**
- `created` - Order created, payment pending
- `paid` - Payment successful
- `verified` - Payment verified
- `activated` - Service activated
- `refunded` - Refund processed
- `failed` - Payment failed
- `cancelled` - Order cancelled

---

### 8. **Get Payment History**
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
      "createdAt": "2024-01-15T10:25:00.000Z",
      "paidAt": "2024-01-15T10:30:00.000Z"
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

### 9. **Get Payment Details**
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

### 10. **Get Razorpay Order Details**
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

### 11. **Webhook Handler**
**Endpoint:** `POST /api/payment-gateway/webhook`  
**Auth:** Public (Signature verified)  
**Description:** Razorpay webhook endpoint for payment notifications

**Note:** This endpoint is called by Razorpay, not your frontend.

**Headers:**
- `x-razorpay-signature`: Webhook signature

**Webhook Events Handled:**
- `payment.captured` - Payment successfully captured (**triggers service activation**)
- `payment.failed` - Payment failed
- `order.paid` - Order marked as paid (**triggers service activation**)
- `refund.created` - Refund created

**Important:** 
- **Activation happens ONLY via webhook** - not through verify endpoint
- This ensures reliable activation even if client-side verification fails
- Webhook automatically activates service after payment is captured

**Configuration:**
1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/payment-gateway/webhook`
3. Select events: `payment.captured`, `payment.failed`, `order.paid`, `refund.created`
4. Copy webhook secret and add to `.env` as `RAZORPAY_WEBHOOK_SECRET`

---

### 12. **Reinitialize Razorpay**
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

### 13. **Get Test Users (Development Only)**
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

### 14. **Get Test User Info (Development Only)**
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

## 📱 Mobile API Endpoints

### 15. **Mobile: Create Payment Order**
**Endpoint:** `POST /api/payment-gateway/mobile/order`  
**Auth:** Private (JWT required)  
**Description:** Create payment order for mobile app (simplified response)

**Request Body:**
```json
{
  "amount": 100.50,
  "currency": "INR",
  "description": "Premium ad",
  "orderType": "premium"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment order created successfully",
  "orderId": "order_MjA3NzY4NzY4",
  "amount": 10050,
  "currency": "INR",
  "razorpayOrderId": "order_MjA3NzY4NzY4",
  "razorpayKeyId": "rzp_test_xxxxxxxxxxxxx",
  "mobile": {
    "orderId": "order_MjA3NzY4NzY4",
    "amount": 10050,
    "currency": "INR",
    "razorpayOrderId": "order_MjA3NzY4NzY4",
    "razorpayKeyId": "rzp_test_xxxxxxxxxxxxx"
  }
}
```

---

### 16. **Mobile: Verify Payment**
**Endpoint:** `POST /api/payment-gateway/mobile/verify`  
**Auth:** Private (JWT required)  
**Description:** Verify payment for mobile app (simplified response)

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
  "message": "Payment verified and service activated",
  "order": {
    "orderId": "order_MjA3NzY4NzY4",
    "status": "paid",
    "amount": 10050,
    "currency": "INR",
    "paymentId": "pay_MjA3NzY4NzY5",
    "paidAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 17. **Mobile: Get Payment History**
**Endpoint:** `GET /api/payment-gateway/mobile/history`  
**Auth:** Private (JWT required)  
**Description:** Get user's payment history for mobile (optimized response)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

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
      "createdAt": "2024-01-15T10:25:00.000Z",
      "paidAt": "2024-01-15T10:30:00.000Z",
      "paymentId": "pay_MjA3NzY4NzY5"
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

## 🔄 Complete Payment Flow

### Step-by-Step Integration

**1. Create Order:**
```javascript
const response = await fetch('/api/payment-gateway/order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    purpose: 'ad_promotion',
    plan: 'TOP',
    metadata: { adId: 'ad_123' }
  })
});

const { razorpayOrder, razorpayKeyId } = await response.json();
```

**2. Initialize Razorpay Checkout:**
```javascript
const options = {
  key: razorpayKeyId,
  amount: razorpayOrder.amount,
  currency: 'INR',
  name: 'SellIt',
  order_id: razorpayOrder.id,
  handler: function(response) {
    // Step 3: Verify payment
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

**3. Verify Payment:**
```javascript
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
if (result.success && result.activation?.serviceActivated) {
  console.log('Payment verified and service activated!');
}
```

---

## 📊 Summary Table

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/status` | GET | Public | Get gateway status |
| `/order` | POST | Private | Create payment order |
| `/verify` | POST | Private | Verify payment |
| `/refund` | POST | Private | Process refund |
| `/cancel` | POST | Private | Cancel order |
| `/capture` | POST | Private | Capture authorized payment |
| `/order/:orderId` | GET | Private | Get order status |
| `/payments` | GET | Private | Get payment history |
| `/payment/:paymentId` | GET | Private | Get payment details |
| `/razorpay-order/:orderId` | GET | Private | Get Razorpay order details |
| `/webhook` | POST | Public* | Razorpay webhook handler |
| `/reinitialize` | POST | Admin | Reinitialize Razorpay |
| `/test-users` | GET | Dev/Admin | Get test users |
| `/test-user/:userId` | GET | Dev/Admin | Get test user info |
| `/mobile/order` | POST | Private | Mobile: Create order |
| `/mobile/verify` | POST | Private | Mobile: Verify payment |
| `/mobile/history` | GET | Private | Mobile: Get payment history |

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

### Development Mode
- Set `PAYMENT_GATEWAY_DEV_MODE=true` or `NODE_ENV=development`
- All payments are mocked (no real charges)
- Test users available for testing

### Test Cards (Razorpay Test Mode)
**Success Cards:**
- `4111 1111 1111 1111` - Any CVV, Any expiry date
- `5555 5555 5555 4444` - Any CVV, Any expiry date

**Failure Cards:**
- `4000 0000 0000 0002` - Card declined
- `4000 0000 0000 0069` - Card expired

---

## 📚 Related Files

- **Route:** `backend/routes/payment-gateway.js`
- **Service:** `backend/services/paymentGateway.js`
- **Processor:** `backend/services/paymentProcessor.js`
- **Activation:** `backend/services/paymentActivation.js`
- **Calculator:** `backend/services/paymentAmountCalculator.js`

---

**Total Endpoints:** 17  
**Last Updated:** 2024


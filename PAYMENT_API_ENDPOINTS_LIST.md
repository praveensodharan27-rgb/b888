# 💳 Complete Payment API Endpoints List

**Base URL:** `/api`

---

## 📋 Table of Contents

1. [Payment Gateway](#1-payment-gateway-apipayment-gateway)
2. [Premium Services](#2-premium-services-apipremium)
3. [Business Package](#3-business-package-apibusiness-package)
4. [Wallet](#4-wallet-apiwallet)

---

## 1. Payment Gateway (`/api/payment-gateway`)

### Status & Configuration

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/payment-gateway/status` | Public | Get payment gateway status and configuration |

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

### Order Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/payment-gateway/order` | Private | Create a new Razorpay payment order |
| `POST` | `/api/payment-gateway/verify` | Private | Verify Razorpay payment |
| `POST` | `/api/payment-gateway/cancel` | Private | Cancel a payment order |
| `GET` | `/api/payment-gateway/order/:orderId` | Private | Get order status |

**Create Order Request:**
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

**Verify Payment Request:**
```json
{
  "orderId": "order_MjA3NzY4NzY4",
  "paymentId": "pay_MjA3NzY4NzY4",
  "signature": "abc123..."
}
```

---

### Payment Operations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/payment-gateway/capture` | Private | Capture authorized payment |
| `POST` | `/api/payment-gateway/refund` | Private | Process Razorpay refund |
| `GET` | `/api/payment-gateway/payment/:paymentId` | Private | Get Razorpay payment details |
| `GET` | `/api/payment-gateway/razorpay-order/:orderId` | Private | Get Razorpay order details |

**Refund Request:**
```json
{
  "orderId": "order_MjA3NzY4NzY4",
  "amount": 50.25,
  "reason": "Customer requested partial refund"
}
```

**Capture Payment Request:**
```json
{
  "paymentId": "pay_MjA3NzY4NzY4",
  "amount": 100.50
}
```

---

### Payment History

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/payment-gateway/payments` | Private | Get user payment history (paginated) |

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

---

### Webhook

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/payment-gateway/webhook` | Public* | Razorpay webhook handler (signature verified) |

**Webhook Events Handled:**
- `payment.captured`
- `payment.failed`
- `order.paid`
- `refund.created`

---

### Development & Testing

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/payment-gateway/test-users` | Private | Get test users (dev mode only) |
| `GET` | `/api/payment-gateway/test-user/:userId` | Private | Get test user info (dev mode only) |
| `POST` | `/api/payment-gateway/reinitialize` | Admin | Reinitialize Razorpay |

---

### Mobile Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/payment-gateway/mobile/order` | Private | Create payment order for mobile app |
| `POST` | `/api/payment-gateway/mobile/verify` | Private | Verify payment for mobile app |
| `GET` | `/api/payment-gateway/mobile/history` | Private | Get payment history for mobile (optimized) |

**Mobile Order Request:**
```json
{
  "amount": 100.50,
  "currency": "INR",
  "description": "Premium ad",
  "orderType": "premium"
}
```

---

## 2. Premium Services (`/api/premium`)

### Premium Offers

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/premium/offers` | Public | Get premium offers and pricing |

**Response:**
```json
{
  "success": true,
  "offers": {
    "TOP": { "price": 299, "duration": 7 },
    "FEATURED": { "price": 199, "duration": 14 },
    "BUMP_UP": { "price": 99, "duration": 1 }
  }
}
```

---

### Premium Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/premium/order` | Private | Create premium order for ad |
| `POST` | `/api/premium/verify` | Private | Verify premium payment & activate |
| `GET` | `/api/premium/orders` | Private | Get user's premium orders |

**Create Premium Order Request:**
```json
{
  "adId": "ad_123",
  "type": "FEATURED"
}
```

**Verify Premium Payment Request:**
```json
{
  "orderId": "order_MjA3NzY4NzY4",
  "paymentId": "pay_MjA3NzY4NzY4",
  "signature": "abc123..."
}
```

**Response (with activation):**
```json
{
  "success": true,
  "message": "Premium activated successfully",
  "isDuplicate": false,
  "serviceActivated": true,
  "activationDetails": {
    "type": "ad_promotion",
    "adId": "ad_123",
    "premiumType": "FEATURED",
    "expiresAt": "2024-02-15T00:00:00Z"
  },
  "payment": {
    "paymentId": "pay_MjA3NzY4NzY4",
    "orderId": "order_MjA3NzY4NzY4",
    "amount": 19900
  }
}
```

---

### Ad Posting Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/premium/ad-posting/order` | Private | Create ad posting order |
| `POST` | `/api/premium/ad-posting/verify` | Private | Verify ad posting payment |

**Create Ad Posting Order Request:**
```json
{
  "adData": {
    "title": "Product Title",
    "description": "Product Description",
    "price": 1000,
    "categoryId": "cat_123",
    "locationId": "loc_123"
  },
  "premiumType": "FEATURED",
  "isUrgent": false
}
```

**Verify Ad Posting Payment Request:**
```json
{
  "orderId": "order_MjA3NzY4NzY4",
  "paymentId": "pay_MjA3NzY4NzY4",
  "signature": "abc123..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully. You can now create your ad.",
  "isDuplicate": false,
  "serviceActivated": true,
  "activationDetails": {
    "type": "ad_posting",
    "message": "Ad can now be created"
  },
  "payment": {
    "paymentId": "pay_MjA3NzY4NzY4",
    "orderId": "order_MjA3NzY4NzY4",
    "amount": 199
  },
  "orderId": "order_db_id",
  "razorpayOrderId": "order_MjA3NzY4NzY4",
  "razorpayPaymentId": "pay_MjA3NzY4NzY4"
}
```

---

### Testing

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/premium/test-razorpay` | Public | Test Razorpay connection |

---

## 3. Business Package (`/api/business-package`)

### Package Information

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/business-package/info` | Public | Get business package info and pricing |
| `GET` | `/api/business-package/status` | Private | Get user's business package status |

---

### Business Package Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/business-package/order` | Private | Create business package order |
| `POST` | `/api/business-package/verify` | Private | Verify business package payment & activate |
| `GET` | `/api/business-package/orders` | Private | Get business package orders |

**Create Business Package Order Request:**
```json
{
  "packageType": "SELLER_PLUS"
}
```

**Verify Business Package Payment Request:**
```json
{
  "orderId": "order_MjA3NzY4NzY4",
  "paymentId": "pay_MjA3NzY4NzY4",
  "signature": "abc123..."
}
```

**Response (with activation):**
```json
{
  "success": true,
  "message": "Business package activated successfully",
  "isDuplicate": false,
  "serviceActivated": true,
  "activationDetails": {
    "type": "business_package",
    "packageId": "package_123",
    "expiresAt": "2024-02-15T00:00:00Z"
  },
  "payment": {
    "paymentId": "pay_MjA3NzY4NzY4",
    "orderId": "order_MjA3NzY4NzY4",
    "amount": 999
  },
  "package": {
    "id": "package_123",
    "packageType": "SELLER_PLUS",
    "status": "paid",
    "isActive": true,
    "expiresAt": "2024-02-15T00:00:00Z"
  }
}
```

---

### Extra Ad Slots

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/business-package/extra-slots/order` | Private | Order extra ad slots |
| `POST` | `/api/business-package/extra-slots/verify` | Private | Verify extra slots payment |

**Create Extra Slots Order Request:**
```json
{
  "quantity": 5
}
```

---

## 4. Wallet (`/api/wallet`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/wallet/balance` | Private | Get wallet balance |
| `GET` | `/api/wallet/transactions` | Private | Get wallet transactions |
| `GET` | `/api/wallet/statement` | Private | Get wallet statement |
| `GET` | `/api/wallet/statement/download` | Private | Download wallet statement (PDF) |

**Get Balance Response:**
```json
{
  "success": true,
  "balance": 1500.50,
  "currency": "INR"
}
```

**Get Transactions Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `type` (optional): Transaction type filter
- `status` (optional): Transaction status filter

---

## 🔐 Authentication

Most endpoints require JWT authentication:

```http
Authorization: Bearer <your_jwt_token>
```

**Public Endpoints:**
- `GET /api/payment-gateway/status`
- `GET /api/premium/offers`
- `GET /api/premium/test-razorpay`
- `GET /api/business-package/info`
- `POST /api/payment-gateway/webhook` (signature verified)

---

## 📊 Payment Flow

### Standard Payment Flow

1. **Create Order**
   ```
   POST /api/payment-gateway/order
   → Returns: razorpayOrderId, razorpayKeyId
   ```

2. **User Pays via Razorpay**
   - Frontend/Mobile opens Razorpay checkout
   - User completes payment

3. **Verify Payment**
   ```
   POST /api/payment-gateway/verify
   → Returns: Payment verified
   ```

4. **Service Activation** (Automatic)
   - Payment record saved
   - Service activated (ad promotion, membership, etc.)

### Premium Ad Flow

1. **Create Premium Order**
   ```
   POST /api/premium/order
   Body: { "adId": "...", "type": "FEATURED" }
   ```

2. **User Pays**

3. **Verify & Activate**
   ```
   POST /api/premium/verify
   → Ad promotion activated automatically
   → isPremium = true
   → premiumType = "FEATURED"
   → premiumExpiresAt set
   ```

### Business Package Flow

1. **Create Package Order**
   ```
   POST /api/business-package/order
   Body: { "packageType": "SELLER_PLUS" }
   ```

2. **User Pays**

3. **Verify & Activate**
   ```
   POST /api/business-package/verify
   → Package activated automatically
   → isActive = true
   → expiresAt set
   ```

---

## ✅ Payment Activation Features

All payment verification endpoints now include:

1. **Payment Record Saving** ✅
   - All payments saved to `PaymentRecord` table
   - Includes: paymentId, orderId, amount, purpose, referenceId

2. **Service Activation** ✅
   - Ad promotion: `isPremium = true`, `premiumType`, `premiumExpiresAt`
   - Membership: `membershipActive = true`, `membershipType`, `membershipExpiresAt`
   - Business package: `isActive = true`, `expiresAt`

3. **adId Validation** ✅
   - Validates ad exists
   - Verifies ad belongs to user

4. **Duplicate Protection** ✅
   - Prevents duplicate payment processing
   - Returns existing activation if duplicate detected

5. **Clear Response** ✅
   - `serviceActivated`: Boolean
   - `activationDetails`: Complete activation info
   - `isDuplicate`: Boolean

---

## 📝 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "isDuplicate": false,
  "serviceActivated": true,
  "activationDetails": {
    "type": "ad_promotion",
    "adId": "ad_123",
    "premiumType": "FEATURED",
    "expiresAt": "2024-02-15T00:00:00Z"
  },
  "payment": {
    "paymentId": "pay_xxx",
    "orderId": "order_xxx",
    "amount": 19900
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "orderId",
      "message": "Order ID is required"
    }
  ]
}
```

---

## 🔗 Related Documentation

- `PAYMENT_ACTIVATION_COMPLETE.md` - Payment activation system details
- `RAZORPAY_API_LIST.md` - Razorpay integration guide
- `PAYMENT_GATEWAY_API.md` - Payment gateway API documentation

---

**Last Updated:** 2024-01-XX  
**Total Endpoints:** 30+ payment-related endpoints


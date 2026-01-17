# Payment Gateway API Documentation

## Overview

The Payment Gateway API provides a comprehensive payment processing system with support for both production (Razorpay) and development (mock payments) modes. It includes support for 4 test users in development mode for testing purposes.

## Base URL

```
/api/payment-gateway
```

## Development Mode

The payment gateway runs in development mode when:
- `PAYMENT_GATEWAY_DEV_MODE=true` is set in environment variables, OR
- `NODE_ENV` is not set to `production`

In development mode:
- All payments are mocked (no real charges)
- Test users are available for testing
- Payment verification is automatic
- Refunds are simulated

## Test Users (Development Mode)

The API includes 4 pre-configured test users for development:

1. **Test User 1**
   - ID: `test_user_1`
   - Email: `testuser1@example.com`
   - Balance: ₹100.00 (10000 paise)

2. **Test User 2**
   - ID: `test_user_2`
   - Email: `testuser2@example.com`
   - Balance: ₹50.00 (5000 paise)

3. **Test User 3**
   - ID: `test_user_3`
   - Email: `testuser3@example.com`
   - Balance: ₹200.00 (20000 paise)

4. **Test User 4**
   - ID: `test_user_4`
   - Email: `testuser4@example.com`
   - Balance: ₹0.00 (0 paise)

## Endpoints

### 1. Get Payment Gateway Status

Get the current status and configuration of the payment gateway.

**Endpoint:** `GET /api/payment-gateway/status`

**Access:** Public

**Response:**
```json
{
  "success": true,
  "devMode": true,
  "razorpayConfigured": false,
  "message": "Payment gateway running in development mode (mock payments)"
}
```

---

### 2. Create Payment Order

Create a new payment order.

**Endpoint:** `POST /api/payment-gateway/order`

**Access:** Private (Authentication required)

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

**Validation:**
- `amount` (required): Float, minimum 0.01
- `currency` (optional): String, defaults to "INR"
- `notes` (optional): Object for additional metadata

**Response:**
```json
{
  "success": true,
  "message": "Payment order created successfully",
  "order": {
    "id": "order_db_id",
    "orderId": "order_1234567890_abc123",
    "amount": 10050,
    "currency": "INR",
    "status": "created",
    "notes": {
      "description": "Payment for premium ad",
      "adId": "ad_123"
    },
    "isTestOrder": true
  },
  "razorpayOrder": {
    "id": "order_1234567890_abc123",
    "amount": 10050,
    "currency": "INR",
    "status": "created",
    "key": "rzp_test_xxxxxxxxxxxxx"
  },
  "razorpayKeyId": "rzp_test_xxxxxxxxxxxxx"
}
```

**Note:** `razorpayKeyId` is always included in the response (even in dev mode) so mobile apps can open Razorpay checkout.

**Note:** Amount is returned in paise (multiply by 100 to get rupees).

---

### 3. Verify Payment

Verify a payment after it has been processed.

**Endpoint:** `POST /api/payment-gateway/verify`

**Access:** Private (Authentication required)

**Request Body:**
```json
{
  "orderId": "order_1234567890_abc123",
  "paymentId": "pay_1234567890_xyz789",
  "signature": "signature_hash_here"
}
```

**Validation:**
- `orderId` (required): String
- `paymentId` (required): String
- `signature` (required): String

**Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully (DEV MODE)",
  "order": {
    "id": "order_db_id",
    "orderId": "order_1234567890_abc123",
    "status": "paid",
    "paymentId": "pay_1234567890_xyz789",
    "paidAt": "2024-01-15T10:30:00.000Z"
  },
  "paymentId": "pay_1234567890_xyz789",
  "signature": "signature_hash_here"
}
```

**Note:** In development mode, any paymentId and signature will be accepted. The signature is automatically generated.

---

### 4. Process Refund

Process a refund for a paid order.

**Endpoint:** `POST /api/payment-gateway/refund`

**Access:** Private (Authentication required)

**Request Body:**
```json
{
  "orderId": "order_1234567890_abc123",
  "amount": 50.25,
  "reason": "Customer requested refund"
}
```

**Validation:**
- `orderId` (required): String
- `amount` (optional): Float, minimum 0.01 (defaults to full order amount)
- `reason` (optional): String (defaults to "Refund requested")

**Response:**
```json
{
  "success": true,
  "message": "Refund processed successfully (DEV MODE)",
  "order": {
    "id": "order_db_id",
    "orderId": "order_1234567890_abc123",
    "status": "refunded",
    "refundId": "refund_1234567890_def456",
    "refundAmount": 5025,
    "refundedAt": "2024-01-15T11:00:00.000Z"
  },
  "refundId": "refund_1234567890_def456",
  "refundAmount": 5025
}
```

---

### 5. Get Order Status

Get the status of a specific order.

**Endpoint:** `GET /api/payment-gateway/order/:orderId`

**Access:** Private (Authentication required - order must belong to user or user must be admin)

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "order_db_id",
    "orderId": "order_1234567890_abc123",
    "userId": "user_id_here",
    "amount": 10050,
    "currency": "INR",
    "status": "paid",
    "paymentId": "pay_1234567890_xyz789",
    "paidAt": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-15T10:25:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Order Statuses:**
- `created`: Order created, payment pending
- `paid`: Payment successful
- `refunded`: Refund processed
- `failed`: Payment failed

---

### 6. Get User Payment History

Get payment history for the authenticated user.

**Endpoint:** `GET /api/payment-gateway/payments`

**Access:** Private (Authentication required)

**Query Parameters:**
- `page` (optional): Integer, minimum 1 (default: 1)
- `limit` (optional): Integer, 1-100 (default: 20)

**Example:** `GET /api/payment-gateway/payments?page=1&limit=20`

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "id": "order_db_id",
      "orderId": "order_1234567890_abc123",
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

### 7. Get Test Users (Development Only)

Get list of all test users (only available in development mode or for admins).

**Endpoint:** `GET /api/payment-gateway/test-users`

**Access:** Private (Development mode or Admin only)

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

### 8. Get Test User Info (Development Only)

Get information about a specific test user (only available in development mode or for admins).

**Endpoint:** `GET /api/payment-gateway/test-user/:userId`

**Access:** Private (Development mode or Admin only)

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

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "message": "Error message here"
}
```

**Common HTTP Status Codes:**
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (access denied)
- `404`: Not Found (resource not found)
- `500`: Internal Server Error

**Example Error Response:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "msg": "Amount must be at least ₹0.01",
      "param": "amount",
      "location": "body"
    }
  ]
}
```

---

## Authentication

All private endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Usage Examples

### Example 1: Create and Verify Payment (Development Mode)

```javascript
// 1. Create order
const createOrderResponse = await fetch('/api/payment-gateway/order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    amount: 100.50,
    notes: {
      description: 'Premium ad feature'
    }
  })
});

const { order } = await createOrderResponse.json();
const orderId = order.orderId;

// 2. Verify payment (in dev mode, any paymentId works)
const verifyResponse = await fetch('/api/payment-gateway/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    orderId: orderId,
    paymentId: 'pay_test_123',
    signature: 'test_signature'
  })
});

const result = await verifyResponse.json();
console.log('Payment verified:', result);
```

### Example 2: Get Payment History

```javascript
const response = await fetch('/api/payment-gateway/payments?page=1&limit=10', {
  headers: {
    'Authorization': 'Bearer <token>'
  }
});

const { orders, pagination } = await response.json();
console.log('Payment history:', orders);
console.log('Total pages:', pagination.pages);
```

### Example 3: Process Refund

```javascript
const response = await fetch('/api/payment-gateway/refund', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    orderId: 'order_1234567890_abc123',
    amount: 50.25,
    reason: 'Customer requested partial refund'
  })
});

const result = await response.json();
console.log('Refund processed:', result);
```

---

## Environment Variables

Add these to your `.env` file:

```env
# Payment Gateway Configuration
PAYMENT_GATEWAY_DEV_MODE=true  # Set to false for production

# Razorpay Configuration (for production)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

---

## Database Schema

The payment gateway uses the `PaymentOrder` model in Prisma:

```prisma
model PaymentOrder {
  id                String   @id @default(auto()) @map("_id") @db.ObjectId
  orderId           String   @unique
  userId            String   @db.ObjectId
  amount            Int      // Amount in paise
  currency          String   @default("INR")
  status            String   @default("created")
  paymentId         String?
  signature         String?
  refundId          String?
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

## Notes

1. **Amount Format**: All amounts are stored and processed in paise (smallest currency unit). Divide by 100 to get rupees.

2. **Development Mode**: In development mode, payments are automatically verified and no real charges occur.

3. **Test Users**: The 4 test users are only available in development mode for testing purposes.

4. **Security**: In production, always verify payment signatures before processing orders.

5. **Refunds**: Partial refunds are supported. If no amount is specified, a full refund is processed.

---

## Support

For issues or questions, please contact the development team or refer to the main API documentation.


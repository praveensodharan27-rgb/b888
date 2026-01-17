# Razorpay Payment Gateway API - Quick List

**Base URL:** `/api/payment-gateway`

---

## 📋 All Razorpay API Endpoints

### 1. **GET** `/api/payment-gateway/status`
- **Auth:** Public
- **Description:** Get payment gateway status
- **Response:** Gateway status, Razorpay configuration

### 2. **POST** `/api/payment-gateway/order`
- **Auth:** Private (JWT required)
- **Description:** Create Razorpay payment order
- **Body:** `{ amount, currency, notes }`
- **Response:** Order details with Razorpay order ID

### 3. **POST** `/api/payment-gateway/verify`
- **Auth:** Private (JWT required)
- **Description:** Verify Razorpay payment
- **Body:** `{ orderId, paymentId, signature }`
- **Response:** Payment verification result

### 4. **POST** `/api/payment-gateway/refund`
- **Auth:** Private (JWT required)
- **Description:** Process refund (full or partial)
- **Body:** `{ orderId, amount?, reason? }`
- **Response:** Refund details

### 5. **POST** `/api/payment-gateway/capture`
- **Auth:** Private (JWT required)
- **Description:** Capture authorized payment
- **Body:** `{ paymentId, amount? }`
- **Response:** Capture result

### 6. **GET** `/api/payment-gateway/order/:orderId`
- **Auth:** Private (JWT required)
- **Description:** Get order status
- **Response:** Order details and status

### 7. **GET** `/api/payment-gateway/payments`
- **Auth:** Private (JWT required)
- **Description:** Get user payment history
- **Query:** `?page=1&limit=20`
- **Response:** List of payments with pagination

### 8. **GET** `/api/payment-gateway/payment/:paymentId`
- **Auth:** Private (JWT required)
- **Description:** Get Razorpay payment details
- **Response:** Payment information from Razorpay

### 9. **GET** `/api/payment-gateway/razorpay-order/:orderId`
- **Auth:** Private (JWT required)
- **Description:** Get Razorpay order details
- **Response:** Order information from Razorpay

### 10. **POST** `/api/payment-gateway/webhook`
- **Auth:** Public (Signature verified)
- **Description:** Razorpay webhook handler
- **Headers:** `x-razorpay-signature`
- **Events:** payment.captured, payment.failed, order.paid, refund.created

### 11. **POST** `/api/payment-gateway/reinitialize`
- **Auth:** Private (Admin only)
- **Description:** Reinitialize Razorpay with new keys
- **Response:** Reinitialization status

### 12. **GET** `/api/payment-gateway/test-users`
- **Auth:** Private (Dev mode or Admin)
- **Description:** Get test users list (dev mode)
- **Response:** List of 4 test users

### 13. **GET** `/api/payment-gateway/test-user/:userId`
- **Auth:** Private (Dev mode or Admin)
- **Description:** Get test user info (dev mode)
- **Response:** Test user details

---

## 📊 Summary Table

| # | Method | Endpoint | Auth | Purpose |
|---|--------|----------|------|---------|
| 1 | GET | `/status` | Public | Check gateway status |
| 2 | POST | `/order` | Private | Create payment order |
| 3 | POST | `/verify` | Private | Verify payment |
| 4 | POST | `/refund` | Private | Process refund |
| 5 | POST | `/capture` | Private | Capture payment |
| 6 | GET | `/order/:orderId` | Private | Get order status |
| 7 | GET | `/payments` | Private | Payment history |
| 8 | GET | `/payment/:paymentId` | Private | Payment details |
| 9 | GET | `/razorpay-order/:orderId` | Private | Razorpay order info |
| 10 | POST | `/webhook` | Public* | Webhook handler |
| 11 | POST | `/reinitialize` | Admin | Reinit Razorpay |
| 12 | GET | `/test-users` | Dev/Admin | Test users list |
| 13 | GET | `/test-user/:userId` | Dev/Admin | Test user info |

*Webhook signature is verified

---

## 🔄 Payment Flow

```
1. POST /api/payment-gateway/order
   ↓
2. Open Razorpay Checkout (frontend)
   ↓
3. POST /api/payment-gateway/verify
   ↓
4. Payment Complete!
```

---

## 🧪 Quick Test

```bash
# Check status
curl http://localhost:5000/api/payment-gateway/status

# Create order (with auth token)
curl -X POST http://localhost:5000/api/payment-gateway/order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount": 100.50}'
```

---

## 📚 Full Documentation

- **Complete Guide:** `RAZORPAY_API_LIST.md`
- **Endpoints Details:** `RAZORPAY_API_ENDPOINTS.md`
- **Integration Guide:** `RAZORPAY_INTEGRATION_GUIDE.md`

---

**Total: 13 Razorpay API Endpoints**



# Razorpay Payment Gateway - API URLs

**Base URL:** `http://localhost:5000/api/payment-gateway`  
**Production:** `https://yourdomain.com/api/payment-gateway`

---

## 🔗 All Razorpay API URLs

### 1. Gateway Status
```
GET http://localhost:5000/api/payment-gateway/status
```

### 2. Create Payment Order
```
POST http://localhost:5000/api/payment-gateway/order
```

### 3. Verify Payment
```
POST http://localhost:5000/api/payment-gateway/verify
```

### 4. Process Refund
```
POST http://localhost:5000/api/payment-gateway/refund
```

### 5. Capture Payment
```
POST http://localhost:5000/api/payment-gateway/capture
```

### 6. Get Order Status
```
GET http://localhost:5000/api/payment-gateway/order/:orderId
```
Example: `GET http://localhost:5000/api/payment-gateway/order/order_MjA3NzY4NzY4`

### 7. Get Payment History
```
GET http://localhost:5000/api/payment-gateway/payments
GET http://localhost:5000/api/payment-gateway/payments?page=1&limit=20
```

### 8. Get Payment Details
```
GET http://localhost:5000/api/payment-gateway/payment/:paymentId
```
Example: `GET http://localhost:5000/api/payment-gateway/payment/pay_MjA3NzY4NzY5`

### 9. Get Razorpay Order Details
```
GET http://localhost:5000/api/payment-gateway/razorpay-order/:orderId
```
Example: `GET http://localhost:5000/api/payment-gateway/razorpay-order/order_MjA3NzY4NzY4`

### 10. Webhook Handler
```
POST http://localhost:5000/api/payment-gateway/webhook
POST https://yourdomain.com/api/payment-gateway/webhook
```

### 11. Reinitialize Razorpay
```
POST http://localhost:5000/api/payment-gateway/reinitialize
```

### 12. Get Test Users
```
GET http://localhost:5000/api/payment-gateway/test-users
```

### 13. Get Test User Info
```
GET http://localhost:5000/api/payment-gateway/test-user/:userId
```
Example: `GET http://localhost:5000/api/payment-gateway/test-user/test_user_1`

---

## 📋 Quick Reference

| Endpoint | Method | Full URL |
|----------|--------|----------|
| Status | GET | `http://localhost:5000/api/payment-gateway/status` |
| Create Order | POST | `http://localhost:5000/api/payment-gateway/order` |
| Verify Payment | POST | `http://localhost:5000/api/payment-gateway/verify` |
| Refund | POST | `http://localhost:5000/api/payment-gateway/refund` |
| Capture | POST | `http://localhost:5000/api/payment-gateway/capture` |
| Order Status | GET | `http://localhost:5000/api/payment-gateway/order/:orderId` |
| Payment History | GET | `http://localhost:5000/api/payment-gateway/payments` |
| Payment Details | GET | `http://localhost:5000/api/payment-gateway/payment/:paymentId` |
| Razorpay Order | GET | `http://localhost:5000/api/payment-gateway/razorpay-order/:orderId` |
| Webhook | POST | `http://localhost:5000/api/payment-gateway/webhook` |
| Reinitialize | POST | `http://localhost:5000/api/payment-gateway/reinitialize` |
| Test Users | GET | `http://localhost:5000/api/payment-gateway/test-users` |
| Test User | GET | `http://localhost:5000/api/payment-gateway/test-user/:userId` |

---

## 🧪 Quick Test Commands

### Check Status (No Auth)
```bash
curl http://localhost:5000/api/payment-gateway/status
```

### Create Order (With Auth)
```bash
curl -X POST http://localhost:5000/api/payment-gateway/order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount": 100.50}'
```

### Get Payment History (With Auth)
```bash
curl http://localhost:5000/api/payment-gateway/payments \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🌐 Production URLs

Replace `localhost:5000` with your production domain:

```
https://api.yourdomain.com/api/payment-gateway/status
https://api.yourdomain.com/api/payment-gateway/order
https://api.yourdomain.com/api/payment-gateway/verify
https://api.yourdomain.com/api/payment-gateway/refund
```

---

## 📱 Mobile App URLs

For mobile apps, use your backend URL:

```javascript
const BASE_URL = 'http://localhost:5000/api/payment-gateway';
// or in production:
// const BASE_URL = 'https://api.yourdomain.com/api/payment-gateway';

// Create order
const orderUrl = `${BASE_URL}/order`;

// Verify payment
const verifyUrl = `${BASE_URL}/verify`;

// Get status
const statusUrl = `${BASE_URL}/status`;
```

---

**Total: 13 Razorpay API URLs**



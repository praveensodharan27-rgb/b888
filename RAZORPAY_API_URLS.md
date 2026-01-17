# Razorpay Payment Gateway - API URLs

**Base URL:** `http://localhost:5000/api/payment-gateway`  
**Production URL:** `https://yourdomain.com/api/payment-gateway`

---

## 🔑 All Razorpay API URLs

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

## 📋 Complete URL List

| # | Method | URL | Auth |
|---|--------|-----|------|
| 1 | GET | `/api/payment-gateway/status` | Public |
| 2 | POST | `/api/payment-gateway/order` | Private |
| 3 | POST | `/api/payment-gateway/verify` | Private |
| 4 | POST | `/api/payment-gateway/refund` | Private |
| 5 | POST | `/api/payment-gateway/capture` | Private |
| 6 | GET | `/api/payment-gateway/order/:orderId` | Private |
| 7 | GET | `/api/payment-gateway/payments` | Private |
| 8 | GET | `/api/payment-gateway/payment/:paymentId` | Private |
| 9 | GET | `/api/payment-gateway/razorpay-order/:orderId` | Private |
| 10 | POST | `/api/payment-gateway/webhook` | Public* |
| 11 | POST | `/api/payment-gateway/reinitialize` | Admin |
| 12 | GET | `/api/payment-gateway/test-users` | Dev/Admin |
| 13 | GET | `/api/payment-gateway/test-user/:userId` | Dev/Admin |

---

## 🧪 Quick Test URLs

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

## 🔗 Frontend Integration URLs

### JavaScript/Fetch Examples

**Create Order:**
```javascript
const response = await fetch('http://localhost:5000/api/payment-gateway/order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({ amount: 100.50 })
});
```

**Verify Payment:**
```javascript
const response = await fetch('http://localhost:5000/api/payment-gateway/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    orderId: 'order_xxx',
    paymentId: 'pay_xxx',
    signature: 'signature_xxx'
  })
});
```

**Get Status:**
```javascript
const response = await fetch('http://localhost:5000/api/payment-gateway/status');
const data = await response.json();
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

## 📚 Related Documentation

- **Complete API List:** `RAZORPAY_API_LIST.md`
- **API Endpoints:** `RAZORPAY_API_ENDPOINTS.md`
- **Integration Guide:** `RAZORPAY_INTEGRATION_GUIDE.md`

---

**All URLs:** 13 Razorpay API endpoints



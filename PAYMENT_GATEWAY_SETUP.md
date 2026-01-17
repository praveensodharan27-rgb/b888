# Payment Gateway Setup Guide

## Quick Start

The Payment Gateway API has been successfully created with support for 4 test users in development mode.

## Setup Steps

### 1. Generate Prisma Client

After adding the `PaymentOrder` model to your Prisma schema, generate the Prisma client:

```bash
cd backend
npm run prisma:generate
```

If you encounter permission errors, try:
- Close any running Node.js processes
- Restart your terminal/IDE
- Run the command again

### 2. Environment Variables

Add these to your `backend/.env` file:

```env
# Payment Gateway Configuration
PAYMENT_GATEWAY_DEV_MODE=true  # Set to false for production

# Razorpay Configuration (for production)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### 3. Start the Server

```bash
cd backend
npm run dev
```

The payment gateway routes will be available at:
- Base URL: `/api/payment-gateway`
- Status: `GET /api/payment-gateway/status`

## Test Users (Development Mode)

When `PAYMENT_GATEWAY_DEV_MODE=true`, you can use these 4 test users:

1. **Test User 1**
   - ID: `test_user_1`
   - Email: `testuser1@example.com`
   - Balance: ₹100.00

2. **Test User 2**
   - ID: `test_user_2`
   - Email: `testuser2@example.com`
   - Balance: ₹50.00

3. **Test User 3**
   - ID: `test_user_3`
   - Email: `testuser3@example.com`
   - Balance: ₹200.00

4. **Test User 4**
   - ID: `test_user_4`
   - Email: `testuser4@example.com`
   - Balance: ₹0.00

## API Endpoints

All endpoints are documented in `PAYMENT_GATEWAY_API.md`. Quick reference:

- `POST /api/payment-gateway/order` - Create payment order
- `POST /api/payment-gateway/verify` - Verify payment
- `POST /api/payment-gateway/refund` - Process refund
- `GET /api/payment-gateway/order/:orderId` - Get order status
- `GET /api/payment-gateway/payments` - Get payment history
- `GET /api/payment-gateway/test-users` - Get test users (dev mode)
- `GET /api/payment-gateway/status` - Get gateway status

## Testing

### Test Payment Flow (Development Mode)

1. **Create Order:**
```bash
curl -X POST http://localhost:5000/api/payment-gateway/order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 100.50,
    "notes": {
      "description": "Test payment"
    }
  }'
```

2. **Verify Payment:**
```bash
curl -X POST http://localhost:5000/api/payment-gateway/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "orderId": "order_1234567890_abc123",
    "paymentId": "pay_test_123",
    "signature": "test_signature"
  }'
```

## Files Created

1. **backend/services/paymentGateway.js** - Payment gateway service logic
2. **backend/routes/payment-gateway.js** - API routes
3. **PAYMENT_GATEWAY_API.md** - Complete API documentation
4. **PAYMENT_GATEWAY_SETUP.md** - This setup guide

## Database Schema

The `PaymentOrder` model has been added to:
- `backend/prisma/schema.prisma`
- `backend/prisma/schema.mongodb.prisma`

After generating Prisma client, the model will be available for use.

## Features

✅ Development mode with mock payments
✅ Production mode with Razorpay integration
✅ 4 test users for development
✅ Payment order creation
✅ Payment verification
✅ Refund processing
✅ Payment history
✅ Order status tracking
✅ Comprehensive error handling
✅ Input validation

## Next Steps

1. Generate Prisma client: `npm run prisma:generate`
2. Test the endpoints using the examples above
3. Integrate with your frontend application
4. Set `PAYMENT_GATEWAY_DEV_MODE=false` when deploying to production

## Support

For detailed API documentation, see `PAYMENT_GATEWAY_API.md`.


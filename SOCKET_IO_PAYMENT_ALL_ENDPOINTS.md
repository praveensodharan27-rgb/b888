# Complete API Documentation: Socket.IO, Payment & All Endpoints

**Base URL:** `http://localhost:5000/api`  
**Socket.IO URL:** `http://localhost:5000` (WebSocket)

---

## 📊 Quick Stats
- **Total REST Endpoints:** 256+
- **Socket.IO Events:** 15+ (Client → Server) + 10+ (Server → Client)
- **Payment Endpoints:** 13
- **Public Endpoints:** ~45
- **Authenticated Endpoints:** ~195
- **Admin Endpoints:** ~42

---

## 🔌 SOCKET.IO REAL-TIME EVENTS

### Connection Setup

**Connection URL:** `ws://localhost:5000` or `http://localhost:5000`

**Authentication:**
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token' // JWT token from login
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});
```

**Frontend Helper (Already Implemented):**
```typescript
// frontend/lib/socket.ts
import { getSocket } from '@/lib/socket';
const socket = getSocket(); // Automatically handles auth
```

---

### 📤 CLIENT → SERVER EVENTS (Send Events)

#### 1. `join_room`
Join a specific chat room to receive messages.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011"
}
```

**Example:**
```javascript
socket.emit('join_room', '507f1f77bcf86cd799439011');
```

---

#### 2. `leave_room`
Leave a specific chat room.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011"
}
```

**Example:**
```javascript
socket.emit('leave_room', '507f1f77bcf86cd799439011');
```

---

#### 3. `send_message`
Send a chat message in real-time.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011",
  "content": "Hello! How are you?",
  "type": "TEXT",
  "imageUrl": "https://example.com/image.jpg"
}
```

**Message Types:**
- `"TEXT"` - Text message (default)
- `"IMAGE"` - Image message (requires `imageUrl`)
- `"SYSTEM"` - System message

**Example:**
```javascript
socket.emit('send_message', {
  roomId: '507f1f77bcf86cd799439011',
  content: 'Hello!',
  type: 'TEXT'
});
```

**Response:** Server emits `new_message` to all users in the room.

---

#### 4. `typing`
Notify users in a room that you are typing.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011"
}
```

**Example:**
```javascript
socket.emit('typing', { roomId: '507f1f77bcf86cd799439011' });
```

**Response:** Server emits `user_typing` to other users in the room.

---

#### 5. `stop_typing`
Notify users that you stopped typing.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011"
}
```

**Example:**
```javascript
socket.emit('stop_typing', { roomId: '507f1f77bcf86cd799439011' });
```

**Response:** Server emits `user_stopped_typing` to other users in the room.

---

#### 6. `webrtc_initiate_call`
Initiate a WebRTC video/audio call.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011",
  "receiverId": "507f1f77bcf86cd799439012",
  "isAudioOnly": false
}
```

**Example:**
```javascript
socket.emit('webrtc_initiate_call', {
  roomId: '507f1f77bcf86cd799439011',
  receiverId: '507f1f77bcf86cd799439012',
  isAudioOnly: false // true for audio-only call
});
```

**Response:** Server emits `webrtc_incoming_call` to receiver.

---

#### 7. `webrtc_offer`
Send WebRTC SDP offer.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011",
  "offer": { /* WebRTC SDP offer object */ },
  "receiverId": "507f1f77bcf86cd799439012"
}
```

**Example:**
```javascript
socket.emit('webrtc_offer', {
  roomId: '507f1f77bcf86cd799439011',
  offer: offer, // RTCPeerConnection offer
  receiverId: '507f1f77bcf86cd799439012'
});
```

**Response:** Server forwards offer to receiver via `webrtc_offer` event.

---

#### 8. `webrtc_answer`
Send WebRTC SDP answer.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011",
  "answer": { /* WebRTC SDP answer object */ },
  "receiverId": "507f1f77bcf86cd799439012"
}
```

**Example:**
```javascript
socket.emit('webrtc_answer', {
  roomId: '507f1f77bcf86cd799439011',
  answer: answer, // RTCPeerConnection answer
  receiverId: '507f1f77bcf86cd799439012'
});
```

**Response:** Server forwards answer to caller via `webrtc_answer` event.

---

#### 9. `webrtc_ice_candidate`
Send WebRTC ICE candidate.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011",
  "candidate": { /* WebRTC ICE candidate object */ },
  "receiverId": "507f1f77bcf86cd799439012"
}
```

**Example:**
```javascript
socket.emit('webrtc_ice_candidate', {
  roomId: '507f1f77bcf86cd799439011',
  candidate: candidate, // RTCIceCandidate
  receiverId: '507f1f77bcf86cd799439012'
});
```

**Response:** Server forwards ICE candidate to receiver via `webrtc_ice_candidate` event.

---

#### 10. `webrtc_reject_call`
Reject an incoming WebRTC call.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011",
  "callerId": "507f1f77bcf86cd799439012"
}
```

**Example:**
```javascript
socket.emit('webrtc_reject_call', {
  roomId: '507f1f77bcf86cd799439011',
  callerId: '507f1f77bcf86cd799439012'
});
```

**Response:** Server emits `webrtc_call_rejected` to caller.

---

#### 11. `webrtc_end_call`
End an active WebRTC call.

**Payload:**
```json
{
  "roomId": "507f1f77bcf86cd799439011",
  "receiverId": "507f1f77bcf86cd799439012"
}
```

**Example:**
```javascript
socket.emit('webrtc_end_call', {
  roomId: '507f1f77bcf86cd799439011',
  receiverId: '507f1f77bcf86cd799439012'
});
```

**Response:** Server emits `webrtc_call_ended` to receiver.

---

### 📥 SERVER → CLIENT EVENTS (Listen Events)

#### 1. `connect`
Socket successfully connected.

**Payload:**
```json
{
  "socketId": "abc123"
}
```

**Example:**
```javascript
socket.on('connect', () => {
  console.log('✅ Connected to Socket.IO');
});
```

---

#### 2. `disconnect`
Socket disconnected.

**Example:**
```javascript
socket.on('disconnect', () => {
  console.log('❌ Disconnected from Socket.IO');
});
```

---

#### 3. `connect_error`
Connection error occurred.

**Payload:**
```json
{
  "message": "Authentication error"
}
```

**Example:**
```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});
```

---

#### 4. `new_message`
New message received in a room.

**Payload:**
```json
{
  "id": "msg123",
  "content": "Hello!",
  "type": "TEXT",
  "senderId": "user123",
  "receiverId": "user456",
  "roomId": "room123",
  "createdAt": "2024-01-15T10:30:00Z",
  "sender": {
    "id": "user123",
    "name": "John Doe",
    "avatar": "https://example.com/avatar.jpg"
  }
}
```

**Example:**
```javascript
socket.on('new_message', (message) => {
  console.log('New message:', message);
  // Update UI with new message
});
```

---

#### 5. `user_typing`
User is typing in a room.

**Payload:**
```json
{
  "userId": "user123",
  "roomId": "room123"
}
```

**Example:**
```javascript
socket.on('user_typing', ({ userId, roomId }) => {
  console.log(`User ${userId} is typing in room ${roomId}`);
  // Show typing indicator
});
```

---

#### 6. `user_stopped_typing`
User stopped typing.

**Payload:**
```json
{
  "userId": "user123",
  "roomId": "room123"
}
```

**Example:**
```javascript
socket.on('user_stopped_typing', ({ userId, roomId }) => {
  console.log(`User ${userId} stopped typing`);
  // Hide typing indicator
});
```

---

#### 7. `user_online`
User came online.

**Payload:**
```json
{
  "userId": "user123"
}
```

**Example:**
```javascript
socket.on('user_online', ({ userId }) => {
  console.log(`User ${userId} is now online`);
  // Update online status
});
```

---

#### 8. `user_offline`
User went offline.

**Payload:**
```json
{
  "userId": "user123"
}
```

**Example:**
```javascript
socket.on('user_offline', ({ userId }) => {
  console.log(`User ${userId} is now offline`);
  // Update offline status
});
```

---

#### 9. `notification`
Real-time notification received.

**Payload:**
```json
{
  "id": "notif123",
  "title": "New Message",
  "message": "You have a new message from John Doe",
  "type": "new_message",
  "link": "/chat/room123",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Example:**
```javascript
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
  // Show notification toast
});
```

---

#### 10. `webrtc_incoming_call`
Incoming WebRTC call.

**Payload:**
```json
{
  "roomId": "room123",
  "callerId": "user123",
  "callerName": "John Doe",
  "isAudioOnly": false
}
```

**Example:**
```javascript
socket.on('webrtc_incoming_call', ({ roomId, callerId, callerName, isAudioOnly }) => {
  console.log(`Incoming ${isAudioOnly ? 'audio' : 'video'} call from ${callerName}`);
  // Show call UI
});
```

---

#### 11. `webrtc_offer`
WebRTC offer received.

**Payload:**
```json
{
  "offer": { /* WebRTC SDP offer */ },
  "callerId": "user123",
  "roomId": "room123"
}
```

**Example:**
```javascript
socket.on('webrtc_offer', ({ offer, callerId, roomId }) => {
  // Handle WebRTC offer
  // Set remote description and create answer
});
```

---

#### 12. `webrtc_answer`
WebRTC answer received.

**Payload:**
```json
{
  "answer": { /* WebRTC SDP answer */ },
  "roomId": "room123"
}
```

**Example:**
```javascript
socket.on('webrtc_answer', ({ answer, roomId }) => {
  // Handle WebRTC answer
  // Set remote description
});
```

---

#### 13. `webrtc_ice_candidate`
WebRTC ICE candidate received.

**Payload:**
```json
{
  "candidate": { /* WebRTC ICE candidate */ },
  "roomId": "room123"
}
```

**Example:**
```javascript
socket.on('webrtc_ice_candidate', ({ candidate, roomId }) => {
  // Handle ICE candidate
  // Add candidate to peer connection
});
```

---

#### 14. `webrtc_call_rejected`
Call was rejected.

**Payload:**
```json
{
  "roomId": "room123"
}
```

**Example:**
```javascript
socket.on('webrtc_call_rejected', ({ roomId }) => {
  console.log('Call rejected');
  // Hide call UI
});
```

---

#### 15. `webrtc_call_ended`
Call ended.

**Payload:**
```json
{
  "roomId": "room123"
}
```

**Example:**
```javascript
socket.on('webrtc_call_ended', ({ roomId }) => {
  console.log('Call ended');
  // Clean up call UI
});
```

---

#### 16. `error`
Error occurred.

**Payload:**
```json
{
  "message": "Room not found"
}
```

**Example:**
```javascript
socket.on('error', ({ message }) => {
  console.error('Socket error:', message);
  // Show error to user
});
```

---

## 💳 PAYMENT GATEWAY ENDPOINTS (13 endpoints)

### 1. Create Payment Order
**`POST /api/payment-gateway/order`** (Auth Required)

Create a new payment order with Razorpay.

**Request Body:**
```json
{
  "amount": 1000.00,
  "currency": "INR",
  "notes": {
    "order_type": "premium_ad",
    "ad_id": "ad123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment order created successfully",
  "order": {
    "orderId": "order_abc123",
    "userId": "user123",
    "amount": 1000.00,
    "currency": "INR",
    "status": "created",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "razorpayOrder": {
    "id": "order_abc123",
    "amount": 100000,
    "currency": "INR",
    "status": "created",
    "key": "rzp_test_1234567890"
  },
  "razorpayKeyId": "rzp_test_1234567890"
}
```

---

### 2. Verify Payment
**`POST /api/payment-gateway/verify`** (Auth Required)

Verify payment after successful Razorpay checkout.

**Request Body:**
```json
{
  "orderId": "order_abc123",
  "paymentId": "pay_xyz789",
  "signature": "signature_hash_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "order": {
    "orderId": "order_abc123",
    "status": "paid",
    "paymentId": "pay_xyz789",
    "paidAt": "2024-01-15T10:35:00Z"
  }
}
```

---

### 3. Process Refund
**`POST /api/payment-gateway/refund`** (Auth Required)

Process a refund for a paid order.

**Request Body:**
```json
{
  "orderId": "order_abc123",
  "amount": 500.00,
  "reason": "Customer requested refund"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Refund processed successfully",
  "refund": {
    "id": "rfnd_abc123",
    "amount": 50000,
    "status": "processed"
  }
}
```

---

### 4. Cancel Payment Order
**`POST /api/payment-gateway/cancel`** (Auth Required)

Cancel an unpaid payment order.

**Request Body:**
```json
{
  "orderId": "order_abc123"
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

### 5. Capture Authorized Payment
**`POST /api/payment-gateway/capture`** (Auth Required)

Capture an authorized payment (for authorized payments).

**Request Body:**
```json
{
  "paymentId": "pay_xyz789",
  "amount": 1000.00
}
```

**Response:**
```json
{
  "success": true,
  "captured": true,
  "amount": 100000
}
```

---

### 6. Get Order Status
**`GET /api/payment-gateway/order/:orderId`** (Auth Required)

Get status of a payment order.

**Response:**
```json
{
  "success": true,
  "order": {
    "orderId": "order_abc123",
    "status": "paid",
    "amount": 1000.00,
    "currency": "INR",
    "paymentId": "pay_xyz789",
    "paidAt": "2024-01-15T10:35:00Z"
  }
}
```

---

### 7. Get Payment History
**`GET /api/payment-gateway/payments`** (Auth Required)

Get user's payment history with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "payments": [
    {
      "orderId": "order_abc123",
      "amount": 1000.00,
      "status": "paid",
      "paidAt": "2024-01-15T10:35:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

### 8. Get Payment Details
**`GET /api/payment-gateway/payment/:paymentId`** (Auth Required)

Get detailed information about a specific payment.

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "pay_xyz789",
    "amount": 100000,
    "currency": "INR",
    "status": "captured",
    "method": "card",
    "createdAt": "2024-01-15T10:35:00Z"
  }
}
```

---

### 9. Get Razorpay Order Details
**`GET /api/payment-gateway/razorpay-order/:orderId`** (Auth Required)

Get Razorpay order details directly from Razorpay API.

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "order_abc123",
    "amount": 100000,
    "currency": "INR",
    "status": "paid",
    "receipt": "receipt_123"
  }
}
```

---

### 10. Payment Gateway Status
**`GET /api/payment-gateway/status`** (Public)

Get payment gateway status and configuration.

**Response:**
```json
{
  "success": true,
  "devMode": false,
  "razorpayConfigured": true,
  "razorpayKeyId": "rzp_test_12...",
  "message": "Payment gateway running in production mode with Razorpay"
}
```

---

### 11. Razorpay Webhook
**`POST /api/payment-gateway/webhook`** (Public, Signature Verified)

Razorpay webhook handler for payment events.

**Headers:**
- `x-razorpay-signature`: Webhook signature

**Supported Events:**
- `payment.captured` - Payment captured
- `payment.failed` - Payment failed
- `order.paid` - Order paid
- `refund.created` - Refund created

**Response:**
```json
{
  "success": true,
  "message": "Webhook processed"
}
```

---

### 12. Get Test Users (Dev Only)
**`GET /api/payment-gateway/test-users`** (Auth Required, Dev/Admin)

Get list of test users for development mode.

**Response:**
```json
{
  "success": true,
  "devMode": true,
  "testUsers": [
    {
      "userId": "user123",
      "name": "Test User",
      "email": "test@example.com"
    }
  ]
}
```

---

### 13. Get Test User Info (Dev Only)
**`GET /api/payment-gateway/test-user/:userId`** (Auth Required, Dev/Admin)

Get information about a specific test user.

**Response:**
```json
{
  "success": true,
  "devMode": true,
  "testUser": {
    "userId": "user123",
    "name": "Test User",
    "email": "test@example.com"
  }
}
```

---

### 14. Reinitialize Razorpay (Admin Only)
**`POST /api/payment-gateway/reinitialize`** (Auth Required, Admin)

Reinitialize Razorpay with current environment variables.

**Response:**
```json
{
  "success": true,
  "message": "Razorpay reinitialized successfully",
  "razorpayConfigured": true
}
```

---

## 📋 ALL API ENDPOINTS (256+)

### Quick Reference by Category

| Category | Count | Base Path |
|----------|-------|-----------|
| **Authentication** | 12 | `/api/auth` |
| **User Management** | 20 | `/api/user` |
| **Ads** | 22 | `/api/ads` |
| **Categories** | 5 | `/api/categories` |
| **Locations** | 2 | `/api/locations` |
| **Payment Gateway** | 13 | `/api/payment-gateway` |
| **Premium Ads** | 6 | `/api/premium` |
| **Business Packages** | 5 | `/api/business-package` |
| **Search** | 3 | `/api/search` |
| **Search Alerts** | 5 | `/api/search-alerts` |
| **Chat** | 11 | `/api/chat` |
| **Follow** | 6 | `/api/follow` |
| **Block** | 4 | `/api/block` |
| **Contact Request** | 5 | `/api/contact-request` |
| **Wallet** | 8 | `/api/wallet` |
| **Referral** | 4 | `/api/referral` |
| **AI Services** | 4 | `/api/ai` |
| **Geocoding** | 3 | `/api/geocoding` |
| **Banners** | 2 | `/api/banners` |
| **Interstitial Ads** | 3 | `/api/interstitial-ads` |
| **Push Notifications** | 4 | `/api/push` |
| **Admin** | 42+ | `/api/admin` |
| **Moderation** | 3 | `/api/moderation` |
| **Auth Settings** | 2 | `/api/auth-settings` |
| **Test** | 1 | `/api/test` |
| **Session Management** | 8 | `/api/session` |
| **System** | 7 | `/api/system` |

**Total: 256+ REST Endpoints + 25+ Socket.IO Events**

---

## 📚 Complete Endpoint Lists

For complete details on all REST API endpoints, see:
- **Complete List:** `ALL_ENDPOINTS_LIST.md`
- **Detailed Reference:** `ALL_API_ENDPOINTS_COMPLETE.md`
- **Quick Reference:** `API_ENDPOINTS_QUICK_REFERENCE.md`

---

## 🔑 Authentication

### REST API Authentication
Most endpoints require JWT Bearer token:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Socket.IO Authentication
Pass JWT token in connection auth:
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

---

## 📝 Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message"
}
```

---

## 🚀 Quick Start Examples

### Socket.IO Chat Example
```javascript
import { getSocket } from '@/lib/socket';

const socket = getSocket();

// Join room
socket.emit('join_room', 'room123');

// Send message
socket.emit('send_message', {
  roomId: 'room123',
  content: 'Hello!',
  type: 'TEXT'
});

// Listen for messages
socket.on('new_message', (message) => {
  console.log('New message:', message);
});

// Typing indicator
socket.emit('typing', { roomId: 'room123' });
socket.on('user_typing', ({ userId }) => {
  console.log(`User ${userId} is typing`);
});
```

### Payment Example
```javascript
// Create order
const response = await fetch('/api/payment-gateway/order', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 1000.00,
    currency: 'INR',
    notes: { order_type: 'premium_ad' }
  })
});

const { order, razorpayOrder, razorpayKeyId } = await response.json();

// Initialize Razorpay checkout
const options = {
  key: razorpayKeyId,
  amount: razorpayOrder.amount,
  currency: razorpayOrder.currency,
  order_id: razorpayOrder.id,
  handler: async function(response) {
    // Verify payment
    await fetch('/api/payment-gateway/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId: order.orderId,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature
      })
    });
  }
};

const rzp = new Razorpay(options);
rzp.open();
```

---

**Last Updated:** 2024-01-15


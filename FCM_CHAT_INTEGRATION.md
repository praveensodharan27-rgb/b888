# FCM + WebSocket Chat Integration

## 📋 Overview

Chat system uses:
- **WebSocket (Socket.IO)** - For instant messaging when users are online
- **FCM Push Notifications** - For offline users to receive chat notifications

## 🔧 Setup

### 1. Install Firebase Admin SDK

```bash
cd backend
npm install firebase-admin
```

### 2. Configure Firebase Admin

Add to `backend/.env`:

**Option 1: Service Account File Path**
```env
FIREBASE_SERVICE_ACCOUNT_PATH=./path/to/serviceAccountKey.json
```

**Option 2: Service Account JSON (as string)**
```env
FIREBASE_CONFIG={"type":"service_account","project_id":"olxapp-71912",...}
```

**Option 3: Default Credentials (GCP/Cloud Run)**
- No config needed if running on GCP with default credentials

### 3. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **olxapp-71912**
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file
6. Place it in `backend/` directory (or set path in `.env`)

**⚠️ Important:** Add `serviceAccountKey.json` to `.gitignore`!

## 🚀 How It Works

### Message Flow

1. **User sends message via WebSocket**
   - Message saved to database
   - Broadcasted to room via WebSocket

2. **Check if receiver is online**
   - If **online** → Message delivered via WebSocket ✅
   - If **offline** → Send FCM push notification 📱

3. **FCM Notification Sent**
   - Gets user's FCM tokens from `MobileDevice` table
   - Sends notification to all user's devices
   - Invalid tokens are automatically removed

### Code Flow

```javascript
// In socket.js - send_message handler
const receiverSockets = userSockets.get(receiverId) || [];
const isReceiverOnline = receiverSockets.length > 0;

if (!isReceiverOnline) {
  // Send FCM notification
  await sendFCMNotificationToUser(receiverId, {
    title: senderName,
    body: messageContent,
    type: 'chat_message'
  }, {
    type: 'chat_message',
    roomId: roomId,
    messageId: message.id,
    url: `/chat/${roomId}`
  });
}
```

## 📱 Notification Payload

### For Flutter Apps

```json
{
  "notification": {
    "title": "John Doe",
    "body": "Hello, how are you?"
  },
  "data": {
    "type": "chat_message",
    "roomId": "room-123",
    "messageId": "msg-456",
    "senderId": "user-789",
    "senderName": "John Doe",
    "content": "Hello, how are you?",
    "messageType": "TEXT",
    "url": "/chat/room-123"
  }
}
```

### Handling in Flutter

```dart
// In FirebaseService background handler
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  if (message.data['type'] == 'chat_message') {
    final roomId = message.data['roomId'];
    // Navigate to chat room
    navigatorKey.currentState?.pushNamed('/chat', arguments: {'roomId': roomId});
  }
}
```

## 🧪 Testing

### Test FCM Notification

```bash
# Send test chat notification
curl -X POST http://localhost:5000/api/push/mobile/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Chat",
    "message": "This is a test chat notification",
    "data": {
      "type": "chat_message",
      "roomId": "test-room-123"
    }
  }'
```

### Test Offline Scenario

1. User A and User B both logged in
2. User B closes app (goes offline)
3. User A sends message
4. User B should receive FCM notification
5. User B opens app → Message appears in chat

## 🔍 Troubleshooting

### FCM Not Working?

1. **Check Firebase Admin initialization**
   - Look for `✅ Firebase Admin initialized` in logs
   - If not, check service account configuration

2. **Check FCM tokens**
   ```sql
   SELECT userId, fcmToken, deviceType, isActive 
   FROM MobileDevice 
   WHERE fcmToken IS NOT NULL;
   ```

3. **Check logs**
   - Look for `📱 FCM notification sent` in backend logs
   - Check for error messages

### WebSocket Not Working?

1. **Check user is online**
   - Look for `User connected: {userId}` in logs
   - Check `userSockets` Map has user

2. **Test WebSocket connection**
   - Open browser console
   - Check Socket.IO connection status

## 📊 Monitoring

### Check Online Users

```javascript
// In socket.js
console.log('Online users:', Array.from(userSockets.keys()));
```

### Check FCM Status

```javascript
const { isInitialized } = require('./utils/fcmService');
console.log('FCM initialized:', isInitialized());
```

## 🔒 Security

1. **Service Account Key**
   - Never commit to git
   - Use environment variables
   - Rotate keys regularly

2. **Token Validation**
   - Invalid tokens are automatically removed
   - Tokens are user-specific

## 📚 API Reference

### FCM Service Functions

- `sendFCMNotificationToUser(userId, notification, data)` - Send to all user's devices
- `sendFCMNotificationToToken(token, notification, data)` - Send to specific token
- `isInitialized()` - Check if FCM is initialized

---

**Last Updated:** 2024-01-15



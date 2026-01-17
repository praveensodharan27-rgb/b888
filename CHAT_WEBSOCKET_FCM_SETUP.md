# Chat System: WebSocket + FCM Integration

## ✅ Setup Complete!

Chat system now uses:
- **WebSocket (Socket.IO)** - Instant messaging for online users
- **FCM Push Notifications** - Notifications for offline users

## 🔧 Configuration Required

### 1. Firebase Admin SDK Setup

Add to `backend/.env`:

```env
# Option 1: Service Account File Path
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json

# OR Option 2: Service Account JSON (as string)
FIREBASE_CONFIG={"type":"service_account","project_id":"olxapp-71912",...}
```

### 2. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **olxapp-71912**
3. **Project Settings** → **Service Accounts** tab
4. Click **Generate New Private Key**
5. Download JSON file
6. Save as `backend/serviceAccountKey.json`

**⚠️ Important:** Add to `.gitignore`:
```
backend/serviceAccountKey.json
```

## 🚀 How It Works

### Message Flow

```
User A sends message
    ↓
Message saved to database
    ↓
Broadcasted via WebSocket to room
    ↓
Check if User B is online?
    ├─ YES → Message delivered via WebSocket ✅
    └─ NO  → Send FCM push notification 📱
```

### Code Implementation

**File:** `backend/socket/socket.js`

```javascript
// Check if receiver is online
const receiverSockets = userSockets.get(receiverId) || [];
const isReceiverOnline = receiverSockets.length > 0;

if (!isReceiverOnline) {
  // Send FCM notification to offline user
  await sendFCMNotificationToUser(receiverId, {
    title: senderName,
    body: messageContent,
    type: 'chat_message'
  });
}
```

## 📱 Testing

### Test Online Chat (WebSocket)

1. Open two browser windows
2. Login as User A in window 1
3. Login as User B in window 2
4. User A sends message
5. User B receives instantly via WebSocket ✅

### Test Offline Chat (FCM)

1. User A and User B both logged in
2. User B closes app/browser (goes offline)
3. User A sends message
4. Check backend logs: `📱 FCM notification sent to offline user`
5. User B receives FCM push notification on mobile device

## 🔍 Verification

### Check FCM is Initialized

Look for in backend logs:
```
✅ Firebase Admin initialized
```

### Check User Online Status

Backend logs show:
```
✅ Receiver {userId} is online, message delivered via WebSocket
📱 FCM notification sent to offline user: {userId}
```

## 📊 Database

FCM tokens are stored in `MobileDevice` table:
- `fcmToken` - Firebase Cloud Messaging token
- `deviceType` - 'android', 'ios', or 'web'
- `isActive` - Whether device is active
- `userId` - User who owns the device

## 🐛 Troubleshooting

### FCM Not Sending?

1. **Check Firebase Admin initialization**
   ```bash
   # Look for in logs:
   ✅ Firebase Admin initialized
   ```

2. **Check FCM tokens exist**
   ```sql
   SELECT userId, fcmToken, deviceType 
   FROM MobileDevice 
   WHERE fcmToken IS NOT NULL AND isActive = true;
   ```

3. **Check service account key**
   - File exists at path specified in `.env`
   - JSON is valid
   - Has correct permissions

### WebSocket Not Working?

1. **Check Socket.IO connection**
   - Browser console shows: `✅ Socket.IO connected`
   - Backend logs show: `User connected: {userId}`

2. **Check user is in room**
   - User must call `join_room` event
   - Backend logs show: `User {userId} joined room {roomId}`

## 📚 Files Modified

1. **`backend/utils/fcmService.js`** - New FCM service
2. **`backend/socket/socket.js`** - Added FCM integration
3. **`backend/package.json`** - Added `firebase-admin` dependency

## 🎯 Next Steps

1. ✅ Install Firebase Admin SDK (done)
2. ⏳ Add Firebase service account key to `.env`
3. ⏳ Restart backend server
4. ⏳ Test with Flutter app

---

**Status:** ✅ Code integrated, waiting for Firebase service account configuration



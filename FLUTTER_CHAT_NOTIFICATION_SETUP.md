# Flutter Chat Notification Setup (WhatsApp-style)

## ✅ Implementation Complete

Chat notifications now work like WhatsApp:
- ✅ Sender name as notification title
- ✅ Message preview as notification body
- ✅ `chatId` in FCM data payload
- ✅ Direct navigation to chat screen on tap

## 📱 Flutter Integration

### 1. Update main.dart

```dart
import 'package:flutter/material.dart';
import 'services/firebase_service.dart';

// Global navigator key for navigation
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  await FirebaseService.initialize(
    apiBaseUrl: 'http://localhost:5000/api',
  );
  
  // Set up chat notification handler
  FirebaseService.setChatNotificationHandler((chatId) {
    navigatorKey.currentState?.pushNamed(
      '/chat',
      arguments: {'chatId': chatId, 'roomId': chatId}
    );
  });
  
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey, // Important!
      title: 'SellIt',
      routes: {
        '/chat': (context) => ChatScreen(),
        // ... other routes
      },
      home: HomeScreen(),
    );
  }
}
```

### 2. Chat Screen Route

```dart
class ChatScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    final chatId = args?['chatId'] ?? args?['roomId'];
    
    return Scaffold(
      appBar: AppBar(title: Text('Chat')),
      body: ChatMessagesWidget(chatId: chatId),
    );
  }
}
```

### 3. Handle Notification Clicks

The `FirebaseService` automatically handles:
- **Foreground**: Shows notification, navigates on tap
- **Background**: Navigates when app opened from notification
- **Terminated**: Navigates when app opened from notification

## 📦 FCM Payload Structure

### Backend Sends:

```json
{
  "notification": {
    "title": "John Doe",
    "body": "Hello, how are you?"
  },
  "data": {
    "type": "chat_message",
    "chatId": "room-123",
    "roomId": "room-123",
    "messageId": "msg-456",
    "senderId": "user-789",
    "senderName": "John Doe",
    "content": "Hello, how are you?",
    "messageType": "TEXT"
  }
}
```

### Flutter Receives:

```dart
RemoteMessage message;
String chatId = message.data['chatId']; // ✅ Available
String type = message.data['type']; // 'chat_message'
```

## 🎨 WhatsApp-style Features

### Notification Appearance

- **Title**: Sender name (e.g., "John Doe")
- **Body**: Message preview (truncated to 100 chars)
- **Icon**: Custom chat icon
- **Color**: WhatsApp green (#25D366)
- **Sound**: Default notification sound
- **Grouping**: Notifications grouped by chatId

### Message Types

- **TEXT**: Shows message content
- **IMAGE**: Shows "📷 Image"
- **AUDIO**: Shows "🎵 Audio"
- **VIDEO**: Shows "🎥 Video"
- **FILE**: Shows "📎 File"

## 🔔 Android Notification Channel

Create custom notification channel in `main.dart`:

```dart
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

final FlutterLocalNotificationsPlugin localNotifications = 
    FlutterLocalNotificationsPlugin();

Future<void> setupNotificationChannel() async {
  const AndroidNotificationChannel channel = AndroidNotificationChannel(
    'chat_messages', // Must match backend channelId
    'Chat Messages',
    description: 'Notifications for chat messages',
    importance: Importance.high,
    playSound: true,
    enableVibration: true,
  );

  await localNotifications
      .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(channel);
}
```

## 🧪 Testing

### Test Notification

1. User A sends message to User B
2. User B is offline
3. User B receives FCM notification:
   - Title: "User A"
   - Body: Message preview
   - Data: Contains `chatId`

### Test Navigation

1. User B taps notification
2. App opens (or comes to foreground)
3. Chat screen opens with correct `chatId`
4. Messages load for that chat

## 📝 Files Modified

1. **`backend/socket/socket.js`** - Added `chatId` to FCM payload
2. **`backend/utils/fcmService.js`** - WhatsApp-style notification formatting
3. **`flutter_firebase_service.dart`** - Chat notification handler

## 🔍 Verification

### Check FCM Payload

Backend logs show:
```
📱 FCM notification sent to offline user: {userId} (chatId: {roomId})
```

### Check Flutter Receives chatId

Flutter logs show:
```
📱 Handle notification tap: {chatId: room-123, ...}
🔔 Opening chat: room-123
```

## 🎯 Key Points

1. ✅ `chatId` is in FCM data payload
2. ✅ Notification click opens chat screen directly
3. ✅ WhatsApp-style notification appearance
4. ✅ Works in foreground, background, and terminated states

---

**Status:** ✅ Ready to use!



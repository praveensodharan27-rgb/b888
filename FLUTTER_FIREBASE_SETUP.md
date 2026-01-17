# Flutter Firebase Cloud Messaging (FCM) Integration Guide

Complete guide for integrating Firebase push notifications in your Flutter app with the SellIt backend API.

## 📋 Prerequisites

1. Flutter SDK installed
2. Firebase project created (same project: **olxapp-71912**)
3. Android/iOS apps registered in Firebase Console
4. Backend API running at `http://localhost:5000` (or your production URL)

## 🔧 Setup Steps

### 1. Add Firebase Dependencies

Add to `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  firebase_core: ^2.24.2
  firebase_messaging: ^14.7.9
  http: ^1.1.0
  shared_preferences: ^2.2.2
  device_info_plus: ^9.1.1
```

Run:
```bash
flutter pub get
```

### 2. Firebase Configuration Files

#### Android Setup

1. Download `google-services.json` from Firebase Console
2. Place it in `android/app/google-services.json`
3. Update `android/build.gradle`:

```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

4. Update `android/app/build.gradle`:

```gradle
apply plugin: 'com.google.gms.google-services'

android {
    defaultConfig {
        minSdkVersion 21
    }
}
```

#### iOS Setup

1. Download `GoogleService-Info.plist` from Firebase Console
2. Add it to `ios/Runner/` in Xcode
3. Update `ios/Podfile`:

```ruby
platform :ios, '12.0'
```

4. Enable Push Notifications capability in Xcode:
   - Open `ios/Runner.xcworkspace`
   - Select Runner target → Signing & Capabilities
   - Click "+ Capability" → Push Notifications

### 3. Initialize Firebase

Create `lib/services/firebase_service.dart`:

```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

class FirebaseService {
  static FirebaseMessaging? _messaging;
  static String? _fcmToken;
  
  // Initialize Firebase
  static Future<void> initialize() async {
    await Firebase.initializeApp();
    _messaging = FirebaseMessaging.instance;
    
    // Request permission
    NotificationSettings settings = await _messaging!.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );
    
    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print('✅ User granted permission');
      
      // Get FCM token
      await getFCMToken();
      
      // Setup message handlers
      setupMessageHandlers();
    } else {
      print('❌ User declined permission');
    }
  }
  
  // Get FCM token
  static Future<String?> getFCMToken() async {
    try {
      _fcmToken = await _messaging?.getToken();
      print('📱 FCM Token: $_fcmToken');
      return _fcmToken;
    } catch (e) {
      print('❌ Error getting FCM token: $e');
      return null;
    }
  }
  
  // Setup message handlers
  static void setupMessageHandlers() {
    // Foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('📨 Foreground message received:');
      print('   Title: ${message.notification?.title}');
      print('   Body: ${message.notification?.body}');
      print('   Data: ${message.data}');
      
      // Show local notification (you'll need flutter_local_notifications)
      // _showLocalNotification(message);
    });
    
    // Background messages (must be top-level function)
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
    
    // Notification tap (when app is in background/terminated)
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('🔔 Notification opened app:');
      print('   Data: ${message.data}');
      
      // Navigate to specific screen based on data
      _handleNotificationTap(message.data);
    });
    
    // Check if app was opened from terminated state
    _messaging?.getInitialMessage().then((RemoteMessage? message) {
      if (message != null) {
        print('🔔 App opened from terminated state');
        _handleNotificationTap(message.data);
      }
    });
  }
  
  // Handle notification tap
  static void _handleNotificationTap(Map<String, dynamic> data) {
    // Navigate based on notification data
    // Example: if (data['type'] == 'chat') { navigateToChat(); }
    print('📱 Handle notification tap: $data');
  }
  
  // Get current token
  static String? get currentToken => _fcmToken;
  
  // Refresh token
  static Future<String?> refreshToken() async {
    await _messaging?.deleteToken();
    return await getFCMToken();
  }
}

// Background message handler (must be top-level function)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('📨 Background message received: ${message.messageId}');
  print('   Title: ${message.notification?.title}');
  print('   Body: ${message.notification?.body}');
  print('   Data: ${message.data}');
}
```

### 4. API Service for Backend Integration

Create `lib/services/push_notification_api.dart`:

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:device_info_plus/device_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'firebase_service.dart';

class PushNotificationAPI {
  static const String baseUrl = 'http://localhost:5000/api'; // Change to your API URL
  static const String subscribeEndpoint = '$baseUrl/push/mobile/subscribe';
  static const String unsubscribeEndpoint = '$baseUrl/push/unsubscribe';
  static const String settingsEndpoint = '$baseUrl/push/mobile/settings';
  static const String testEndpoint = '$baseUrl/push/mobile/test';
  
  // Get auth token from storage
  static Future<String?> _getAuthToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }
  
  // Get device ID
  static Future<String> _getDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    String? deviceId = prefs.getString('device_id');
    
    if (deviceId == null) {
      final deviceInfo = DeviceInfoPlugin();
      if (Theme.of(context).platform == TargetPlatform.android) {
        final androidInfo = await deviceInfo.androidInfo;
        deviceId = androidInfo.id;
      } else if (Theme.of(context).platform == TargetPlatform.iOS) {
        final iosInfo = await deviceInfo.iosInfo;
        deviceId = iosInfo.identifierForVendor;
      }
      
      if (deviceId != null) {
        await prefs.setString('device_id', deviceId);
      }
    }
    
    return deviceId ?? 'unknown-device';
  }
  
  // Subscribe to push notifications
  static Future<Map<String, dynamic>> subscribe() async {
    try {
      final token = await _getAuthToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }
      
      final fcmToken = await FirebaseService.getFCMToken();
      if (fcmToken == null) {
        throw Exception('Failed to get FCM token');
      }
      
      final deviceId = await _getDeviceId();
      final deviceInfo = DeviceInfoPlugin();
      
      String deviceType = 'unknown';
      if (Theme.of(context).platform == TargetPlatform.android) {
        deviceType = 'android';
      } else if (Theme.of(context).platform == TargetPlatform.iOS) {
        deviceType = 'ios';
      }
      
      final response = await http.post(
        Uri.parse(subscribeEndpoint),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'fcmToken': fcmToken,
          'deviceId': deviceId,
          'deviceType': deviceType,
          'userAgent': 'Flutter/${Theme.of(context).platform}',
        }),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('✅ Subscribed to push notifications');
        return data;
      } else {
        throw Exception('Failed to subscribe: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Error subscribing to push notifications: $e');
      rethrow;
    }
  }
  
  // Unsubscribe from push notifications
  static Future<Map<String, dynamic>> unsubscribe() async {
    try {
      final token = await _getAuthToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }
      
      final fcmToken = FirebaseService.currentToken;
      if (fcmToken == null) {
        throw Exception('No FCM token available');
      }
      
      final response = await http.post(
        Uri.parse(unsubscribeEndpoint),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'endpoint': fcmToken,
        }),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('✅ Unsubscribed from push notifications');
        return data;
      } else {
        throw Exception('Failed to unsubscribe: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Error unsubscribing: $e');
      rethrow;
    }
  }
  
  // Get notification settings
  static Future<Map<String, dynamic>> getSettings() async {
    try {
      final token = await _getAuthToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }
      
      final response = await http.get(
        Uri.parse(settingsEndpoint),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );
      
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to get settings: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Error getting settings: $e');
      rethrow;
    }
  }
  
  // Send test notification
  static Future<Map<String, dynamic>> sendTestNotification({
    required String title,
    required String message,
    Map<String, dynamic>? data,
  }) async {
    try {
      final token = await _getAuthToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }
      
      final response = await http.post(
        Uri.parse(testEndpoint),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'title': title,
          'message': message,
          'data': data ?? {},
        }),
      );
      
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to send test: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Error sending test notification: $e');
      rethrow;
    }
  }
}
```

### 5. Initialize in Main App

Update `lib/main.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'services/firebase_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  await FirebaseService.initialize();
  
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SellIt',
      home: HomeScreen(),
    );
  }
}
```

### 6. Subscribe After Login

In your login/authentication flow:

```dart
import 'services/push_notification_api.dart';

// After successful login
Future<void> handleLogin(String authToken) async {
  // Save token
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString('auth_token', authToken);
  
  // Subscribe to push notifications
  try {
    await PushNotificationAPI.subscribe();
    print('✅ Push notifications enabled');
  } catch (e) {
    print('⚠️ Failed to enable push notifications: $e');
  }
}
```

### 7. Handle Token Refresh

Add token refresh listener:

```dart
// In FirebaseService, add this after initialization:
static void setupTokenRefresh() {
  _messaging?.onTokenRefresh.listen((newToken) {
    print('🔄 FCM token refreshed: $newToken');
    _fcmToken = newToken;
    
    // Update token on backend
    PushNotificationAPI.subscribe();
  });
}
```

## 📱 Usage Examples

### Subscribe to Notifications

```dart
try {
  final result = await PushNotificationAPI.subscribe();
  if (result['success'] == true) {
    print('✅ Subscribed successfully');
  }
} catch (e) {
  print('❌ Error: $e');
}
```

### Unsubscribe from Notifications

```dart
try {
  await PushNotificationAPI.unsubscribe();
} catch (e) {
  print('❌ Error: $e');
}
```

### Get Notification Settings

```dart
try {
  final settings = await PushNotificationAPI.getSettings();
  print('Settings: ${settings['settings']}');
} catch (e) {
  print('❌ Error: $e');
}
```

### Send Test Notification

```dart
try {
  final result = await PushNotificationAPI.sendTestNotification(
    title: 'Test Notification',
    message: 'This is a test notification from Flutter',
    data: {
      'type': 'test',
      'url': '/notifications',
    },
  );
  print('Test sent: ${result['sent']}/${result['total']}');
} catch (e) {
  print('❌ Error: $e');
}
```

## 🔔 Notification Payload Format

Your backend should send notifications in this format:

```json
{
  "notification": {
    "title": "New Message",
    "body": "You have a new message from John",
    "icon": "notification_icon",
    "sound": "default"
  },
  "data": {
    "type": "chat",
    "chatId": "123",
    "userId": "456",
    "url": "/chat/123"
  }
}
```

## 🎯 Handling Different Notification Types

Update `_handleNotificationTap` in `firebase_service.dart`:

```dart
static void _handleNotificationTap(Map<String, dynamic> data) {
  final type = data['type'];
  
  switch (type) {
    case 'chat':
      // Navigate to chat screen
      navigatorKey.currentState?.pushNamed(
        '/chat',
        arguments: {'chatId': data['chatId']},
      );
      break;
      
    case 'ad':
      // Navigate to ad details
      navigatorKey.currentState?.pushNamed(
        '/ad/${data['adId']}',
      );
      break;
      
    case 'order':
      // Navigate to order details
      navigatorKey.currentState?.pushNamed(
        '/order/${data['orderId']}',
      );
      break;
      
    default:
      // Navigate to notifications page
      navigatorKey.currentState?.pushNamed('/notifications');
  }
}
```

## 🧪 Testing

### 1. Test from Firebase Console

1. Go to Firebase Console → Cloud Messaging
2. Click "Send test message"
3. Enter your FCM token (from app logs)
4. Send notification

### 2. Test from Backend API

```bash
curl -X POST http://localhost:5000/api/push/mobile/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "message": "This is a test from Flutter",
    "data": {
      "type": "test"
    }
  }'
```

## 🔍 Troubleshooting

### Token not received?

1. Check Firebase configuration files are in correct locations
2. Verify `google-services.json` / `GoogleService-Info.plist` are valid
3. Check app logs for FCM token
4. Ensure permissions are granted

### Notifications not showing?

1. **Foreground**: Implement local notifications using `flutter_local_notifications`
2. **Background**: Ensure background handler is registered
3. **Terminated**: Check `getInitialMessage()` is called

### Backend subscription failing?

1. Verify auth token is valid
2. Check API endpoint URL is correct
3. Ensure device ID is being sent
4. Check backend logs for errors

## 📚 Additional Resources

- [Firebase Cloud Messaging for Flutter](https://firebase.google.com/docs/cloud-messaging/flutter/client)
- [Flutter Local Notifications](https://pub.dev/packages/flutter_local_notifications)
- [Backend API Documentation](./PUSH_NOTIFICATION_ENDPOINTS.md)

---

**Last Updated:** 2024-01-15



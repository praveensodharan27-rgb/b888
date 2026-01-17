# Flutter Firebase Quick Start

Quick setup guide for Firebase push notifications in Flutter.

## 🚀 Quick Setup

### 1. Add Dependencies

```yaml
# pubspec.yaml
dependencies:
  firebase_core: ^2.24.2
  firebase_messaging: ^14.7.9
  http: ^1.1.0
  shared_preferences: ^2.2.2
  device_info_plus: ^9.1.1
```

### 2. Initialize in main.dart

```dart
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'services/firebase_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  await FirebaseService.initialize(
    apiBaseUrl: 'http://localhost:5000/api', // Your API URL
  );
  
  runApp(MyApp());
}
```

### 3. Subscribe After Login

```dart
// After user logs in and you have auth token
import 'package:shared_preferences/shared_preferences.dart';
import 'services/firebase_service.dart';

Future<void> onLoginSuccess(String authToken) async {
  // Save auth token
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString('auth_token', authToken);
  
  // Subscribe to push notifications
  await FirebaseService.subscribeToBackend();
}
```

### 4. Unsubscribe on Logout

```dart
Future<void> onLogout() async {
  await FirebaseService.unsubscribeFromBackend();
  
  final prefs = await SharedPreferences.getInstance();
  await prefs.remove('auth_token');
}
```

## 📱 That's It!

Your Flutter app is now set up for Firebase push notifications. The service will:
- ✅ Request notification permissions
- ✅ Get FCM token automatically
- ✅ Subscribe to backend on login
- ✅ Handle token refresh
- ✅ Process foreground/background messages
- ✅ Handle notification taps

## 🔔 Testing

### Test from Backend

```bash
POST http://localhost:5000/api/push/mobile/test
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "title": "Test Notification",
  "message": "Hello from Flutter!",
  "data": {
    "type": "test"
  }
}
```

### Test from Firebase Console

1. Go to Firebase Console → Cloud Messaging
2. Click "Send test message"
3. Enter FCM token (check app logs)
4. Send notification

## 📝 Full Documentation

See `FLUTTER_FIREBASE_SETUP.md` for complete setup guide.



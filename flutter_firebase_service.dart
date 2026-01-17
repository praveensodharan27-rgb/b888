// Flutter Firebase Service - Ready to use
// Place this in: lib/services/firebase_service.dart

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:device_info_plus/device_info_plus.dart';

class FirebaseService {
  static FirebaseMessaging? _messaging;
  static String? _fcmToken;
  static String? _apiBaseUrl;
  
  // Initialize Firebase
  static Future<void> initialize({String? apiBaseUrl}) async {
    _apiBaseUrl = apiBaseUrl ?? 'http://localhost:5000/api';
    
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
      print('✅ User granted notification permission');
      await getFCMToken();
      setupMessageHandlers();
      setupTokenRefresh();
    } else {
      print('❌ User declined notification permission');
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
      print('📨 Foreground message:');
      print('   Title: ${message.notification?.title}');
      print('   Body: ${message.notification?.body}');
      print('   Data: ${message.data}');
    });
    
    // Background messages
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
    
    // Notification tap (app in background)
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('🔔 Notification opened app');
      _handleNotificationTap(message.data);
    });
    
    // App opened from terminated state
    _messaging?.getInitialMessage().then((RemoteMessage? message) {
      if (message != null) {
        print('🔔 App opened from terminated state');
        _handleNotificationTap(message.data);
      }
    });
  }
  
  // Setup token refresh
  static void setupTokenRefresh() {
    _messaging?.onTokenRefresh.listen((newToken) {
      print('🔄 FCM token refreshed: $newToken');
      _fcmToken = newToken;
      // Auto-resubscribe with new token
      subscribeToBackend();
    });
  }
  
  // Handle notification tap - Navigate to chat screen
  static void _handleNotificationTap(Map<String, dynamic> data) {
    print('📱 Handle notification tap: $data');
    
    // Check if it's a chat message
    if (data['type'] == 'chat_message' && data['chatId'] != null) {
      final chatId = data['chatId'];
      print('🔔 Opening chat: $chatId');
      
      // Navigate to chat screen using navigator key
      // You need to set up a global navigator key in your main.dart
      // Example:
      // final navigatorKey = GlobalKey<NavigatorState>();
      // 
      // Then in your app:
      // MaterialApp(
      //   navigatorKey: navigatorKey,
      //   ...
      // )
      //
      // And here:
      // navigatorKey.currentState?.pushNamed(
      //   '/chat',
      //   arguments: {'chatId': chatId, 'roomId': chatId}
      // );
      
      // Alternative: Use a callback function
      if (_onChatNotificationTap != null) {
        _onChatNotificationTap!(chatId);
      }
    }
  }
  
  // Callback for chat notification tap
  static Function(String chatId)? _onChatNotificationTap;
  
  // Set callback for handling chat notification taps
  static void setChatNotificationHandler(Function(String chatId) handler) {
    _onChatNotificationTap = handler;
  }
  
  // Subscribe to backend API
  static Future<bool> subscribeToBackend() async {
    try {
      final token = await _getAuthToken();
      if (token == null) {
        print('⚠️ User not authenticated, skipping subscription');
        return false;
      }
      
      final fcmToken = await getFCMToken();
      if (fcmToken == null) {
        print('❌ No FCM token available');
        return false;
      }
      
      final deviceId = await _getDeviceId();
      final deviceInfo = DeviceInfoPlugin();
      
      String deviceType = 'android';
      if (defaultTargetPlatform == TargetPlatform.iOS) {
        deviceType = 'ios';
      }
      
      final response = await http.post(
        Uri.parse('$_apiBaseUrl/push/mobile/subscribe'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'fcmToken': fcmToken,
          'deviceId': deviceId,
          'deviceType': deviceType,
          'userAgent': 'Flutter/$deviceType',
        }),
      );
      
      if (response.statusCode == 200) {
        print('✅ Subscribed to push notifications');
        return true;
      } else {
        print('❌ Subscription failed: ${response.statusCode} - ${response.body}');
        return false;
      }
    } catch (e) {
      print('❌ Error subscribing: $e');
      return false;
    }
  }
  
  // Unsubscribe from backend
  static Future<bool> unsubscribeFromBackend() async {
    try {
      final token = await _getAuthToken();
      if (token == null) return false;
      
      final fcmToken = _fcmToken;
      if (fcmToken == null) return false;
      
      final response = await http.post(
        Uri.parse('$_apiBaseUrl/push/unsubscribe'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'endpoint': fcmToken,
        }),
      );
      
      if (response.statusCode == 200) {
        print('✅ Unsubscribed from push notifications');
        return true;
      }
      return false;
    } catch (e) {
      print('❌ Error unsubscribing: $e');
      return false;
    }
  }
  
  // Get auth token from storage
  static Future<String?> _getAuthToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }
  
  // Get or create device ID
  static Future<String> _getDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    String? deviceId = prefs.getString('device_id');
    
    if (deviceId == null) {
      final deviceInfo = DeviceInfoPlugin();
      if (defaultTargetPlatform == TargetPlatform.android) {
        final androidInfo = await deviceInfo.androidInfo;
        deviceId = androidInfo.id;
      } else if (defaultTargetPlatform == TargetPlatform.iOS) {
        final iosInfo = await deviceInfo.iosInfo;
        deviceId = iosInfo.identifierForVendor;
      }
      
      if (deviceId != null) {
        await prefs.setString('device_id', deviceId);
      }
    }
    
    return deviceId ?? 'unknown-device-${DateTime.now().millisecondsSinceEpoch}';
  }
  
  // Get current token
  static String? get currentToken => _fcmToken;
}

// Background message handler (must be top-level)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('📨 Background message: ${message.messageId}');
  print('   Title: ${message.notification?.title}');
  print('   Body: ${message.notification?.body}');
  print('   Data: ${message.data}');
  print('   ChatId: ${message.data['chatId']}');
  
  // Handle chat message in background
  if (message.data['type'] == 'chat_message' && message.data['chatId'] != null) {
    // You can update local database or show local notification here
    print('💬 Chat message received in background: ${message.data['chatId']}');
  }
}


// Firebase Cloud Messaging Service for sending push notifications
const admin = require('firebase-admin');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Initialize Firebase Admin
let fcmInitialized = false;

const initializeFCM = () => {
  try {
    // Check if Firebase credentials are provided
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const firebaseConfig = process.env.FIREBASE_CONFIG;

    if (serviceAccountPath) {
      // Initialize with service account file
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      fcmInitialized = true;
      console.log('✅ Firebase Admin initialized (service account)');
    } else if (firebaseConfig) {
      // Initialize with config JSON string
      const config = JSON.parse(firebaseConfig);
      admin.initializeApp({
        credential: admin.credential.cert(config)
      });
      fcmInitialized = true;
      console.log('✅ Firebase Admin initialized (config)');
    } else {
      // Try to initialize with default credentials (for GCP environments)
      try {
        admin.initializeApp();
        fcmInitialized = true;
        console.log('✅ Firebase Admin initialized (default credentials)');
      } catch (error) {
        console.warn('⚠️  Firebase Admin not configured. FCM notifications will not work.');
        console.warn('   Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_CONFIG in .env');
        fcmInitialized = false;
      }
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error.message);
    fcmInitialized = false;
  }
};

// Initialize on module load
initializeFCM();

/**
 * Send FCM notification to a user
 * @param {string} userId - User ID to send notification to
 * @param {Object} notification - Notification payload
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>}
 */
const sendFCMNotificationToUser = async (userId, notification, data = {}) => {
  if (!fcmInitialized) {
    if (process.env.NODE_ENV === 'development') {
      console.log('📱 [DEV MODE] FCM notification would be sent:', notification);
      return { success: true, mode: 'development' };
    }
    return { success: false, message: 'FCM not initialized' };
  }

  try {
    // Get user's FCM tokens from mobile devices
    const devices = await prisma.mobileDevice.findMany({
      where: {
        userId,
        isActive: true,
        fcmToken: { not: null }
      },
      select: {
        fcmToken: true,
        deviceType: true
      }
    });

    if (devices.length === 0) {
      return { success: true, message: 'No FCM tokens found for user', count: 0 };
    }

    const tokens = devices.map(d => d.fcmToken).filter(Boolean);
    
    if (tokens.length === 0) {
      return { success: true, message: 'No valid FCM tokens', count: 0 };
    }

    // Prepare FCM message (WhatsApp-style)
    const message = {
      notification: {
        title: notification.title || 'SellIt',
        body: notification.body || notification.message || 'You have a new notification',
      },
      data: {
        ...data,
        type: data.type || notification.type || 'notification',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        // Ensure chatId is in data for Flutter intent
        chatId: data.chatId || data.roomId || '',
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'chat_messages', // Custom channel for chat notifications
          icon: 'ic_notification', // Custom icon
          tag: data.chatId || data.roomId || 'chat', // Group notifications by chat
          color: '#25D366', // WhatsApp green color
        },
        // Data-only for background handling
        data: {
          ...data,
          chatId: data.chatId || data.roomId || '',
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            category: 'CHAT_MESSAGE', // iOS notification category
            'thread-id': data.chatId || data.roomId || 'chat', // Group notifications
          }
        }
      }
    };

    // Send to all tokens
    const results = await admin.messaging().sendEachForMulticast({
      tokens,
      ...message
    });

    // Remove invalid tokens
    if (results.failureCount > 0) {
      const invalidTokens = [];
      results.responses.forEach((response, index) => {
        if (!response.success) {
          if (response.error.code === 'messaging/invalid-registration-token' ||
              response.error.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(tokens[index]);
          }
        }
      });

      // Remove invalid tokens from database
      if (invalidTokens.length > 0) {
        await prisma.mobileDevice.updateMany({
          where: {
            fcmToken: { in: invalidTokens }
          },
          data: {
            fcmToken: null,
            isActive: false
          }
        });
        console.log(`🗑️  Removed ${invalidTokens.length} invalid FCM tokens`);
      }
    }

    console.log(`✅ FCM notification sent: ${results.successCount}/${tokens.length} successful`);
    
    return {
      success: true,
      total: tokens.length,
      successCount: results.successCount,
      failureCount: results.failureCount
    };
  } catch (error) {
    console.error('❌ Error sending FCM notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send FCM notification to specific FCM token
 * @param {string} token - FCM token
 * @param {Object} notification - Notification payload
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>}
 */
const sendFCMNotificationToToken = async (token, notification, data = {}) => {
  if (!fcmInitialized) {
    if (process.env.NODE_ENV === 'development') {
      console.log('📱 [DEV MODE] FCM notification would be sent to token');
      return { success: true, mode: 'development' };
    }
    return { success: false, message: 'FCM not initialized' };
  }

  try {
    const message = {
      token,
      notification: {
        title: notification.title || 'SellIt',
        body: notification.body || notification.message || 'You have a new notification',
      },
      data: {
        ...data,
        type: data.type || notification.type || 'notification',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        priority: 'high',
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('✅ FCM notification sent to token:', response);
    
    return { success: true, messageId: response };
  } catch (error) {
    console.error('❌ Error sending FCM notification to token:', error);
    
    // Remove invalid token
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      await prisma.mobileDevice.updateMany({
        where: { fcmToken: token },
        data: { fcmToken: null, isActive: false }
      });
    }
    
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendFCMNotificationToUser,
  sendFCMNotificationToToken,
  isInitialized: () => fcmInitialized
};


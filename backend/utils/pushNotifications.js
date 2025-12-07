const webpush = require('web-push');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Initialize web-push with VAPID keys
const initializePushNotifications = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@sellit.com';

  if (!publicKey || !privateKey) {
    console.warn('⚠️  VAPID keys not configured. Push notifications will not work.');
    console.warn('   Generate keys using: npx web-push generate-vapid-keys');
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  console.log('✅ Push notifications initialized');
  return true;
};

// Initialize on module load
const isInitialized = initializePushNotifications();

// Save push subscription for a user
const savePushSubscription = async (userId, subscription) => {
  try {
    const { endpoint, keys } = subscription;
    
    // Check if subscription already exists
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint }
    });

    if (existing) {
      // Update existing subscription
      await prisma.pushSubscription.update({
        where: { endpoint },
        data: {
          keys: JSON.stringify(keys),
          userId,
          userAgent: subscription.userAgent || null,
          updatedAt: new Date()
        }
      });
      return { success: true, message: 'Subscription updated' };
    } else {
      // Create new subscription
      await prisma.pushSubscription.create({
        data: {
          endpoint,
          keys: JSON.stringify(keys),
          userId,
          userAgent: subscription.userAgent || null
        }
      });
      return { success: true, message: 'Subscription saved' };
    }
  } catch (error) {
    console.error('❌ Error saving push subscription:', error);
    return { success: false, error: error.message };
  }
};

// Remove push subscription
const removePushSubscription = async (endpoint) => {
  try {
    await prisma.pushSubscription.delete({
      where: { endpoint }
    });
    return { success: true, message: 'Subscription removed' };
  } catch (error) {
    console.error('❌ Error removing push subscription:', error);
    return { success: false, error: error.message };
  }
};

// Send push notification to a single subscription
const sendPushNotification = async (subscription, payload) => {
  try {
    if (!isInitialized) {
      console.warn('⚠️  Push notifications not initialized');
      if (process.env.NODE_ENV === 'development') {
        console.log(`📱 [DEV MODE] Push notification would be sent`);
        console.log(`   Title: ${payload.title}`);
        return { success: true, mode: 'development' };
      }
      return { success: false, message: 'Push notifications not initialized' };
    }

    const subscriptionObj = {
      endpoint: subscription.endpoint,
      keys: typeof subscription.keys === 'string' 
        ? JSON.parse(subscription.keys) 
        : subscription.keys
    };

    const result = await webpush.sendNotification(
      subscriptionObj,
      JSON.stringify(payload)
    );

    console.log(`✅ Push notification sent successfully`);
    return { success: true, statusCode: result.statusCode };
  } catch (error) {
    console.error('❌ Push notification failed:', error.message);
    
    // If subscription is invalid, remove it
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log(`🗑️  Removing invalid subscription: ${subscription.endpoint}`);
      await removePushSubscription(subscription.endpoint);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`📱 [DEV MODE] Push notification would be sent`);
      return { success: true, mode: 'development' };
    }

    return { success: false, error: error.message, statusCode: error.statusCode };
  }
};

// Send push notification to all users
const sendPushNotificationToAll = async (payload) => {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      select: {
        id: true,
        endpoint: true,
        keys: true
      }
    });

    console.log(`📱 Sending push notifications to ${subscriptions.length} subscriptions...`);

    let successCount = 0;
    let failCount = 0;

    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < subscriptions.length; i += batchSize) {
      const batch = subscriptions.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (subscription) => {
          const result = await sendPushNotification(subscription, payload);
          if (result.success) {
            successCount++;
          } else {
            failCount++;
          }
        })
      );

      // Small delay between batches
      if (i + batchSize < subscriptions.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`✅ Push notifications sent: ${successCount} success, ${failCount} failed`);

    return {
      success: true,
      total: subscriptions.length,
      successCount,
      failCount
    };
  } catch (error) {
    console.error('❌ Error sending push notifications to all:', error);
    return { success: false, error: error.message };
  }
};

// Send push notification to a specific user
const sendPushNotificationToUser = async (userId, payload) => {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
      select: {
        id: true,
        endpoint: true,
        keys: true
      }
    });

    if (subscriptions.length === 0) {
      return { success: true, message: 'No subscriptions found for user', count: 0 };
    }

    let successCount = 0;
    let failCount = 0;

    await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        const result = await sendPushNotification(subscription, payload);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      })
    );

    return {
      success: true,
      total: subscriptions.length,
      successCount,
      failCount
    };
  } catch (error) {
    console.error('❌ Error sending push notification to user:', error);
    return { success: false, error: error.message };
  }
};

// Get VAPID public key (for frontend)
const getVapidPublicKey = () => {
  return process.env.VAPID_PUBLIC_KEY || null;
};

module.exports = {
  savePushSubscription,
  removePushSubscription,
  sendPushNotification,
  sendPushNotificationToAll,
  sendPushNotificationToUser,
  getVapidPublicKey,
  isInitialized
};


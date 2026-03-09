require('dotenv').config();
const { addNotificationToQueue } = require('../queues/notificationQueue');

/**
 * Test script for package purchase notifications
 * Usage: node scripts/test-package-notification.js
 */

async function testPackageNotification() {
  try {
    console.log('🧪 Testing package purchase notification...\n');

    // Test data
    const testData = {
      type: 'package_purchased',
      data: {
        user: {
          id: 'test-user-123',
          name: 'Test User',
          email: process.env.TEST_EMAIL || 'test@example.com',
          phone: process.env.TEST_PHONE || '+919876543210'
        },
        ad: {
          id: 'test-ad-123',
          title: 'iPhone 14 Pro Max - 256GB',
          slug: 'iphone-14-pro-max-256gb'
        },
        packageType: 'TOP',
        order: {
          id: 'test-order-123',
          amount: 299,
          paymentMethod: 'Razorpay',
          invoiceId: 'test-invoice-123'
        }
      }
    };

    console.log('📋 Test Data:');
    console.log('   User:', testData.data.user.name);
    console.log('   Email:', testData.data.user.email);
    console.log('   Phone:', testData.data.user.phone);
    console.log('   Ad:', testData.data.ad.title);
    console.log('   Package:', testData.data.packageType);
    console.log('   Amount: ₹' + testData.data.order.amount);
    console.log('');

    // Queue the notification
    console.log('📤 Queuing notification...');
    const job = await addNotificationToQueue(testData);
    
    console.log('✅ Notification queued successfully!');
    console.log('   Job ID:', job.id);
    console.log('   Job Name:', job.name);
    console.log('');

    console.log('📊 Check the following:');
    console.log('   1. Backend logs for notification processing');
    console.log('   2. Email inbox:', testData.data.user.email);
    console.log('   3. SMS to:', testData.data.user.phone);
    console.log('   4. Database: notification_history collection');
    console.log('');

    console.log('💡 Tips:');
    console.log('   - Set TEST_EMAIL and TEST_PHONE in .env for real testing');
    console.log('   - Check NODE_ENV=development for console-only mode');
    console.log('   - Configure SMTP and Twilio for actual delivery');
    console.log('');

    // Wait a bit for processing
    console.log('⏳ Waiting 5 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('✅ Test complete! Check logs above for results.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testPackageNotification();

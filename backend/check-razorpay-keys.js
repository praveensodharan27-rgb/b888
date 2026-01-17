/**
 * Check Razorpay Keys Configuration
 * Run: node check-razorpay-keys.js
 */

require('dotenv').config();

console.log('🔍 Checking Razorpay Configuration...\n');

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
const devMode = process.env.PAYMENT_GATEWAY_DEV_MODE;

console.log('Environment Variables:');
console.log('─────────────────────');

if (keyId) {
  console.log(`✅ RAZORPAY_KEY_ID: ${keyId.substring(0, 20)}...`);
} else {
  console.log('❌ RAZORPAY_KEY_ID: MISSING');
}

if (keySecret) {
  if (keySecret.length > 10 && !keySecret.includes('your_') && !keySecret.includes('xxxxx')) {
    console.log(`✅ RAZORPAY_KEY_SECRET: Configured (length: ${keySecret.length})`);
  } else {
    console.log('❌ RAZORPAY_KEY_SECRET: INVALID or PLACEHOLDER');
  }
} else {
  console.log('❌ RAZORPAY_KEY_SECRET: MISSING');
}

if (webhookSecret) {
  console.log(`✅ RAZORPAY_WEBHOOK_SECRET: Configured`);
} else {
  console.log('⚠️  RAZORPAY_WEBHOOK_SECRET: Not set (optional)');
}

console.log(`\n📊 Configuration:`);
console.log(`   DEV_MODE: ${devMode || 'false (default)'}`);

console.log('\n🔧 Razorpay Initialization Test:');
console.log('───────────────────────────────');

if (keyId && keySecret && keySecret.length > 10) {
  try {
    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
    console.log('✅ Razorpay initialized successfully!');
    console.log('✅ Keys are valid and working');
  } catch (error) {
    console.log('❌ Failed to initialize Razorpay:');
    console.log(`   Error: ${error.message}`);
  }
} else {
  console.log('❌ Cannot initialize Razorpay - keys missing or invalid');
  console.log('\n💡 To fix:');
  console.log('   1. Add RAZORPAY_KEY_ID to backend/.env');
  console.log('   2. Add RAZORPAY_KEY_SECRET to backend/.env');
  console.log('   3. Get keys from: https://dashboard.razorpay.com/app/keys');
  console.log('   4. Restart server after adding keys');
}

console.log('\n📝 Next Steps:');
if (keyId && keySecret && keySecret.length > 10) {
  console.log('   ✅ Keys are configured correctly');
  console.log('   🔄 Restart your server: npm run dev');
  console.log('   🧪 Test: curl http://localhost:5000/api/payment-gateway/status');
} else {
  console.log('   ❌ Add missing keys to backend/.env file');
  console.log('   📖 See: RAZORPAY_SETUP.md for instructions');
}


/**
 * Verify 50 Dummy Data + Admin User
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verify() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 Verifying 50 Dummy Data + Admin User');
    console.log('='.repeat(80) + '\n');

    await prisma.$connect();
    console.log('✅ Connected to MongoDB\n');

    // Check admin user
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    });
    console.log(`👑 Admin Users: ${admins.length}`);
    if (admins.length > 0) {
      admins.forEach(admin => {
        console.log(`   - ${admin.email || admin.phone} (${admin.name})`);
      });
    } else {
      console.log('   ❌ No admin users found!');
    }
    console.log('');

    // Check dummy users
    const dummyUsers = await prisma.user.findMany({
      where: {
        email: { startsWith: 'dummy' },
        role: 'USER'
      }
    });
    console.log(`👤 Dummy Users: ${dummyUsers.length}`);
    if (dummyUsers.length < 50) {
      console.log(`   ⚠️  Expected 50, found ${dummyUsers.length}`);
    }
    console.log('');

    // Check total users
    const totalUsers = await prisma.user.count();
    console.log(`📊 Total Users: ${totalUsers}`);
    console.log('');

    // Check ads
    const totalAds = await prisma.ad.count();
    console.log(`📢 Total Ads: ${totalAds}`);
    
    const approvedAds = await prisma.ad.count({ where: { status: 'APPROVED' } });
    const pendingAds = await prisma.ad.count({ where: { status: 'PENDING' } });
    const premiumAds = await prisma.ad.count({ where: { isPremium: true } });
    
    console.log(`   - Approved: ${approvedAds}`);
    console.log(`   - Pending: ${pendingAds}`);
    console.log(`   - Premium: ${premiumAds}`);
    console.log('');

    // Check wallets
    const wallets = await prisma.wallet.count();
    console.log(`💰 Wallets: ${wallets}`);
    console.log('');

    // Summary
    console.log('='.repeat(80));
    console.log('📊 Summary');
    console.log('='.repeat(80));
    console.log(`   Admin users: ${admins.length} ${admins.length > 0 ? '✅' : '❌'}`);
    console.log(`   Dummy users: ${dummyUsers.length} ${dummyUsers.length >= 50 ? '✅' : '⚠️'}`);
    console.log(`   Total users: ${totalUsers}`);
    console.log(`   Total ads: ${totalAds} ${totalAds >= 50 ? '✅' : '⚠️'}`);
    console.log(`   Wallets: ${wallets}`);
    console.log('='.repeat(80) + '\n');

    if (admins.length > 0 && dummyUsers.length >= 50 && totalAds >= 50) {
      console.log('✅ All data verified successfully!\n');
      
      if (admins.length > 0) {
        const admin = admins[0];
        console.log('📋 Admin Login:');
        console.log(`   Email: ${admin.email || 'N/A'}`);
        console.log(`   Phone: ${admin.phone || 'N/A'}`);
        console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
        console.log('');
      }
      
      console.log('📋 Dummy User Login:');
      console.log('   Email: dummy1@example.com (through dummy50@example.com)');
      console.log('   Password: password123');
      console.log('');
    } else {
      console.log('⚠️  Some data is missing. Run: npm run add-50-dummy-and-admin\n');
    }

  } catch (error) {
    console.error('\n❌ Error verifying data:', error.message);
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 MongoDB authentication failed!');
      console.error('   Fix: node fix-url-simple.js && npm run prisma:generate\n');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verify();

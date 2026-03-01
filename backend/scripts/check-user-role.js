const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkUserRole() {
  try {
    const email = process.argv[2] || process.env.ADMIN_EMAIL;
    
    if (!email) {
      console.log('Usage: node scripts/check-user-role.js <email>');
      console.log('Or set ADMIN_EMAIL in .env file');
      process.exit(1);
    }

    console.log('\n🔍 Checking user role...\n');
    console.log(`Email: ${email}\n`);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    console.log('📋 User Information:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Phone: ${user.phone || 'N/A'}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Verified: ${user.isVerified ? 'Yes' : 'No'}`);
    console.log(`   Created: ${user.createdAt}\n`);

    if (user.role !== 'ADMIN') {
      console.log('⚠️  User does NOT have ADMIN role!');
      console.log(`   Current role: ${user.role}`);
      console.log('\n💡 To update role to ADMIN, run:');
      console.log(`   node scripts/update-user-role.js ${email} ADMIN\n`);
    } else {
      console.log('✅ User has ADMIN role!');
      console.log('\n💡 If you still get 403 errors:');
      console.log('   1. Logout from the application');
      console.log('   2. Login again with this account');
      console.log('   3. This will generate a new JWT token\n');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserRole();

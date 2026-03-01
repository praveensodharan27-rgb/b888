const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function updateUserRole() {
  try {
    const email = process.argv[2];
    const role = process.argv[3]?.toUpperCase();

    if (!email || !role) {
      console.log('Usage: node scripts/update-user-role.js <email> <role>');
      console.log('Roles: USER, ADMIN');
      process.exit(1);
    }

    if (!['USER', 'ADMIN'].includes(role)) {
      console.log('❌ Invalid role! Must be USER or ADMIN');
      process.exit(1);
    }

    console.log('\n🔄 Updating user role...\n');
    console.log(`Email: ${email}`);
    console.log(`New Role: ${role}\n`);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    console.log('📋 Current User Information:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current Role: ${user.role}\n`);

    if (user.role === role) {
      console.log(`✅ User already has role: ${role}`);
      console.log('   No update needed.\n');
      await prisma.$disconnect();
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    console.log('✅ User role updated successfully!\n');
    console.log('📋 Updated User Information:');
    console.log(`   Name: ${updatedUser.name}`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   New Role: ${updatedUser.role}\n`);

    console.log('💡 Important:');
    console.log('   1. User must LOGOUT from the application');
    console.log('   2. User must LOGIN again');
    console.log('   3. This will generate a new JWT token with the updated role\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserRole();

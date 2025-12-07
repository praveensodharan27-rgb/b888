const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    console.log('\n=== Checking Admin User ===\n');

    const admin = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'admin@sellit.com' },
          { role: 'ADMIN' }
        ]
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        password: true,
        isVerified: true
      }
    });

    if (!admin) {
      console.log('❌ Admin user not found!');
      console.log('   Run: npm run create-admin');
      return;
    }

    console.log('✅ Admin user found:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email || 'N/A'}`);
    console.log(`   Phone: ${admin.phone || 'N/A'}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Verified: ${admin.isVerified}`);
    console.log(`   Has Password: ${admin.password ? 'Yes' : 'No'}`);

    if (!admin.password) {
      console.log('\n⚠️  Admin has no password! Setting password to "admin123"...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.update({
        where: { id: admin.id },
        data: { password: hashedPassword }
      });
      console.log('✅ Password set successfully!');
    } else {
      // Test password
      const testPassword = 'admin123';
      const isValid = await bcrypt.compare(testPassword, admin.password);
      console.log(`\n🔐 Password test for "admin123": ${isValid ? '✅ Valid' : '❌ Invalid'}`);
      
      if (!isValid) {
        console.log('\n⚠️  Password does not match! Resetting to admin123...');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await prisma.user.update({
          where: { id: admin.id },
          data: { password: hashedPassword }
        });
        console.log('✅ Password reset successfully!');
      }
    }

    console.log('\n📋 Login Credentials:');
    console.log(`   Email: ${admin.email || 'N/A'}`);
    console.log(`   Password: admin123\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();


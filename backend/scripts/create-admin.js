const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@sellit.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'Admin User';
    const adminPhone = process.env.ADMIN_PHONE || null;

    console.log('\n=== Creating Admin User ===\n');

    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { email: adminEmail },
          { role: 'ADMIN' }
        ]
      }
    });

    if (existingAdmin) {
      if (existingAdmin.role === 'ADMIN') {
        console.log('⚠️  Admin user already exists!');
        console.log(`   Email: ${existingAdmin.email || 'N/A'}`);
        console.log(`   Phone: ${existingAdmin.phone || 'N/A'}`);
        console.log(`   Name: ${existingAdmin.name}`);
        console.log(`   ID: ${existingAdmin.id}\n`);
        
        // Update password if needed
        if (adminPassword && adminPassword !== 'admin123') {
          const hashedPassword = await bcrypt.hash(adminPassword, 10);
          await prisma.user.update({
            where: { id: existingAdmin.id },
            data: { password: hashedPassword, isVerified: true }
          });
          console.log('✅ Admin password updated');
        }
        return;
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        phone: adminPhone,
        password: hashedPassword,
        role: 'ADMIN',
        isVerified: true
      }
    });

    console.log('✅ Admin user created successfully!\n');
    console.log('📋 Admin Credentials:');
    console.log(`   Email: ${admin.email || 'N/A'}`);
    console.log(`   Phone: ${admin.phone || 'N/A'}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Verified: ${admin.isVerified}\n`);
    console.log('🔐 You can now login with these credentials\n');

  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();


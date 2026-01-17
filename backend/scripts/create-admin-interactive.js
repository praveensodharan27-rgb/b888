/**
 * Interactive Admin User Creation Script
 * Creates an admin user with custom credentials
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');
require('dotenv').config();

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdminInteractive() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('👤 Create Admin User');
    console.log('='.repeat(80) + '\n');

    // Test connection first
    console.log('Testing MongoDB connection...');
    await prisma.$connect();
    console.log('✅ Connected to MongoDB\n');

    // Get admin details
    const adminName = await question('Admin Name (default: Admin User): ') || 'Admin User';
    const adminEmail = await question('Admin Email (default: admin@sellit.com): ') || 'admin@sellit.com';
    const adminPhone = await question('Admin Phone (optional, press Enter to skip): ') || null;
    const adminPassword = await question('Admin Password (default: admin123): ') || 'admin123';

    console.log('\n📋 Admin Details:');
    console.log(`   Name: ${adminName}`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Phone: ${adminPhone || 'N/A'}`);
    console.log(`   Password: ${'*'.repeat(adminPassword.length)}`);
    console.log('');

    const confirm = await question('Create this admin user? (y/n): ');
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('❌ Cancelled');
      rl.close();
      await prisma.$disconnect();
      return;
    }

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
        console.log('\n⚠️  Admin user already exists!');
        console.log(`   Email: ${existingAdmin.email || 'N/A'}`);
        console.log(`   Phone: ${existingAdmin.phone || 'N/A'}`);
        console.log(`   Name: ${existingAdmin.name}`);
        console.log(`   ID: ${existingAdmin.id}\n`);
        
        const update = await question('Update password for existing admin? (y/n): ');
        if (update.toLowerCase() === 'y' || update.toLowerCase() === 'yes') {
          const hashedPassword = await bcrypt.hash(adminPassword, 10);
          await prisma.user.update({
            where: { id: existingAdmin.id },
            data: { 
              password: hashedPassword, 
              isVerified: true,
              name: adminName,
              email: adminEmail,
              phone: adminPhone
            }
          });
          console.log('✅ Admin user updated successfully!\n');
        }
        rl.close();
        await prisma.$disconnect();
        return;
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Generate referral code
    const initials = adminName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 3);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const referralCode = `${initials}${random}`;

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        phone: adminPhone,
        password: hashedPassword,
        role: 'ADMIN',
        isVerified: true,
        referralCode: referralCode
      }
    });

    // Create wallet for admin
    try {
      await prisma.wallet.create({
        data: {
          userId: admin.id,
          balance: 0
        }
      });
      console.log('✅ Wallet created for admin');
    } catch (err) {
      // Wallet might already exist
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Admin user created successfully!');
    console.log('='.repeat(80) + '\n');
    console.log('📋 Admin Credentials:');
    console.log(`   Email: ${admin.email || 'N/A'}`);
    console.log(`   Phone: ${admin.phone || 'N/A'}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Verified: ${admin.isVerified}`);
    console.log(`   Referral Code: ${admin.referralCode}`);
    console.log(`   ID: ${admin.id}\n`);
    console.log('🔐 You can now login with these credentials\n');
    console.log('📋 Next Steps:');
    console.log('   1. Login at: http://localhost:3000/admin');
    console.log('   2. Or use API: POST /api/auth/login');
    console.log('   3. Access admin panel features\n');

  } catch (error) {
    console.error('\n❌ Error creating admin:', error.message);
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 MongoDB authentication failed!');
      console.error('   Run: powershell -ExecutionPolicy Bypass -File .\update-mongodb-password.ps1');
    } else if (error.message.includes('connect')) {
      console.error('\n💡 Cannot connect to MongoDB!');
      console.error('   Check your connection string in .env');
    }
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

createAdminInteractive();

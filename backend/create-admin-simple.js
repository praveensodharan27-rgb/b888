/**
 * Simple Admin User Creation
 * Creates admin user with default or custom credentials
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('👤 Creating Admin User');
    console.log('='.repeat(80) + '\n');

    // Default admin credentials (can be overridden with environment variables)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@sellit.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'Admin User';
    const adminPhone = process.env.ADMIN_PHONE || null;

    console.log('Testing MongoDB connection...');
    await prisma.$connect();
    console.log('✅ Connected to MongoDB\n');

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
        
        // Update password
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await prisma.user.update({
          where: { id: existingAdmin.id },
          data: { 
            password: hashedPassword, 
            isVerified: true,
            name: adminName,
            email: adminEmail
          }
        });
        console.log('✅ Admin password updated\n');
        console.log('📋 Updated Admin Credentials:');
        console.log(`   Email: ${adminEmail}`);
        console.log(`   Password: ${adminPassword}`);
        console.log(`   Name: ${adminName}\n`);
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
    } catch (err) {
      // Wallet might already exist, ignore
    }

    console.log('✅ Admin user created successfully!\n');
    console.log('📋 Admin Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Name: ${adminName}`);
    console.log(`   Phone: ${adminPhone || 'N/A'}`);
    console.log(`   Role: ADMIN`);
    console.log(`   Verified: true`);
    console.log(`   Referral Code: ${referralCode}`);
    console.log(`   ID: ${admin.id}\n`);
    console.log('🔐 You can now login with these credentials');
    console.log('   Frontend: http://localhost:3000/admin');
    console.log('   API: POST http://localhost:5000/api/auth/login\n');

  } catch (error) {
    console.error('\n❌ Error creating admin:', error.message);
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 MongoDB authentication failed!');
      console.error('   Fix: Run this command to update password:');
      console.error('   powershell -ExecutionPolicy Bypass -File .\\update-mongodb-password.ps1\n');
    } else if (error.message.includes('connect') || error.message.includes('timeout')) {
      console.error('\n💡 Cannot connect to MongoDB!');
      console.error('   Check:');
      console.error('   1. MongoDB connection string in .env');
      console.error('   2. MongoDB Atlas cluster is running');
      console.error('   3. IP address is whitelisted\n');
    } else {
      console.error('\n💡 Error details:', error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();

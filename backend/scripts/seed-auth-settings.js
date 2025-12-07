const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAuthSettings() {
  try {
    console.log('🌱 Seeding auth page settings...');

    // Login page settings
    await prisma.authPageSettings.upsert({
      where: { page: 'login' },
      update: {},
      create: {
        page: 'login',
        title: 'SellIt.',
        subtitle: 'Buy & Sell Anything Today',
        tagline: 'Welcome Back!',
        imageUrl: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?q=80&w=2187&auto=format&fit=crop',
        backgroundColor: '#6b21a8',
        stats: {
          listings: '1000+',
          users: '500+',
          categories: '50+'
        }
      }
    });
    console.log('✅ Login page settings created');

    // Signup page settings
    await prisma.authPageSettings.upsert({
      where: { page: 'signup' },
      update: {},
      create: {
        page: 'signup',
        title: 'SellIt.',
        subtitle: 'Join thousands of buyers and sellers',
        tagline: 'Start Selling Today!',
        imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
        backgroundColor: '#ea580c',
        features: ['Easy to use', '100% Secure', 'Quick setup']
      }
    });
    console.log('✅ Signup page settings created');

    console.log('🎉 Auth page settings seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding auth settings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedAuthSettings();


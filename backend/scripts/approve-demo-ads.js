const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function approveDemoAds() {
  try {
    console.log('\n✅ Approving Demo Ads...\n');

    // Find PENDING ads with demo titles
    const pendingAds = await prisma.ad.findMany({
      where: {
        status: 'PENDING',
        OR: [
          { title: { contains: 'iPhone 15' } },
          { title: { contains: 'Samsung Galaxy S24' } },
          { title: { contains: 'OnePlus 12' } },
          { title: { contains: 'Xiaomi 14' } },
          { title: { contains: 'Vivo X100' } },
          { title: { contains: 'Realme GT' } },
          { title: { contains: 'Honda City' } },
          { title: { contains: 'Yamaha MT-15' } },
          { title: { contains: 'Maruti Swift' } },
          { title: { contains: 'Royal Enfield' } },
          { title: { contains: 'Hyundai Creta' } },
          { title: { contains: 'BHK' } },
          { title: { contains: 'MacBook Pro' } },
          { title: { contains: 'Samsung 55"' } },
          { title: { contains: 'Sony WH-1000XM5' } },
          { title: { contains: 'Canon EOS' } },
          { title: { contains: 'iPad Pro' } },
          { title: { contains: 'PlayStation 5' } },
        ]
      },
      select: { id: true, title: true },
    });

    if (pendingAds.length === 0) {
      console.log('No pending demo ads found.');
      return;
    }

    console.log(`Found ${pendingAds.length} pending demo ads. Approving...\n`);

    const result = await prisma.ad.updateMany({
      where: {
        id: { in: pendingAds.map(a => a.id) },
        status: 'PENDING',
      },
      data: {
        status: 'APPROVED',
        moderationStatus: 'approved',
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Approved ${result.count} demo ads!`);
    console.log('\nApproved ads:');
    pendingAds.forEach((ad, i) => {
      console.log(`  ${i + 1}. ${ad.title}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

approveDemoAds();

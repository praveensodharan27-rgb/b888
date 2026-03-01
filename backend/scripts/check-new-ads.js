const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkNewAds() {
  try {
    console.log('\n📊 Checking Newly Created Demo Ads...\n');

    // Find ads we just created (by title patterns)
    const demoAds = await prisma.ad.findMany({
      where: {
        OR: [
          { title: { contains: 'iPhone 15' } },
          { title: { contains: 'Samsung Galaxy S24' } },
          { title: { contains: 'OnePlus 12' } },
          { title: { contains: 'Honda City' } },
          { title: { contains: 'Yamaha MT-15' } },
          { title: { contains: 'MacBook Pro' } },
          { title: { contains: 'BHK' } },
        ]
      },
      select: {
        id: true,
        title: true,
        status: true,
        city: true,
        state: true,
        locationId: true,
        categoryId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    console.log(`Found ${demoAds.length} demo ads:\n`);
    demoAds.forEach((ad, i) => {
      console.log(`${i + 1}. ${ad.title}`);
      console.log(`   Status: ${ad.status}`);
      console.log(`   City: ${ad.city || 'N/A'}, State: ${ad.state || 'N/A'}`);
      console.log(`   LocationId: ${ad.locationId || 'N/A'}`);
      console.log(`   Created: ${new Date(ad.createdAt).toLocaleString()}`);
      console.log('');
    });

    // Check approved count
    const approved = demoAds.filter(a => a.status === 'APPROVED').length;
    console.log(`\n✅ Approved: ${approved}/${demoAds.length}`);

    // Test if they would show with Mumbai filter
    const mumbaiAds = demoAds.filter(a => 
      a.status === 'APPROVED' && 
      (a.city === 'Mumbai' || a.state === 'Maharashtra')
    );
    console.log(`\n📍 Would show for Mumbai filter: ${mumbaiAds.length} ads`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNewAds();

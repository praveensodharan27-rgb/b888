const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkAdsStatus() {
  try {
    console.log('\n📊 Checking Ads Status...\n');

    // Get total ads count
    const totalAds = await prisma.ad.count();
    console.log(`Total ads in database: ${totalAds}`);

    // Get ads by status
    const byStatus = await prisma.ad.groupBy({
      by: ['status'],
      _count: true,
    });
    console.log('\nAds by status:');
    byStatus.forEach(s => console.log(`  ${s.status}: ${s._count}`));

    // Get sample ads
    const sampleAds = await prisma.ad.findMany({
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        city: true,
        state: true,
        locationId: true,
        categoryId: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('\n📝 Sample ads (latest 5):');
    sampleAds.forEach((ad, i) => {
      console.log(`\n${i + 1}. ${ad.title}`);
      console.log(`   Status: ${ad.status}`);
      console.log(`   City: ${ad.city || 'N/A'}, State: ${ad.state || 'N/A'}`);
      console.log(`   LocationId: ${ad.locationId || 'N/A'}`);
      console.log(`   CategoryId: ${ad.categoryId || 'N/A'}`);
      console.log(`   ExpiresAt: ${ad.expiresAt ? new Date(ad.expiresAt).toLocaleDateString() : 'N/A'}`);
    });

    // Check approved ads
    const approvedAds = await prisma.ad.count({
      where: {
        status: 'APPROVED',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });
    console.log(`\n✅ Approved & Not Expired: ${approvedAds}`);

    // Check location matching
    const locations = await prisma.location.findMany({
      take: 10,
      select: { id: true, name: true, city: true, state: true, slug: true },
    });
    console.log(`\n📍 Sample locations (${locations.length}):`);
    locations.slice(0, 5).forEach(loc => {
      console.log(`   ${loc.name} (${loc.city}, ${loc.state}) - ID: ${loc.id}`);
    });

    // Check if ads have matching locations
    const adsWithLocation = await prisma.ad.count({
      where: {
        status: 'APPROVED',
        locationId: { not: null },
      }
    });
    console.log(`\n📌 Approved ads with locationId: ${adsWithLocation}`);

    const adsWithCityState = await prisma.ad.count({
      where: {
        status: 'APPROVED',
        city: { not: null },
        state: { not: null },
      }
    });
    console.log(`📌 Approved ads with city/state: ${adsWithCityState}`);

    // Test location filter matching
    console.log(`\n🔍 Testing location filter matching:`);
    const testCity = 'Mumbai';
    const testState = 'Maharashtra';
    
    const matchingLocations = await prisma.location.findMany({
      where: {
        city: testCity,
        state: testState,
        isActive: true,
      },
      select: { id: true, name: true },
    });
    console.log(`   Locations matching "${testCity}, ${testState}": ${matchingLocations.length}`);
    if (matchingLocations.length > 0) {
      matchingLocations.slice(0, 3).forEach(loc => console.log(`     - ${loc.name} (ID: ${loc.id})`));
    }
    
    const adsByLocationId = await prisma.ad.count({
      where: {
        status: 'APPROVED',
        locationId: { in: matchingLocations.map(l => l.id) },
      }
    });
    console.log(`   Ads with matching locationId: ${adsByLocationId}`);
    
    const adsByDirectCityState = await prisma.ad.count({
      where: {
        status: 'APPROVED',
        city: testCity,
        state: testState,
      }
    });
    console.log(`   Ads with direct city/state match: ${adsByDirectCityState}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdsStatus();

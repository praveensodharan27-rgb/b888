/**
 * Reactivate INACTIVE and EXPIRED ads to populate the home feed
 * This script will:
 * 1. Change INACTIVE ads to APPROVED
 * 2. Change EXPIRED ads to APPROVED and extend their expiry date
 * 3. Re-index them in MeiliSearch
 */

const { PrismaClient } = require('@prisma/client');
const { indexAds } = require('../services/meilisearch');
const prisma = new PrismaClient();

async function reactivateAds() {
  try {
    console.log('🔄 Starting ad reactivation process...\n');
    
    // 1. Reactivate INACTIVE ads
    console.log('📋 Step 1: Reactivating INACTIVE ads...');
    const inactiveAds = await prisma.ad.findMany({
      where: { status: 'INACTIVE' },
      take: 100, // Limit to 100 for now
    });
    
    console.log(`   Found ${inactiveAds.length} INACTIVE ads`);
    
    if (inactiveAds.length > 0) {
      const inactiveIds = inactiveAds.map(ad => ad.id);
      const result1 = await prisma.ad.updateMany({
        where: { id: { in: inactiveIds } },
        data: {
          status: 'APPROVED',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        }
      });
      console.log(`   ✅ Reactivated ${result1.count} INACTIVE ads\n`);
    }
    
    // 2. Reactivate EXPIRED ads
    console.log('📋 Step 2: Reactivating EXPIRED ads...');
    const expiredAds = await prisma.ad.findMany({
      where: { status: 'EXPIRED' },
      take: 200, // Limit to 200 for now
    });
    
    console.log(`   Found ${expiredAds.length} EXPIRED ads`);
    
    if (expiredAds.length > 0) {
      const expiredIds = expiredAds.map(ad => ad.id);
      const result2 = await prisma.ad.updateMany({
        where: { id: { in: expiredIds } },
        data: {
          status: 'APPROVED',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        }
      });
      console.log(`   ✅ Reactivated ${result2.count} EXPIRED ads\n`);
    }
    
    // 3. Get updated count
    console.log('📊 Step 3: Checking updated counts...');
    const approvedCount = await prisma.ad.count({ where: { status: 'APPROVED' } });
    console.log(`   Total APPROVED ads now: ${approvedCount}\n`);
    
    // 4. Re-index in MeiliSearch
    console.log('🔍 Step 4: Re-indexing ads in MeiliSearch...');
    const adsToIndex = await prisma.ad.findMany({
      where: { status: 'APPROVED' },
      include: {
        category: { select: { id: true, name: true } },
        subcategory: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
      take: 500, // Index first 500 ads
    });
    
    if (adsToIndex.length > 0) {
      await indexAds(adsToIndex);
      console.log(`   ✅ Indexed ${adsToIndex.length} ads in MeiliSearch\n`);
    }
    
    console.log('✅ Ad reactivation complete!\n');
    console.log('📋 Summary:');
    console.log(`   - Total APPROVED ads: ${approvedCount}`);
    console.log(`   - Indexed in MeiliSearch: ${adsToIndex.length}`);
    console.log('');
    console.log('🎉 Your home feed should now show products!');
    console.log('   Refresh your browser to see the changes.');
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error reactivating ads:', error.message);
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

reactivateAds();

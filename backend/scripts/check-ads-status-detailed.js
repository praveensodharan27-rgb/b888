const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdsStatus() {
  try {
    // Get all unique statuses
    const allAds = await prisma.ad.findMany({
      select: { status: true }
    });
    
    const statusCounts = {};
    allAds.forEach(ad => {
      const status = ad.status || 'NULL';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log('📊 Detailed Ads Status Breakdown:');
    console.log('   Total ads:', allAds.length);
    console.log('');
    
    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        const percentage = ((count / allAds.length) * 100).toFixed(1);
        console.log(`   ${status}: ${count} (${percentage}%)`);
      });
    
    console.log('');
    
    // Check if we need to activate ads
    const inactiveCount = statusCounts['INACTIVE'] || 0;
    const approvedCount = statusCounts['APPROVED'] || 0;
    
    if (inactiveCount > 0 && approvedCount < 50) {
      console.log('💡 Solution: Reactivate INACTIVE ads');
      console.log('   Many ads are INACTIVE. You can reactivate them to populate the home feed.');
      console.log('');
      console.log('   Run this command to reactivate ads:');
      console.log('   node scripts/reactivate-inactive-ads.js');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkAdsStatus();

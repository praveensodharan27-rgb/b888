const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdsCount() {
  try {
    const total = await prisma.ad.count();
    const approved = await prisma.ad.count({ where: { status: 'APPROVED' } });
    const pending = await prisma.ad.count({ where: { status: 'PENDING' } });
    const rejected = await prisma.ad.count({ where: { status: 'REJECTED' } });
    const inactive = await prisma.ad.count({ where: { status: 'INACTIVE' } });
    
    console.log('📊 Ads Count Summary:');
    console.log('   Total ads:', total);
    console.log('   APPROVED:', approved);
    console.log('   PENDING:', pending);
    console.log('   REJECTED:', rejected);
    console.log('   INACTIVE:', inactive);
    
    if (approved === 0) {
      console.log('\n⚠️  No APPROVED ads found!');
      console.log('   This is why the home feed is empty.');
      console.log('\n💡 Solutions:');
      console.log('   1. Approve pending ads: node scripts/auto-approve-pending.js');
      console.log('   2. Generate demo ads: node scripts/generate-realistic-demo-ads.js');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkAdsCount();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const total = await prisma.ad.count();
    const approved = await prisma.ad.count({ where: { status: 'APPROVED' } });
    const pending = await prisma.ad.count({ where: { status: 'PENDING' } });
    const rejected = await prisma.ad.count({ where: { status: 'REJECTED' } });
    const noModerationStatus = await prisma.ad.count({ 
      where: { 
        status: 'APPROVED',
        OR: [
          { moderationStatus: null },
          { moderationStatus: 'pending_review' }
        ]
      }
    });
    
    console.log('📊 Ad Statistics:');
    console.log('─────────────────────────────');
    console.log(`Total ads: ${total}`);
    console.log(`Approved ads: ${approved}`);
    console.log(`Pending ads: ${pending}`);
    console.log(`Rejected ads: ${rejected}`);
    console.log(`Approved ads without moderation: ${noModerationStatus}`);
    
    if (noModerationStatus > 0) {
      console.log(`\n⚠️  Found ${noModerationStatus} approved ads that haven't been checked yet.`);
      console.log('   Run: npm run check-existing-ads');
    } else {
      console.log('\n✅ All approved ads have been reviewed.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();

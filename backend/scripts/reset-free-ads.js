// Reset Free Ads for All Users
// Sets freeAdsUsed to 0 for all users (giving them 2 free ads)

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetFreeAds() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🔄 Resetting Free Ads for All Users');
    console.log('='.repeat(70) + '\n');

    // Update all users to set freeAdsUsed to 0
    const result = await prisma.user.updateMany({
      data: {
        freeAdsUsed: 0
      }
    });

    console.log(`✅ Successfully reset free ads for ${result.count} user(s)`);
    console.log('   All users now have 2 free ads available\n');

    // Get statistics
    const totalUsers = await prisma.user.count();
    const usersWithFreeAds = await prisma.user.count({
      where: {
        freeAdsUsed: { lt: 2 }
      }
    });

    console.log('📊 Statistics:');
    console.log(`   Total users: ${totalUsers}`);
    console.log(`   Users with free ads available: ${usersWithFreeAds}`);
    console.log(`   Users who used free ads: ${totalUsers - usersWithFreeAds}\n`);

    console.log('='.repeat(70));
    console.log('✅ Free ads reset completed successfully!');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Error resetting free ads:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
resetFreeAds()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


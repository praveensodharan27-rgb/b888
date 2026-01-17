const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBusinessPackagesStatus() {
  try {
    console.log('📊 Business Packages Database Status\n');
    console.log('=' .repeat(50));

    // Check UserBusinessPackage collection
    const userBusinessPackagesCount = await prisma.userBusinessPackage.count();
    console.log(`\n✅ UserBusinessPackage Collection:`);
    console.log(`   Total Records: ${userBusinessPackagesCount}`);

    if (userBusinessPackagesCount > 0) {
      const userPackages = await prisma.userBusinessPackage.findMany({
        take: 5,
        orderBy: { purchaseTime: 'desc' }
      });
      console.log(`\n   Recent Packages:`);
      userPackages.forEach((pkg, i) => {
        console.log(`   ${i + 1}. ${pkg.packageType} - Status: ${pkg.status} - ${pkg.usedAds}/${pkg.totalAds} ads used`);
      });
    }

    // Check BusinessPackage collection (old table)
    const businessPackagesCount = await prisma.businessPackage.count();
    console.log(`\n📦 BusinessPackage Collection (Legacy):`);
    console.log(`   Total Records: ${businessPackagesCount}`);

    if (businessPackagesCount > 0) {
      const businessPackages = await prisma.businessPackage.findMany({
        where: {
          status: { in: ['paid', 'verified'] }
        },
        take: 5,
        orderBy: { createdAt: 'desc' }
      });
      console.log(`\n   Active Packages (paid/verified):`);
      businessPackages.forEach((pkg, i) => {
        const remaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
        console.log(`   ${i + 1}. ${pkg.packageType} - ${pkg.adsUsed}/${pkg.totalAdsAllowed} ads used (${remaining} remaining)`);
      });
    }

    // Summary
    console.log(`\n${'='.repeat(50)}`);
    console.log(`\n📋 Summary:`);
    console.log(`   ✅ UserBusinessPackage table: Created and accessible`);
    console.log(`   📦 UserBusinessPackage records: ${userBusinessPackagesCount}`);
    console.log(`   📦 BusinessPackage records (legacy): ${businessPackagesCount}`);
    
    if (businessPackagesCount > 0 && userBusinessPackagesCount === 0) {
      console.log(`\n   ℹ️  Note: You have ${businessPackagesCount} packages in the legacy table.`);
      console.log(`      New purchases will be saved to UserBusinessPackage table.`);
      console.log(`      The system will use both tables (backward compatibility).`);
    }

    console.log(`\n✅ Database is ready for use!\n`);

  } catch (error) {
    console.error('❌ Error checking database status:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

checkBusinessPackagesStatus();


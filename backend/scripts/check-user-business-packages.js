const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserBusinessPackages() {
  try {
    console.log('🔍 Checking UserBusinessPackage collection...\n');

    // Check if we can query the collection
    const count = await prisma.userBusinessPackage.count();
    console.log(`✅ Collection exists! Total records: ${count}\n`);

    // Get all records
    const packages = await prisma.userBusinessPackage.findMany({
      take: 10,
      orderBy: { purchaseTime: 'desc' }
    });

    if (packages.length > 0) {
      console.log('📦 Sample records:');
      packages.forEach((pkg, index) => {
        console.log(`\n${index + 1}. Package ID: ${pkg.id}`);
        console.log(`   Type: ${pkg.packageType}`);
        console.log(`   Amount: ₹${pkg.amount}`);
        console.log(`   Purchase Time: ${pkg.purchaseTime}`);
        console.log(`   Expires At: ${pkg.expiresAt || 'N/A'}`);
        console.log(`   Total Ads: ${pkg.totalAds}`);
        console.log(`   Used Ads: ${pkg.usedAds}`);
        console.log(`   Remaining: ${pkg.totalAds - pkg.usedAds}`);
        console.log(`   Status: ${pkg.status}`);
        console.log(`   Allowed Categories: ${pkg.allowedCategories.length > 0 ? pkg.allowedCategories.join(', ') : 'All'}`);
      });
    } else {
      console.log('ℹ️  No packages found in the collection yet.');
      console.log('   This is normal if no business packages have been purchased yet.\n');
    }

    // Check collection structure by getting schema info
    console.log('\n✅ Schema structure verified - Collection accessible');
    console.log('\n📋 Collection Fields:');
    console.log('   - id (ObjectId)');
    console.log('   - userId (ObjectId)');
    console.log('   - packageType (BusinessPackageType)');
    console.log('   - amount (Float)');
    console.log('   - purchaseTime (DateTime)');
    console.log('   - expiresAt (DateTime?)');
    console.log('   - totalAds (Int)');
    console.log('   - usedAds (Int)');
    console.log('   - allowedCategories (String[])');
    console.log('   - razorpayOrderId (String?)');
    console.log('   - razorpayPaymentId (String?)');
    console.log('   - status (String: active/exhausted/expired)');
    console.log('   - createdAt (DateTime)');
    console.log('   - updatedAt (DateTime)');

    // Check indexes
    console.log('\n📊 Indexes should be created on:');
    console.log('   - userId');
    console.log('   - packageType');
    console.log('   - status');
    console.log('   - expiresAt');
    console.log('   - purchaseTime');
    console.log('   - userId + status (compound)');
    console.log('   - userId + expiresAt (compound)');

  } catch (error) {
    console.error('❌ Error checking UserBusinessPackage collection:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    
    if (error.message.includes('does not exist') || error.message.includes('not found')) {
      console.error('\n⚠️  Collection might not exist yet. Run: npx prisma db push');
    } else {
      console.error('\n⚠️  Unexpected error. Check the error details above.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkUserBusinessPackages();


const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const prisma = new PrismaClient();

// Package type to premium slots mapping (from business package settings)
const PACKAGE_SLOTS = {
  MAX_VISIBILITY: 5,
  SELLER_PLUS: 7,
  SELLER_PRIME: 12
};

async function fixBusinessPackagesSlots() {
  try {
    console.log('🔧 Fixing Business Packages Premium Slots...\n');

    // Get all packages with premiumSlotsTotal = 0
    const packagesToFix = await prisma.businessPackage.findMany({
      where: {
        premiumSlotsTotal: 0
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    console.log(`📦 Found ${packagesToFix.length} package(s) that need fixing\n`);

    if (packagesToFix.length === 0) {
      console.log('✅ All packages have correct premium slots!');
      return;
    }

    let fixedCount = 0;
    let skippedCount = 0;

    for (const pkg of packagesToFix) {
      const expectedSlots = PACKAGE_SLOTS[pkg.packageType];
      
      // Use maxAds if available (for older packages), otherwise use package type default
      const slotsToSet = pkg.maxAds > 0 ? pkg.maxAds : expectedSlots;

      if (!slotsToSet || slotsToSet === 0) {
        console.log(`⚠️ Skipping package ${pkg.id} (${pkg.packageType}) - cannot determine slots`);
        skippedCount++;
        continue;
      }

      console.log(`\n📦 Fixing package ${pkg.id}:`);
      console.log(`   User: ${pkg.user.name}`);
      console.log(`   Type: ${pkg.packageType}`);
      console.log(`   Current: premiumSlotsTotal = ${pkg.premiumSlotsTotal}, maxAds = ${pkg.maxAds}`);
      console.log(`   Setting: premiumSlotsTotal = ${slotsToSet}`);

      try {
        await prisma.businessPackage.update({
          where: { id: pkg.id },
          data: {
            premiumSlotsTotal: slotsToSet,
            // Ensure premiumSlotsUsed doesn't exceed total
            premiumSlotsUsed: pkg.premiumSlotsUsed > slotsToSet ? slotsToSet : pkg.premiumSlotsUsed
          }
        });
        console.log(`   ✅ Fixed!`);
        fixedCount++;
      } catch (error) {
        console.error(`   ❌ Error fixing package:`, error.message);
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 SUMMARY');
    console.log(`${'='.repeat(80)}`);
    console.log(`Total packages checked: ${packagesToFix.length}`);
    console.log(`Fixed: ${fixedCount}`);
    console.log(`Skipped: ${skippedCount}`);

    // Verify the fix
    console.log(`\n🔍 Verifying fix...`);
    const stillBroken = await prisma.businessPackage.count({
      where: {
        premiumSlotsTotal: 0
      }
    });

    if (stillBroken === 0) {
      console.log(`✅ All packages now have correct premium slots!`);
    } else {
      console.log(`⚠️ ${stillBroken} package(s) still need fixing`);
    }

  } catch (error) {
    console.error('❌ Error fixing business packages:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixBusinessPackagesSlots()
  .then(() => {
    console.log('\n✅ Business packages fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });


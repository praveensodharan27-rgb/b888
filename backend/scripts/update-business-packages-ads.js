const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateBusinessPackages() {
  try {
    console.log('🔄 Starting business packages update...\n');

    // Get all business packages
    const allBusinessPackages = await prisma.businessPackage.findMany({
      select: {
        id: true,
        packageType: true,
        maxAds: true,
        totalAdsAllowed: true,
        adsUsed: true,
        premiumSlotsTotal: true,
        premiumSlotsUsed: true,
        status: true,
        userId: true
      }
    });

    // Filter packages that need updating
    const packages = allBusinessPackages.filter(pkg => 
      !pkg.totalAdsAllowed || 
      pkg.totalAdsAllowed === 0 || 
      pkg.adsUsed === null
    );

    console.log(`📦 Found ${packages.length} packages to update\n`);

    if (packages.length === 0) {
      console.log('✅ No packages need updating. All packages are up to date!');
      return;
    }

    // Default values based on package type (matching business-package.js)
    const packageDefaults = {
      MAX_VISIBILITY: 5,
      SELLER_PLUS: 7,
      SELLER_PRIME: 12
    };

    let updated = 0;
    let skipped = 0;

    for (const pkg of packages) {
      try {
        // Determine totalAdsAllowed
        let totalAdsAllowed = pkg.totalAdsAllowed;
        
        // If totalAdsAllowed is 0 or null, use maxAds or package type default
        if (!totalAdsAllowed || totalAdsAllowed === 0) {
          if (pkg.maxAds && pkg.maxAds > 0) {
            totalAdsAllowed = pkg.maxAds;
          } else if (pkg.premiumSlotsTotal && pkg.premiumSlotsTotal > 0) {
            totalAdsAllowed = pkg.premiumSlotsTotal;
          } else {
            totalAdsAllowed = packageDefaults[pkg.packageType] || 0;
          }
        }

        // Use existing adsUsed or default to 0
        const adsUsed = pkg.adsUsed !== null ? pkg.adsUsed : 0;

        // Only update if values need to change
        if (pkg.totalAdsAllowed !== totalAdsAllowed || pkg.adsUsed !== adsUsed) {
          await prisma.businessPackage.update({
            where: { id: pkg.id },
            data: {
              totalAdsAllowed: totalAdsAllowed,
              adsUsed: adsUsed
            }
          });

          console.log(`✅ Updated package ${pkg.id}:`);
          console.log(`   Type: ${pkg.packageType}`);
          console.log(`   totalAdsAllowed: ${pkg.totalAdsAllowed || 0} → ${totalAdsAllowed}`);
          console.log(`   adsUsed: ${pkg.adsUsed ?? 'null'} → ${adsUsed}`);
          console.log(`   Status: ${pkg.status}\n`);
          
          updated++;
        } else {
          console.log(`⏭️  Skipped package ${pkg.id} (already up to date)\n`);
          skipped++;
        }
      } catch (error) {
        console.error(`❌ Error updating package ${pkg.id}:`, error.message);
        skipped++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Updated: ${updated} packages`);
    console.log(`   ⏭️  Skipped: ${skipped} packages`);
    console.log(`   📦 Total processed: ${packages.length} packages`);

    // Show final statistics
    const allPackages = await prisma.businessPackage.findMany({
      select: {
        packageType: true,
        totalAdsAllowed: true,
        adsUsed: true,
        status: true
      }
    });

    const activePackages = allPackages.filter(p => p.status === 'paid');
    const totalAdsAllowed = activePackages.reduce((sum, p) => sum + (p.totalAdsAllowed || 0), 0);
    const totalAdsUsed = activePackages.reduce((sum, p) => sum + (p.adsUsed || 0), 0);
    const totalAdsRemaining = totalAdsAllowed - totalAdsUsed;

    console.log('\n📈 Active Packages Statistics:');
    console.log(`   Active packages: ${activePackages.length}`);
    console.log(`   Total ads allowed: ${totalAdsAllowed}`);
    console.log(`   Total ads used: ${totalAdsUsed}`);
    console.log(`   Total ads remaining: ${totalAdsRemaining}`);

  } catch (error) {
    console.error('❌ Error updating business packages:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateBusinessPackages()
  .then(() => {
    console.log('\n✅ Update completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Update failed:', error);
    process.exit(1);
  });


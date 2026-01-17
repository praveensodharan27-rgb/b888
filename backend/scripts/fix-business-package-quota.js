/**
 * Fix Business Package Quota Script
 * 
 * This script fixes business packages that have totalAdsAllowed: 0
 * by setting it based on packageType defaults
 * 
 * Usage: node backend/scripts/fix-business-package-quota.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Default maxAds by package type
const DEFAULT_MAX_ADS = {
  MAX_VISIBILITY: 5,
  SELLER_PLUS: 7,
  SELLER_PRIME: 12
};

async function fixBusinessPackageQuota() {
  try {
    console.log('🔄 Starting business package quota fix...');
    
    // Find all business packages
    const allPackages = await prisma.businessPackage.findMany({
      select: {
        id: true,
        packageType: true,
        totalAdsAllowed: true,
        maxAds: true,
        adsUsed: true,
        status: true,
        expiresAt: true
      }
    });
    
    console.log(`📊 Total business packages in database: ${allPackages.length}`);
    
    // Filter packages with totalAdsAllowed: 0 or null (or undefined)
    const packages = allPackages.filter(pkg => {
      const totalAds = pkg.totalAdsAllowed;
      return totalAds === 0 || totalAds === null || totalAds === undefined;
    });
    
    console.log(`📊 Packages with totalAdsAllowed: 0/null: ${packages.length}`);
    
    // Also log all packages for debugging
    allPackages.forEach((pkg, index) => {
      console.log(`   Package ${index + 1}: ${pkg.packageType} - totalAdsAllowed: ${pkg.totalAdsAllowed}, maxAds: ${pkg.maxAds}, status: ${pkg.status}`);
    });
    
    console.log(`📊 Found ${packages.length} packages with totalAdsAllowed: 0 or null`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const pkg of packages) {
      // Determine correct totalAdsAllowed
      let totalAdsAllowed = 0;
      
      // First, try to use maxAds if available
      if (pkg.maxAds && pkg.maxAds > 0) {
        totalAdsAllowed = pkg.maxAds;
      } else {
        // Use default based on packageType
        totalAdsAllowed = DEFAULT_MAX_ADS[pkg.packageType] || 0;
      }
      
      if (totalAdsAllowed === 0) {
        console.log(`⚠️  Skipping package ${pkg.id}: Unknown packageType "${pkg.packageType}"`);
        skipped++;
        continue;
      }
      
      // Update the package
      await prisma.businessPackage.update({
        where: { id: pkg.id },
        data: { totalAdsAllowed }
      });
      
      updated++;
      console.log(`✅ Updated package ${pkg.id} (${pkg.packageType}): totalAdsAllowed = ${totalAdsAllowed}`);
    }
    
    console.log('\n📊 Summary:');
    console.log(`   Total packages found: ${packages.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log('\n✅ Script completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during script execution:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run script
fixBusinessPackageQuota()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


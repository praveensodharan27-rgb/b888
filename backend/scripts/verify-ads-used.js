const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyAdsUsed() {
  try {
    console.log('🔍 Verifying adsUsed and adsRemaining in database...\n');

    // Get all active business packages
    const now = new Date();
    const activePackages = await prisma.businessPackage.findMany({
      where: {
        status: 'paid',
        expiresAt: {
          gt: now
        }
      },
      select: {
        id: true,
        userId: true,
        packageType: true,
        totalAdsAllowed: true,
        adsUsed: true,
        maxAds: true,
        premiumSlotsTotal: true,
        premiumSlotsUsed: true,
        status: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📦 Found ${activePackages.length} active business packages\n`);

    if (activePackages.length === 0) {
      console.log('⚠️ No active business packages found.');
      return;
    }

    // Verify each package
    let issuesFound = 0;
    let correctPackages = 0;

    for (const pkg of activePackages) {
      const adsRemaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
      const isValid = adsRemaining >= 0 && pkg.adsUsed >= 0;

      console.log(`📦 Package ${pkg.id}:`);
      console.log(`   User: ${pkg.user?.name || 'Unknown'} (${pkg.user?.email || 'N/A'})`);
      console.log(`   Type: ${pkg.packageType}`);
      console.log(`   totalAdsAllowed: ${pkg.totalAdsAllowed || 0}`);
      console.log(`   adsUsed: ${pkg.adsUsed || 0}`);
      console.log(`   adsRemaining: ${adsRemaining}`);
      console.log(`   Status: ${pkg.status}`);
      console.log(`   Expires: ${pkg.expiresAt ? new Date(pkg.expiresAt).toLocaleString() : 'N/A'}`);

      // Check for issues
      const issues = [];
      
      if (pkg.totalAdsAllowed === 0 || pkg.totalAdsAllowed === null) {
        issues.push('⚠️ totalAdsAllowed is 0 or null');
      }
      
      if (pkg.adsUsed === null) {
        issues.push('⚠️ adsUsed is null (should be 0 or positive number)');
      }
      
      if (adsRemaining < 0) {
        issues.push(`❌ adsRemaining is negative (${adsRemaining}) - adsUsed exceeds totalAdsAllowed!`);
      }
      
      if (pkg.adsUsed > pkg.totalAdsAllowed) {
        issues.push(`❌ adsUsed (${pkg.adsUsed}) exceeds totalAdsAllowed (${pkg.totalAdsAllowed})!`);
      }

      // Check deprecated fields for reference
      if (pkg.maxAds > 0 && pkg.totalAdsAllowed !== pkg.maxAds) {
        console.log(`   ℹ️  maxAds (deprecated): ${pkg.maxAds} (differs from totalAdsAllowed)`);
      }
      
      if (pkg.premiumSlotsTotal > 0) {
        console.log(`   ℹ️  premiumSlotsTotal (deprecated): ${pkg.premiumSlotsTotal}`);
        console.log(`   ℹ️  premiumSlotsUsed (deprecated): ${pkg.premiumSlotsUsed || 0}`);
      }

      if (issues.length > 0) {
        console.log(`   ❌ Issues found:`);
        issues.forEach(issue => console.log(`      ${issue}`));
        issuesFound++;
      } else {
        console.log(`   ✅ Package data is correct`);
        correctPackages++;
      }

      // Count actual ads posted by this user
      const userAdsCount = await prisma.ad.count({
        where: {
          userId: pkg.userId,
          status: {
            in: ['PENDING', 'APPROVED']
          }
        }
      });

      console.log(`   📊 User's total ads (PENDING + APPROVED): ${userAdsCount}`);
      console.log('');
    }

    // Summary
    console.log('\n📊 Verification Summary:');
    console.log(`   ✅ Correct packages: ${correctPackages}`);
    console.log(`   ⚠️  Packages with issues: ${issuesFound}`);
    console.log(`   📦 Total active packages: ${activePackages.length}`);

    // Calculate totals
    const totalAdsAllowed = activePackages.reduce((sum, p) => sum + (p.totalAdsAllowed || 0), 0);
    const totalAdsUsed = activePackages.reduce((sum, p) => sum + (p.adsUsed || 0), 0);
    const totalAdsRemaining = totalAdsAllowed - totalAdsUsed;

    console.log('\n📈 Aggregate Statistics:');
    console.log(`   Total ads allowed: ${totalAdsAllowed}`);
    console.log(`   Total ads used: ${totalAdsUsed}`);
    console.log(`   Total ads remaining: ${totalAdsRemaining}`);

    // Group by user
    const userPackages = {};
    activePackages.forEach(pkg => {
      const userId = pkg.userId;
      if (!userPackages[userId]) {
        userPackages[userId] = {
          user: pkg.user,
          packages: []
        };
      }
      userPackages[userId].packages.push(pkg);
    });

    console.log('\n👥 Per-User Summary:');
    for (const [userId, data] of Object.entries(userPackages)) {
      const userTotalAllowed = data.packages.reduce((sum, p) => sum + (p.totalAdsAllowed || 0), 0);
      const userTotalUsed = data.packages.reduce((sum, p) => sum + (p.adsUsed || 0), 0);
      const userTotalRemaining = userTotalAllowed - userTotalUsed;

      console.log(`\n   User: ${data.user?.name || 'Unknown'} (${data.user?.email || 'N/A'})`);
      console.log(`   Packages: ${data.packages.length}`);
      console.log(`   Total ads allowed: ${userTotalAllowed}`);
      console.log(`   Total ads used: ${userTotalUsed}`);
      console.log(`   Total ads remaining: ${userTotalRemaining}`);
    }

  } catch (error) {
    console.error('❌ Error verifying adsUsed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyAdsUsed()
  .then(() => {
    console.log('\n✅ Verification completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });


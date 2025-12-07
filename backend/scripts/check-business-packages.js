const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkBusinessPackages() {
  try {
    console.log('📦 Checking Business Packages in Database...\n');

    // Get all business packages
    const allPackages = await prisma.businessPackage.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`✅ Found ${allPackages.length} business package(s) in database\n`);

    if (allPackages.length === 0) {
      console.log('ℹ️ No business packages found in database.');
      return;
    }

    // Display all packages
    allPackages.forEach((pkg, index) => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Package #${index + 1}`);
      console.log(`${'='.repeat(80)}`);
      console.log(`ID: ${pkg.id}`);
      console.log(`User: ${pkg.user.name} (${pkg.user.email || pkg.user.phone || 'N/A'})`);
      console.log(`User ID: ${pkg.userId}`);
      console.log(`Package Type: ${pkg.packageType}`);
      console.log(`Amount: ₹${pkg.amount}`);
      console.log(`Duration: ${pkg.duration} days`);
      console.log(`Status: ${pkg.status}`);
      console.log(`\n📊 Premium Slots:`);
      console.log(`   Total: ${pkg.premiumSlotsTotal}`);
      console.log(`   Used: ${pkg.premiumSlotsUsed}`);
      console.log(`   Available: ${pkg.premiumSlotsTotal - pkg.premiumSlotsUsed}`);
      console.log(`\n📅 Dates:`);
      console.log(`   Created: ${pkg.createdAt.toLocaleString()}`);
      if (pkg.startDate) {
        console.log(`   Started: ${pkg.startDate.toLocaleString()}`);
      }
      if (pkg.expiresAt) {
        const now = new Date();
        const isExpired = pkg.expiresAt < now;
        const daysRemaining = Math.ceil((pkg.expiresAt - now) / (1000 * 60 * 60 * 24));
        console.log(`   Expires: ${pkg.expiresAt.toLocaleString()}`);
        console.log(`   Status: ${isExpired ? '❌ EXPIRED' : `✅ Active (${daysRemaining} days remaining)`}`);
      }
      console.log(`\n💳 Payment:`);
      console.log(`   Razorpay Order ID: ${pkg.razorpayOrderId || 'N/A'}`);
      console.log(`   Razorpay Payment ID: ${pkg.razorpayPaymentId || 'N/A'}`);
      
      // Legacy maxAds (deprecated)
      if (pkg.maxAds) {
        console.log(`\n⚠️ Legacy maxAds: ${pkg.maxAds} (deprecated - use premiumSlotsTotal)`);
      }
    });

    // Summary statistics
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 SUMMARY STATISTICS');
    console.log(`${'='.repeat(80)}`);
    
    const activePackages = allPackages.filter(pkg => {
      if (pkg.status !== 'paid') return false;
      if (!pkg.expiresAt) return false;
      return pkg.expiresAt > new Date();
    });

    const expiredPackages = allPackages.filter(pkg => {
      if (pkg.status !== 'paid') return false;
      if (!pkg.expiresAt) return true; // No expiry date = expired
      return pkg.expiresAt <= new Date();
    });

    const pendingPackages = allPackages.filter(pkg => pkg.status === 'pending');
    const paidPackages = allPackages.filter(pkg => pkg.status === 'paid');

    console.log(`Total Packages: ${allPackages.length}`);
    console.log(`Active Packages: ${activePackages.length}`);
    console.log(`Expired Packages: ${expiredPackages.length}`);
    console.log(`Pending Packages: ${pendingPackages.length}`);
    console.log(`Paid Packages: ${paidPackages.length}`);

    // Premium slots statistics
    const totalSlots = allPackages.reduce((sum, pkg) => sum + (pkg.premiumSlotsTotal || 0), 0);
    const totalUsed = allPackages.reduce((sum, pkg) => sum + (pkg.premiumSlotsUsed || 0), 0);
    const activeTotalSlots = activePackages.reduce((sum, pkg) => sum + (pkg.premiumSlotsTotal || 0), 0);
    const activeUsedSlots = activePackages.reduce((sum, pkg) => sum + (pkg.premiumSlotsUsed || 0), 0);

    console.log(`\n📊 Premium Slots Statistics:`);
    console.log(`   Total (all packages): ${totalSlots} slots, ${totalUsed} used, ${totalSlots - totalUsed} available`);
    console.log(`   Active packages: ${activeTotalSlots} slots, ${activeUsedSlots} used, ${activeTotalSlots - activeUsedSlots} available`);

    // Group by user
    const packagesByUser = {};
    allPackages.forEach(pkg => {
      if (!packagesByUser[pkg.userId]) {
        packagesByUser[pkg.userId] = {
          user: pkg.user,
          packages: []
        };
      }
      packagesByUser[pkg.userId].packages.push(pkg);
    });

    console.log(`\n👥 Packages by User:`);
    Object.values(packagesByUser).forEach(({ user, packages }) => {
      const active = packages.filter(pkg => {
        if (pkg.status !== 'paid') return false;
        if (!pkg.expiresAt) return false;
        return pkg.expiresAt > new Date();
      });
      console.log(`   ${user.name}: ${packages.length} total, ${active.length} active`);

      // Show premium slots for this user
      const userTotalSlots = active.reduce((sum, pkg) => sum + (pkg.premiumSlotsTotal || 0), 0);
      const userUsedSlots = active.reduce((sum, pkg) => sum + (pkg.premiumSlotsUsed || 0), 0);
      if (userTotalSlots > 0) {
        console.log(`      Premium Slots: ${userUsedSlots}/${userTotalSlots} used, ${userTotalSlots - userUsedSlots} available`);
      }
    });

  } catch (error) {
    console.error('❌ Error checking business packages:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkBusinessPackages()
  .then(() => {
    console.log('\n✅ Business packages check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });


const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function deleteAllBusinessPackages() {
  try {
    console.log('🗑️  Deleting All Business Packages from Database...\n');

    // First, get count of all packages
    const totalCount = await prisma.businessPackage.count();
    console.log(`📊 Found ${totalCount} business package(s) in database\n`);

    if (totalCount === 0) {
      console.log('ℹ️ No business packages found in database. Nothing to delete.');
      return;
    }

    // Get all packages before deletion for logging
    const allPackages = await prisma.businessPackage.findMany({
      include: {
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

    console.log('📦 Packages to be deleted:');
    allPackages.forEach((pkg, index) => {
      console.log(`   ${index + 1}. ${pkg.user.name} - ${pkg.packageType} (${pkg.status})`);
    });

    // Delete all business packages
    console.log('\n🗑️  Deleting all business packages...');
    const result = await prisma.businessPackage.deleteMany({});
    
    console.log(`\n✅ Successfully deleted ${result.count} business package(s)`);

    // Verify deletion
    const remainingCount = await prisma.businessPackage.count();
    if (remainingCount === 0) {
      console.log('✅ Verification: All business packages have been deleted.');
    } else {
      console.log(`⚠️  Warning: ${remainingCount} package(s) still remain in database.`);
    }

  } catch (error) {
    console.error('❌ Error deleting business packages:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the deletion
console.log('⚠️  WARNING: This will delete ALL business packages from the database!');
console.log('Press Ctrl+C within 5 seconds to cancel...\n');

setTimeout(async () => {
  deleteAllBusinessPackages()
    .then(() => {
      console.log('\n✅ Business packages deletion completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}, 5000);


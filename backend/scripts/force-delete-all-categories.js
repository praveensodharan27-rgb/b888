require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Force Delete All Categories and Subcategories
 * 
 * WARNING: This will:
 * 1. Delete ALL Ads that reference categories/subcategories
 * 2. Delete ALL subcategories
 * 3. Delete ALL categories
 * 
 * This is a DESTRUCTIVE operation. Use with caution!
 */

async function forceDeleteAllCategories() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('⚠️  FORCE DELETE: All Categories and Subcategories');
    console.log('='.repeat(80) + '\n');
    console.log('⚠️  WARNING: This will delete ALL Ads referencing categories!');
    console.log('⚠️  This is a DESTRUCTIVE operation!\n');

    // Step 1: Check current state
    console.log('📊 Step 1: Checking current database state...\n');
    
    const currentCategories = await prisma.category.count();
    const currentSubcategories = await prisma.subcategory.count();
    const adsCount = await prisma.ad.count();
    
    console.log(`   Current categories: ${currentCategories}`);
    console.log(`   Current subcategories: ${currentSubcategories}`);
    console.log(`   Current ads: ${adsCount}`);

    // Step 2: Delete all Ads first
    console.log('\n🗑️  Step 2: Deleting all Ads...\n');
    
    const deletedAds = await prisma.ad.deleteMany({});
    console.log(`   ✅ Deleted ${deletedAds.count} Ads`);

    // Step 3: Delete subcategories
    console.log('\n🗑️  Step 3: Deleting subcategories...\n');
    
    const deletedSubs = await prisma.subcategory.deleteMany({});
    console.log(`   ✅ Deleted ${deletedSubs.count} subcategories`);

    // Step 4: Delete categories
    console.log('\n🗑️  Step 4: Deleting categories...\n');
    
    const deletedCats = await prisma.category.deleteMany({});
    console.log(`   ✅ Deleted ${deletedCats.count} categories`);

    // Step 5: Verify deletion
    console.log('\n📋 Step 5: Verifying deletion...\n');
    
    const remainingCategories = await prisma.category.count();
    const remainingSubcategories = await prisma.subcategory.count();
    const remainingAds = await prisma.ad.count();
    
    console.log(`   Remaining categories: ${remainingCategories}`);
    console.log(`   Remaining subcategories: ${remainingSubcategories}`);
    console.log(`   Remaining ads: ${remainingAds}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Force Deletion Complete!');
    console.log('='.repeat(80) + '\n');
    
    console.log('📊 Summary:');
    console.log(`   - Deleted ${deletedAds.count} Ads`);
    console.log(`   - Deleted ${deletedSubs.count} subcategories`);
    console.log(`   - Deleted ${deletedCats.count} categories\n`);

    console.log('💡 Next steps:');
    console.log('   1. Run: npm run seed-all-categories (to re-seed categories)');
    console.log('   2. Restart backend server');
    console.log('   3. Clear cache: npm run clear-cache\n');

  } catch (error) {
    console.error('\n❌ Error force deleting categories:', error);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

forceDeleteAllCategories();

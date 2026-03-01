require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Delete All Categories and Subcategories
 * 
 * WARNING: This will delete ALL categories and subcategories from the database.
 * This may fail if there are Ads referencing these categories (foreign key constraint).
 * 
 * If deletion fails due to foreign key constraints, the script will:
 * 1. Deactivate categories/subcategories instead
 * 2. Or show instructions to handle the foreign key relationships
 */

async function deleteAllCategories() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🗑️  Deleting All Categories and Subcategories');
    console.log('='.repeat(80) + '\n');

    // Step 1: Check current state
    console.log('📊 Step 1: Checking current database state...\n');
    
    const currentCategories = await prisma.category.findMany();
    const currentSubcategories = await prisma.subcategory.findMany();
    
    console.log(`   Current categories: ${currentCategories.length}`);
    console.log(`   Current subcategories: ${currentSubcategories.length}`);

    // Step 2: Check for Ads referencing categories
    console.log('\n📊 Step 2: Checking for Ads referencing categories...\n');
    
    const adsWithCategories = await prisma.ad.findMany({
      select: {
        id: true,
        categoryId: true,
        subcategoryId: true
      },
      take: 1 // Just check if any exist
    });

    if (adsWithCategories.length > 0) {
      const totalAds = await prisma.ad.count();
      console.log(`   ⚠️  Found ${totalAds} Ads referencing categories/subcategories`);
      console.log('   ⚠️  Cannot delete categories with foreign key references');
      console.log('   💡 Options:');
      console.log('      1. Delete all Ads first');
      console.log('      2. Update Ads to remove category references');
      console.log('      3. Deactivate categories instead of deleting\n');
      
      // Ask if user wants to deactivate instead
      console.log('   🔄 Deactivating categories and subcategories instead...\n');
      
      // Deactivate subcategories
      const deactivatedSubs = await prisma.subcategory.updateMany({
        data: { isActive: false }
      });
      console.log(`   ✅ Deactivated ${deactivatedSubs.count} subcategories`);
      
      // Deactivate categories
      const deactivatedCats = await prisma.category.updateMany({
        data: { isActive: false }
      });
      console.log(`   ✅ Deactivated ${deactivatedCats.count} categories`);
      
      console.log('\n✅ Categories and subcategories deactivated (not deleted due to foreign key constraints)');
      console.log('   To delete them, first delete or update all Ads that reference them.\n');
      
      return;
    }

    // Step 3: Delete subcategories first (they have foreign key to categories)
    console.log('🗑️  Step 3: Deleting subcategories...\n');
    
    try {
      const deletedSubs = await prisma.subcategory.deleteMany({});
      console.log(`   ✅ Deleted ${deletedSubs.count} subcategories`);
    } catch (error) {
      if (error.code === 'P2014' || error.message.includes('foreign key')) {
        console.error('   ❌ Cannot delete subcategories - foreign key constraint');
        console.error('   💡 Some records reference these subcategories');
        console.error('   💡 Deactivating instead...\n');
        
        const deactivatedSubs = await prisma.subcategory.updateMany({
          data: { isActive: false }
        });
        console.log(`   ✅ Deactivated ${deactivatedSubs.count} subcategories instead`);
      } else {
        throw error;
      }
    }

    // Step 4: Delete categories
    console.log('\n🗑️  Step 4: Deleting categories...\n');
    
    try {
      const deletedCats = await prisma.category.deleteMany({});
      console.log(`   ✅ Deleted ${deletedCats.count} categories`);
    } catch (error) {
      if (error.code === 'P2014' || error.message.includes('foreign key')) {
        console.error('   ❌ Cannot delete categories - foreign key constraint');
        console.error('   💡 Some Ads reference these categories');
        console.error('   💡 Deactivating instead...\n');
        
        const deactivatedCats = await prisma.category.updateMany({
          data: { isActive: false }
        });
        console.log(`   ✅ Deactivated ${deactivatedCats.count} categories instead`);
      } else {
        throw error;
      }
    }

    // Step 5: Verify deletion
    console.log('\n📋 Step 5: Verifying deletion...\n');
    
    const remainingCategories = await prisma.category.count();
    const remainingSubcategories = await prisma.subcategory.count();
    
    console.log(`   Remaining categories: ${remainingCategories}`);
    console.log(`   Remaining subcategories: ${remainingSubcategories}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Deletion Complete!');
    console.log('='.repeat(80) + '\n');
    
    if (remainingCategories === 0 && remainingSubcategories === 0) {
      console.log('✅ All categories and subcategories deleted successfully!\n');
    } else {
      console.log('⚠️  Some categories/subcategories may have been deactivated instead');
      console.log('   (due to foreign key constraints from Ads)\n');
    }

  } catch (error) {
    console.error('\n❌ Error deleting categories:', error);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllCategories();

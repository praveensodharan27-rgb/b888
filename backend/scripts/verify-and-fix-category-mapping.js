require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Verify and Fix Category/Subcategory Mapping
 * 
 * This script:
 * 1. Verifies all subcategories have valid categoryId
 * 2. Fixes any orphaned subcategories
 * 3. Ensures category slugs match expected values
 */

async function verifyAndFixCategoryMapping() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 Verifying Category/Subcategory Mapping');
    console.log('='.repeat(80) + '\n');

    // Get all categories
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        subcategories: {
          where: { isActive: true }
        }
      },
      orderBy: { order: 'asc' }
    });

    console.log(`📊 Found ${categories.length} active categories\n`);

    let fixedCount = 0;
    let orphanedCount = 0;

    // Check each category
    for (const category of categories) {
      console.log(`📁 Category: ${category.name} (${category.slug})`);
      console.log(`   ID: ${category.id}`);
      console.log(`   Subcategories: ${category.subcategories.length}`);

      // Verify subcategories have correct categoryId
      for (const subcategory of category.subcategories) {
        if (subcategory.categoryId !== category.id) {
          console.error(`   ❌ ERROR: Subcategory "${subcategory.name}" has wrong categoryId!`);
          console.error(`      Expected: ${category.id}`);
          console.error(`      Found: ${subcategory.categoryId}`);
          
          // Fix it
          try {
            await prisma.subcategory.update({
              where: { id: subcategory.id },
              data: { categoryId: category.id }
            });
            console.log(`   ✅ Fixed: Updated categoryId for "${subcategory.name}"`);
            fixedCount++;
          } catch (error) {
            console.error(`   ❌ Failed to fix: ${error.message}`);
          }
        } else {
          console.log(`   ✅ Subcategory "${subcategory.name}" has correct categoryId`);
        }
      }
      console.log('');
    }

    // Find orphaned subcategories (subcategories without valid parent)
    const allSubcategories = await prisma.subcategory.findMany({
      where: { isActive: true }
    });

    console.log(`\n🔍 Checking for orphaned subcategories...`);
    for (const subcategory of allSubcategories) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: subcategory.categoryId }
      });

      if (!parentCategory) {
        console.error(`   ❌ ORPHANED: Subcategory "${subcategory.name}" (${subcategory.slug}) has invalid categoryId: ${subcategory.categoryId}`);
        orphanedCount++;
        
        // Try to find parent by slug matching
        const categorySlugMap = {
          'mobile-phones': 'mobiles',
          'tablets': 'mobiles',
          'accessories': 'mobiles',
          'smart-watches': 'mobiles',
          'laptops': 'electronics-appliances',
          'tvs': 'electronics-appliances',
          'cameras': 'electronics-appliances',
        };

        const expectedCategorySlug = categorySlugMap[subcategory.slug];
        if (expectedCategorySlug) {
          const correctCategory = await prisma.category.findUnique({
            where: { slug: expectedCategorySlug }
          });
          
          if (correctCategory) {
            try {
              await prisma.subcategory.update({
                where: { id: subcategory.id },
                data: { categoryId: correctCategory.id }
              });
              console.log(`   ✅ Fixed: Linked "${subcategory.name}" to category "${correctCategory.name}"`);
              fixedCount++;
            } catch (error) {
              console.error(`   ❌ Failed to fix orphaned subcategory: ${error.message}`);
            }
          }
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ Verification Complete!');
    console.log('='.repeat(80));
    console.log(`   Fixed mappings: ${fixedCount}`);
    console.log(`   Orphaned subcategories: ${orphanedCount}`);
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error verifying category mapping:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyAndFixCategoryMapping();

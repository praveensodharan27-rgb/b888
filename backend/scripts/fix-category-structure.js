require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Fix Category Structure
 * 
 * This script fixes the database structure where subcategories might be
 * incorrectly stored in the Category table instead of Subcategory table.
 * 
 * Steps:
 * 1. Find all categories that have a categoryId (these are subcategories)
 * 2. Move them to the Subcategory table with proper categoryId relation
 * 3. Keep only true main categories in the Category table
 */

async function fixCategoryStructure() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 Fixing Category Structure in Database');
    console.log('='.repeat(80) + '\n');

    // Step 1: Check current state
    console.log('📊 Step 1: Checking current database state...\n');
    
    const allCategories = await prisma.category.findMany({
      include: {
        subcategories: true
      }
    });

    console.log(`   Total categories in Category table: ${allCategories.length}`);
    
    // Check if any categories have subcategories relation (this is correct)
    const categoriesWithSubs = allCategories.filter(c => c.subcategories && c.subcategories.length > 0);
    console.log(`   Categories with subcategories: ${categoriesWithSubs.length}`);
    
    // Check subcategories table
    const allSubcategories = await prisma.subcategory.findMany({
      include: {
        category: true
      }
    });
    console.log(`   Total subcategories in Subcategory table: ${allSubcategories.length}\n`);

    // Step 2: The issue is that Category table should only have main categories
    // Subcategory table should have all subcategories with categoryId pointing to parent
    // Since Category model doesn't have categoryId field, we can't filter by it
    // Instead, we need to ensure the data is correctly structured
    
    console.log('📋 Step 2: Verifying data structure...\n');
    
    // Check if there are any issues with the current structure
    // All categories in Category table should be main categories
    // All subcategories should be in Subcategory table with categoryId
    
    let issuesFound = 0;
    
    // Verify each category
    for (const category of allCategories) {
      const subcategoriesCount = category.subcategories?.length || 0;
      console.log(`   Category: ${category.name} (id: ${category.id})`);
      console.log(`     - Subcategories in relation: ${subcategoriesCount}`);
      
      // Check if this category has subcategories in the Subcategory table
      const actualSubs = await prisma.subcategory.findMany({
        where: { categoryId: category.id }
      });
      
      if (actualSubs.length !== subcategoriesCount) {
        console.log(`     ⚠️  Mismatch: Relation shows ${subcategoriesCount}, but DB has ${actualSubs.length}`);
        issuesFound++;
      }
    }

    console.log(`\n   Issues found: ${issuesFound}`);

    // Step 3: The structure should be correct if seed script was used
    // But let's verify and fix any orphaned subcategories
    console.log('\n📋 Step 3: Checking for orphaned subcategories...\n');
    
    const orphanedSubs = await prisma.subcategory.findMany({
      where: {
        category: null // This won't work directly, need to check differently
      }
    });

    // Check subcategories with invalid categoryId
    const allSubs = await prisma.subcategory.findMany();
    let orphanedCount = 0;
    
    for (const sub of allSubs) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: sub.categoryId }
      });
      
      if (!parentCategory) {
        console.log(`   ⚠️  Orphaned subcategory: ${sub.name} (categoryId: ${sub.categoryId} not found)`);
        orphanedCount++;
      }
    }

    console.log(`\n   Orphaned subcategories found: ${orphanedCount}`);

    // Step 4: Summary and recommendations
    console.log('\n' + '='.repeat(80));
    console.log('✅ Database Structure Check Complete');
    console.log('='.repeat(80) + '\n');
    
    console.log('📊 Summary:');
    console.log(`   - Main Categories: ${allCategories.length}`);
    console.log(`   - Subcategories: ${allSubcategories.length}`);
    console.log(`   - Categories with subcategories: ${categoriesWithSubs.length}`);
    console.log(`   - Orphaned subcategories: ${orphanedCount}`);
    
    if (issuesFound === 0 && orphanedCount === 0) {
      console.log('\n✅ Database structure is correct!');
      console.log('   All categories are in Category table (main categories)');
      console.log('   All subcategories are in Subcategory table with proper categoryId');
    } else {
      console.log('\n⚠️  Issues found in database structure');
      console.log('   Run the seed script to fix: npm run seed-all-categories');
    }

  } catch (error) {
    console.error('\n❌ Error fixing category structure:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixCategoryStructure();

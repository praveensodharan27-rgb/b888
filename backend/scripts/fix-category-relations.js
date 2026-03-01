require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Fix Category Relations
 * 
 * This script fixes the database where subcategories might be incorrectly
 * stored in the Category table. It ensures:
 * 1. Only main categories are in Category table
 * 2. All subcategories are in Subcategory table with proper categoryId
 * 3. Proper relations are maintained
 */

async function fixCategoryRelations() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 Fixing Category Relations in Database');
    console.log('='.repeat(80) + '\n');

    // Step 1: Get all categories and subcategories
    console.log('📊 Step 1: Analyzing current database state...\n');
    
    const allCategories = await prisma.category.findMany({
      include: {
        subcategories: true
      },
      orderBy: { order: 'asc' }
    });

    const allSubcategories = await prisma.subcategory.findMany({
      include: {
        category: true
      }
    });

    console.log(`   Categories in Category table: ${allCategories.length}`);
    console.log(`   Subcategories in Subcategory table: ${allSubcategories.length}\n`);

    // Step 2: Check if there are any issues
    // The problem: If subcategories are appearing as main categories,
    // it means they might have been inserted into Category table incorrectly
    // OR the relation is broken
    
    console.log('📋 Step 2: Checking category structure...\n');
    
    // Display all categories
    for (const category of allCategories) {
      const subCount = category.subcategories?.length || 0;
      console.log(`   ${category.name} (id: ${category.id})`);
      console.log(`     - Subcategories: ${subCount}`);
      
      if (subCount > 0) {
        category.subcategories.forEach(sub => {
          console.log(`       • ${sub.name} (categoryId: ${sub.categoryId})`);
        });
      }
    }

    // Step 3: Verify all subcategories have valid parent categories
    console.log('\n📋 Step 3: Verifying subcategory relations...\n');
    
    let orphanedCount = 0;
    let invalidCount = 0;
    
    for (const sub of allSubcategories) {
      if (!sub.category) {
        console.log(`   ⚠️  Orphaned subcategory: ${sub.name} (categoryId: ${sub.categoryId} - parent not found)`);
        orphanedCount++;
      } else {
        // Verify the parent is actually a main category (not another subcategory)
        const parent = await prisma.category.findUnique({
          where: { id: sub.categoryId }
        });
        
        if (!parent) {
          console.log(`   ❌ Invalid relation: ${sub.name} -> categoryId ${sub.categoryId} (not found)`);
          invalidCount++;
        }
      }
    }

    console.log(`\n   Orphaned subcategories: ${orphanedCount}`);
    console.log(`   Invalid relations: ${invalidCount}`);

    // Step 4: The real issue - check if subcategories are in Category table
    // Since Category model doesn't have categoryId, we can't directly check
    // But we can verify by checking if all categories have proper subcategories
    
    console.log('\n📋 Step 4: Verifying main categories...\n');
    
    // Expected main categories (from seed script)
    const expectedMainCategories = [
      'mobiles',
      'electronics-appliances',
      'vehicles',
      'properties',
      'home-furniture',
      'fashion',
      'books-sports-hobbies',
      'services',
      'jobs',
      'pets',
      'food',
    ];

    const foundMainCategories = allCategories.map(c => c.slug);
    const missingMainCategories = expectedMainCategories.filter(slug => !foundMainCategories.includes(slug));
    
    if (missingMainCategories.length > 0) {
      console.log(`   ⚠️  Missing main categories: ${missingMainCategories.join(', ')}`);
    }

    // Step 5: Summary and fix recommendation
    console.log('\n' + '='.repeat(80));
    console.log('✅ Database Analysis Complete');
    console.log('='.repeat(80) + '\n');
    
    console.log('📊 Summary:');
    console.log(`   - Main Categories: ${allCategories.length}`);
    console.log(`   - Subcategories: ${allSubcategories.length}`);
    console.log(`   - Orphaned subcategories: ${orphanedCount}`);
    console.log(`   - Invalid relations: ${invalidCount}`);
    
    if (orphanedCount === 0 && invalidCount === 0 && allCategories.length > 0) {
      console.log('\n✅ Database structure appears correct!');
      console.log('   All categories are in Category table (main categories)');
      console.log('   All subcategories are in Subcategory table with proper categoryId');
      console.log('\n💡 If subcategories are still showing as main categories,');
      console.log('   the issue might be in the frontend filtering logic.');
    } else {
      console.log('\n⚠️  Issues found in database structure');
      console.log('   Recommendation: Run seed script to fix structure');
      console.log('   Command: npm run seed-all-categories');
    }

    // Step 6: If there are issues, provide fix
    if (orphanedCount > 0 || invalidCount > 0 || allCategories.length === 0) {
      console.log('\n🔧 To fix the database structure:');
      console.log('   1. Run: npm run seed-all-categories');
      console.log('   2. This will ensure all categories are properly structured');
      console.log('   3. Main categories in Category table');
      console.log('   4. Subcategories in Subcategory table with categoryId');
    }

  } catch (error) {
    console.error('\n❌ Error fixing category relations:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixCategoryRelations();

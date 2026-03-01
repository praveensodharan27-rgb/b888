require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Fix and Re-seed Categories
 * 
 * This script:
 * 1. Clears all existing categories and subcategories
 * 2. Re-seeds with correct structure
 * 3. Ensures main categories are in Category table
 * 4. Ensures subcategories are in Subcategory table with proper categoryId
 */

async function fixAndReseedCategories() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 Fixing and Re-seeding Categories');
    console.log('='.repeat(80) + '\n');

    // Step 1: Check current state
    console.log('📊 Step 1: Checking current database state...\n');
    
    const currentCategories = await prisma.category.findMany();
    const currentSubcategories = await prisma.subcategory.findMany();
    
    console.log(`   Current categories: ${currentCategories.length}`);
    console.log(`   Current subcategories: ${currentSubcategories.length}`);

    // Step 2: Note about data preservation
    console.log('\n📝 Step 2: Updating categories (preserving existing data)...\n');
    console.log('   ℹ️  Using upsert to update existing categories without deleting');
    console.log('   ℹ️  This preserves existing Ads and their category references\n');

    // Step 3: Import and run seed script
    console.log('\n📦 Step 3: Re-seeding categories with correct structure...\n');
    
    // Import the seed function
    const seedScript = require('./seed-all-categories.js');
    
    // The seed script should export a function or run automatically
    // Since it's a standalone script, we'll just require it
    // But first, let's manually seed to ensure correct structure
    
    const categoriesData = [
      {
        name: 'Mobiles',
        slug: 'mobiles',
        description: 'Mobile phones, tablets, smart watches, and accessories',
        order: 1,
        subcategories: [
          { name: 'Mobile Phones', slug: 'mobile-phones' },
          { name: 'Tablets', slug: 'tablets' },
          { name: 'Smart Watches', slug: 'smart-watches' },
          { name: 'Accessories', slug: 'accessories' },
        ],
      },
      {
        name: 'Electronics & Appliances',
        slug: 'electronics-appliances',
        description: 'TVs, laptops, cameras, home and kitchen appliances, gaming consoles',
        order: 2,
        subcategories: [
          { name: 'TVs', slug: 'tvs' },
          { name: 'Laptops', slug: 'laptops' },
          { name: 'Cameras', slug: 'cameras' },
          { name: 'Home Appliances', slug: 'home-appliances' },
          { name: 'Kitchen Appliances', slug: 'kitchen-appliances' },
          { name: 'Gaming Consoles', slug: 'gaming-consoles' },
        ],
      },
      {
        name: 'Vehicles',
        slug: 'vehicles',
        description: 'Cars, motorcycles, scooters, bicycles, commercial vehicles, spare parts',
        order: 3,
        subcategories: [
          { name: 'Cars', slug: 'cars' },
          { name: 'Motorcycles', slug: 'motorcycles' },
          { name: 'Scooters', slug: 'scooters' },
          { name: 'Bicycles', slug: 'bicycles' },
          { name: 'Commercial Vehicles', slug: 'commercial-vehicles' },
          { name: 'Spare Parts', slug: 'spare-parts' },
        ],
      },
      {
        name: 'Properties',
        slug: 'properties',
        description: 'Apartments, houses, plots, commercial space, PG/Hostel',
        order: 4,
        subcategories: [
          { name: 'Apartments', slug: 'apartments' },
          { name: 'Houses', slug: 'houses' },
          { name: 'Plots', slug: 'plots' },
          { name: 'Commercial Space', slug: 'commercial-space' },
          { name: 'PG/Hostel', slug: 'pg-hostel' },
        ],
      },
      {
        name: 'Home & Furniture',
        slug: 'home-furniture',
        description: 'Sofa, beds, wardrobe, tables, home decor, lighting',
        order: 5,
        subcategories: [
          { name: 'Sofa', slug: 'sofa' },
          { name: 'Beds', slug: 'beds' },
          { name: 'Wardrobe', slug: 'wardrobe' },
          { name: 'Tables', slug: 'tables' },
          { name: 'Home Decor', slug: 'home-decor' },
          { name: 'Lighting', slug: 'lighting' },
        ],
      },
      {
        name: 'Fashion',
        slug: 'fashion',
        description: 'Men, women, kids clothing, watches, jewellery, footwear, bags',
        order: 6,
        subcategories: [
          { name: 'Men', slug: 'men' },
          { name: 'Women', slug: 'women' },
          { name: 'Kids', slug: 'kids' },
          { name: 'Watches', slug: 'watches' },
          { name: 'Jewellery', slug: 'jewellery' },
          { name: 'Footwear', slug: 'footwear' },
          { name: 'Bags', slug: 'bags' },
        ],
      },
      {
        name: 'Books, Sports & Hobbies',
        slug: 'books-sports-hobbies',
        description: 'Books, musical instruments, sports gear, art & craft, toys, collectibles',
        order: 7,
        subcategories: [
          { name: 'Books', slug: 'books' },
          { name: 'Musical Instruments', slug: 'musical-instruments' },
          { name: 'Sports Gear', slug: 'sports-gear' },
          { name: 'Art & Craft', slug: 'art-craft' },
          { name: 'Toys', slug: 'toys' },
          { name: 'Collectibles', slug: 'collectibles' },
        ],
      },
      {
        name: 'Services',
        slug: 'services',
        description: 'Professional services, home services, event services, tutoring',
        order: 8,
        subcategories: [
          { name: 'Professional Services', slug: 'professional-services' },
          { name: 'Home Services', slug: 'home-services' },
          { name: 'Event Services', slug: 'event-services' },
          { name: 'Tutoring', slug: 'tutoring' },
        ],
      },
      {
        name: 'Jobs',
        slug: 'jobs',
        description: 'Full-time, part-time, freelance, internships',
        order: 9,
        subcategories: [
          { name: 'Full-time', slug: 'full-time' },
          { name: 'Part-time', slug: 'part-time' },
          { name: 'Freelance', slug: 'freelance' },
          { name: 'Internships', slug: 'internships' },
        ],
      },
      {
        name: 'Pets',
        slug: 'pets',
        description: 'Dogs, cats, birds, fish, pet accessories, pet services',
        order: 10,
        subcategories: [
          { name: 'Dogs', slug: 'dogs' },
          { name: 'Cats', slug: 'cats' },
          { name: 'Birds', slug: 'birds' },
          { name: 'Fish', slug: 'fish' },
          { name: 'Pet Accessories', slug: 'pet-accessories' },
          { name: 'Pet Services', slug: 'pet-services' },
        ],
      },
      {
        name: 'Food',
        slug: 'food',
        description: 'Home cooked meals, restaurant food, catering services',
        order: 11,
        subcategories: [
          { name: 'Home Cooked', slug: 'home-cooked' },
          { name: 'Restaurant Food', slug: 'restaurant-food' },
          { name: 'Catering', slug: 'catering' },
        ],
      },
    ];

    // Step 4: Upsert categories and subcategories
    console.log('   Upserting categories...\n');
    
    for (const categoryData of categoriesData) {
      // Upsert main category (NO categoryId - this is a main category)
      // Use slug as unique identifier
      const category = await prisma.category.upsert({
        where: { slug: categoryData.slug },
        update: {
          name: categoryData.name,
          description: categoryData.description,
          isActive: true,
          order: categoryData.order,
          // Ensure no categoryId is set (main category)
        },
        create: {
          name: categoryData.name,
          slug: categoryData.slug,
          description: categoryData.description,
          isActive: true,
          order: categoryData.order,
        },
      });

      console.log(`   ✅ Upserted MAIN category: ${category.name} (id: ${category.id})`);

      // Upsert subcategories (WITH categoryId pointing to parent)
      for (const subcatData of categoryData.subcategories) {
        const subcategory = await prisma.subcategory.upsert({
          where: {
            categoryId_slug: {
              categoryId: category.id,
              slug: subcatData.slug,
            },
          },
          update: {
            name: subcatData.name,
            isActive: true,
            categoryId: category.id, // CRITICAL: Ensure proper parent relation
          },
          create: {
            name: subcatData.name,
            slug: subcatData.slug,
            categoryId: category.id, // CRITICAL: Link to parent category
            isActive: true,
          },
        });
        console.log(`      ✅ Upserted SUB category: ${subcategory.name} (categoryId: ${subcategory.categoryId})`);
      }
    }

    // Step 5: Clean up any orphaned subcategories (subcategories without valid parent)
    console.log('\n🧹 Step 5: Cleaning up orphaned subcategories...\n');
    
    const allSubs = await prisma.subcategory.findMany({
      include: { category: true }
    });
    
    let orphanedDeleted = 0;
    for (const sub of allSubs) {
      if (!sub.category) {
        console.log(`   🗑️  Deleting orphaned subcategory: ${sub.name} (categoryId: ${sub.categoryId} not found)`);
        try {
          await prisma.subcategory.delete({
            where: { id: sub.id }
          });
          orphanedDeleted++;
        } catch (deleteError) {
          // If subcategory has ads, we can't delete it - just deactivate
          console.log(`   ⚠️  Cannot delete (has ads), deactivating instead: ${sub.name}`);
          await prisma.subcategory.update({
            where: { id: sub.id },
            data: { isActive: false }
          });
        }
      }
    }
    
    if (orphanedDeleted > 0) {
      console.log(`   ✅ Deleted ${orphanedDeleted} orphaned subcategories\n`);
    } else {
      console.log(`   ✅ No orphaned subcategories found\n`);
    }

    // Step 6: Verify structure
    console.log('📋 Step 6: Verifying database structure...\n');
    
    const finalCategories = await prisma.category.findMany({
      include: {
        subcategories: true
      },
      orderBy: { order: 'asc' }
    });

    const finalSubcategories = await prisma.subcategory.findMany({
      include: {
        category: true
      }
    });

    console.log(`   ✅ Main categories: ${finalCategories.length}`);
    console.log(`   ✅ Subcategories: ${finalSubcategories.length}`);
    
    // Verify all subcategories have valid parent
    let invalidCount = 0;
    for (const sub of finalSubcategories) {
      if (!sub.category) {
        console.log(`   ❌ Invalid subcategory: ${sub.name} (parent not found)`);
        invalidCount++;
      }
    }

    if (invalidCount === 0) {
      console.log(`   ✅ All subcategories have valid parent categories`);
    }

    // Step 7: Deactivate any categories not in our seed data (optional - commented out to preserve data)
    // Uncomment if you want to deactivate old categories
    /*
    console.log('\n📋 Step 7: Deactivating old categories not in seed data...\n');
    const seedSlugs = categoriesData.map(c => c.slug);
    const oldCategories = await prisma.category.findMany({
      where: {
        slug: { notIn: seedSlugs }
      }
    });
    
    if (oldCategories.length > 0) {
      await prisma.category.updateMany({
        where: {
          slug: { notIn: seedSlugs }
        },
        data: {
          isActive: false
        }
      });
      console.log(`   ✅ Deactivated ${oldCategories.length} old categories\n`);
    } else {
      console.log(`   ✅ No old categories to deactivate\n`);
    }
    */

    console.log('\n' + '='.repeat(80));
    console.log('✅ Category Fix and Re-seed Complete!');
    console.log('='.repeat(80) + '\n');
    
    console.log('📊 Final Summary:');
    console.log(`   - Main Categories: ${finalCategories.length}`);
    console.log(`   - Subcategories: ${finalSubcategories.length}`);
    console.log(`   - Invalid relations: ${invalidCount}`);
    console.log(`   - Orphaned subcategories deleted: ${orphanedDeleted}`);
    
    console.log('\n💡 Next steps:');
    console.log('   1. Clear server cache: npm run clear-cache');
    console.log('   2. Restart backend server');
    console.log('   3. Refresh frontend to see updated categories\n');

  } catch (error) {
    console.error('\n❌ Error fixing and re-seeding categories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixAndReseedCategories();

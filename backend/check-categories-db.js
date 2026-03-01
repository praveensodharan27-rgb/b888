require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCategories() {
  try {
    console.log('\n🔍 Checking Categories in Database...\n');
    
    await prisma.$connect();
    console.log('✅ Connected to database\n');

    // Check total categories
    const totalCategories = await prisma.category.count();
    console.log(`📦 Total Categories: ${totalCategories}`);

    // Check active categories
    const activeCategories = await prisma.category.count({
      where: { isActive: true }
    });
    console.log(`✅ Active Categories: ${activeCategories}`);

    // Get categories with subcategories
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        subcategories: {
          where: { isActive: true }
        }
      },
      orderBy: { order: 'asc' },
      take: 5 // Show first 5
    });

    console.log(`\n📋 Sample Categories (first 5):`);
    categories.forEach((cat, index) => {
      console.log(`\n${index + 1}. ${cat.name} (${cat.slug})`);
      console.log(`   Subcategories: ${cat.subcategories.length}`);
      if (cat.subcategories.length > 0) {
        console.log(`   - ${cat.subcategories.map(s => s.name).join(', ')}`);
      }
    });

    // Check total subcategories
    const totalSubcategories = await prisma.subcategory.count({
      where: { isActive: true }
    });
    console.log(`\n📦 Total Active Subcategories: ${totalSubcategories}`);

    if (totalCategories === 0) {
      console.log('\n❌ No categories found! Run: npm run seed-all-categories');
      process.exit(1);
    }

    if (activeCategories === 0) {
      console.log('\n⚠️  No active categories! Check isActive field.');
      process.exit(1);
    }

    console.log('\n✅ Categories exist in database!');
    console.log('   If API returns empty, check:');
    console.log('   1. Backend server is running');
    console.log('   2. API endpoint: GET /api/categories');
    console.log('   3. Redis cache (may need clearing)');
    console.log('   4. Database connection in backend\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('connect')) {
      console.error('   Database connection failed!');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkCategories();

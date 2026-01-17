/**
 * Verify Categories in Database
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyCategories() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('📊 Verifying Categories in Database');
    console.log('='.repeat(80) + '\n');

    await prisma.$connect();
    console.log('✅ Connected to MongoDB\n');

    // Get all categories with subcategories
    const categories = await prisma.category.findMany({
      include: {
        subcategories: {
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { order: 'asc' }
    });

    console.log(`📦 Total Categories: ${categories.length}\n`);

    if (categories.length === 0) {
      console.log('❌ No categories found in database!');
      console.log('   Run: npm run seed-all-categories\n');
      process.exit(1);
    }

    // Display categories
    for (const category of categories) {
      console.log(`${category.order}. ${category.name} (${category.slug})`);
      console.log(`   Description: ${category.description || 'N/A'}`);
      console.log(`   Subcategories: ${category.subcategories.length}`);
      
      if (category.subcategories.length > 0) {
        const subcatNames = category.subcategories.map(s => s.name).join(', ');
        console.log(`   - ${subcatNames}`);
      }
      console.log('');
    }

    // Count total subcategories
    const totalSubcategories = categories.reduce((sum, cat) => sum + cat.subcategories.length, 0);
    console.log('='.repeat(80));
    console.log(`📊 Summary:`);
    console.log(`   Categories: ${categories.length}`);
    console.log(`   Subcategories: ${totalSubcategories}`);
    console.log('='.repeat(80) + '\n');

    console.log('✅ Categories verification completed!\n');

  } catch (error) {
    console.error('\n❌ Error verifying categories:', error.message);
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 MongoDB authentication failed!');
      console.error('   Fix: node fix-url-simple.js && npm run prisma:generate\n');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCategories();

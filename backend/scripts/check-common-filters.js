/**
 * Check Common Filters (Condition, Brand) in Database
 */
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkCommonFilters() {
  try {
    console.log('🔍 Checking Common Filters (NORMAL filters)...\n');

    const filters = await prisma.filterConfiguration.findMany({
      where: {
        filterCategory: 'NORMAL',
        categoryId: null,
        subcategoryId: null,
        isActive: true,
      },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    console.log(`📊 Found ${filters.length} NORMAL filters:\n`);

    filters.forEach(filter => {
      console.log(`✅ ${filter.name} (${filter.key})`);
      console.log(`   Type: ${filter.type}`);
      console.log(`   Order: ${filter.order}`);
      console.log(`   Options: ${filter.options.length}`);
      if (filter.options.length > 0) {
        console.log(`   Options: ${filter.options.map(o => o.label).join(', ')}`);
      }
      console.log('');
    });

    // Check specifically for Condition and Brand
    const conditionFilter = filters.find(f => f.key === 'condition');
    const brandFilter = filters.find(f => f.key === 'brand');

    console.log('\n🎯 Specific Checks:');
    console.log(`   Condition Filter: ${conditionFilter ? '✅ EXISTS' : '❌ MISSING'}`);
    if (conditionFilter) {
      console.log(`      Options: ${conditionFilter.options.length}`);
    }

    console.log(`   Brand Filter: ${brandFilter ? '✅ EXISTS' : '❌ MISSING'}`);
    if (brandFilter) {
      console.log(`      Options: ${brandFilter.options.length} (will be populated dynamically)`);
    }

    if (!conditionFilter || !brandFilter) {
      console.log('\n⚠️  Missing filters! Run seed-universal-filters.js to create them.');
    } else {
      console.log('\n✅ All common filters are present!');
    }

  } catch (error) {
    console.error('❌ Error checking filters:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCommonFilters();

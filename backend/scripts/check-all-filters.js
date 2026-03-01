/**
 * Check ALL filters in database (for debugging)
 */
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkAllFilters() {
  try {
    console.log('🔍 Checking ALL filters in database...\n');

    // Check all filters regardless of category
    const allFilters = await prisma.filterConfiguration.findMany({
      include: {
        options: {
          where: { isActive: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`📊 Total filters in database: ${allFilters.length}\n`);

    if (allFilters.length === 0) {
      console.log('❌ No filters found in database!');
      return;
    }

    // Group by filterCategory
    const byCategory = {
      NORMAL: [],
      SPECIAL: [],
      OTHER: [],
    };

    allFilters.forEach(filter => {
      const category = filter.filterCategory || 'OTHER';
      if (byCategory[category]) {
        byCategory[category].push(filter);
      } else {
        byCategory.OTHER.push(filter);
      }
    });

    console.log('📊 Filters by Category:');
    console.log(`   NORMAL: ${byCategory.NORMAL.length}`);
    console.log(`   SPECIAL: ${byCategory.SPECIAL.length}`);
    console.log(`   OTHER: ${byCategory.OTHER.length}\n`);

    // Show NORMAL filters
    if (byCategory.NORMAL.length > 0) {
      console.log('✅ NORMAL Filters:');
      byCategory.NORMAL.forEach(filter => {
        console.log(`   - ${filter.name} (${filter.key})`);
        console.log(`     categoryId: ${filter.categoryId}, subcategoryId: ${filter.subcategoryId}`);
        console.log(`     type: ${filter.type}, order: ${filter.order}`);
        console.log(`     options: ${filter.options.length}`);
        console.log('');
      });
    }

    // Check for Condition and Brand specifically
    const conditionFilter = allFilters.find(f => f.key === 'condition');
    const brandFilter = allFilters.find(f => f.key === 'brand');

    console.log('\n🎯 Specific Checks:');
    if (conditionFilter) {
      console.log(`✅ Condition Filter Found:`);
      console.log(`   filterCategory: ${conditionFilter.filterCategory}`);
      console.log(`   categoryId: ${conditionFilter.categoryId}`);
      console.log(`   subcategoryId: ${conditionFilter.subcategoryId}`);
      console.log(`   options: ${conditionFilter.options.length}`);
    } else {
      console.log('❌ Condition Filter NOT FOUND');
    }

    if (brandFilter) {
      console.log(`✅ Brand Filter Found:`);
      console.log(`   filterCategory: ${brandFilter.filterCategory}`);
      console.log(`   categoryId: ${brandFilter.categoryId}`);
      console.log(`   subcategoryId: ${brandFilter.subcategoryId}`);
      console.log(`   options: ${brandFilter.options.length}`);
    } else {
      console.log('❌ Brand Filter NOT FOUND');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllFilters();

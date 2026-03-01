require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTopCategories() {
  try {
    console.log('\n📊 Checking Top 12 Categories by Ad Count...\n');
    console.log('='.repeat(80));

    await prisma.$connect();
    console.log('✅ Connected to database\n');

    // Get all categories with ad counts
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { ads: true }
        },
        subcategories: {
          where: { isActive: true },
          include: {
            _count: {
              select: { ads: true }
            }
          }
        }
      },
      orderBy: { order: 'asc' }
    });

    // Flatten categories and subcategories into a single list
    const allItems = [];

    categories.forEach(category => {
      // Add main category
      allItems.push({
        type: 'Category',
        name: category.name,
        slug: category.slug,
        icon: category.icon || '📁',
        adCount: category._count.ads,
        order: category.order
      });

      // Add subcategories
      if (category.subcategories && category.subcategories.length > 0) {
        category.subcategories.forEach(subcat => {
          allItems.push({
            type: 'Subcategory',
            name: subcat.name,
            slug: subcat.slug,
            parentCategory: category.name,
            adCount: subcat._count.ads
          });
        });
      }
    });

    // Sort by ad count (descending) and take top 12
    const topItems = allItems
      .sort((a, b) => b.adCount - a.adCount)
      .slice(0, 12);

    console.log('🏆 TOP 12 CATEGORIES/SUBCATEGORIES (by Ad Count):\n');
    console.log('Rank | Type         | Name                    | Ads   | Parent Category');
    console.log('-'.repeat(80));

    topItems.forEach((item, index) => {
      const rank = (index + 1).toString().padStart(2, ' ');
      const type = item.type.padEnd(12, ' ');
      const name = item.name.padEnd(23, ' ');
      const adCount = item.adCount.toString().padStart(5, ' ');
      const parent = item.parentCategory || '-';
      
      console.log(`${rank}   | ${type} | ${name} | ${adCount} | ${parent}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n📝 ALL CATEGORIES WITH AD COUNTS:\n');

    categories.forEach(category => {
      console.log(`\n📁 ${category.name} (${category.slug})`);
      console.log(`   Total Ads: ${category._count.ads}`);
      console.log(`   Icon: ${category.icon || 'None'}`);
      
      if (category.subcategories && category.subcategories.length > 0) {
        console.log('   Subcategories:');
        category.subcategories.forEach(subcat => {
          console.log(`     • ${subcat.name} (${subcat.slug}) - ${subcat._count.ads} ads`);
        });
      } else {
        console.log('   Subcategories: None');
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ Total Categories: ${categories.length}`);
    console.log(`✅ Total Items (Categories + Subcategories): ${allItems.length}`);
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTopCategories();

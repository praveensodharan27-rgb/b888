require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addSportsSubcategories() {
  try {
    console.log('\n🏃 Adding Sports Subcategories...\n');
    console.log('='.repeat(80));

    // Find the Books, Sports & Hobbies category
    const category = await prisma.category.findFirst({
      where: { slug: 'books-sports-hobbies' }
    });

    if (!category) {
      console.error('❌ Category "books-sports-hobbies" not found!');
      return;
    }

    console.log(`✅ Found category: ${category.name} (${category.slug})\n`);

    // Subcategories to add
    const subcategories = [
      { name: 'Fitness', slug: 'fitness', description: 'Fitness equipment and gear' },
      { name: 'Outdoor', slug: 'outdoor', description: 'Outdoor sports and camping gear' },
      { name: 'Water Sports', slug: 'water-sports', description: 'Water sports equipment' }
    ];

    for (const subcat of subcategories) {
      const existing = await prisma.subcategory.findFirst({
        where: {
          slug: subcat.slug,
          categoryId: category.id
        }
      });

      if (existing) {
        console.log(`  ℹ️  Subcategory already exists: ${subcat.name} (${subcat.slug})`);
      } else {
        const created = await prisma.subcategory.create({
          data: {
            name: subcat.name,
            slug: subcat.slug,
            description: subcat.description,
            categoryId: category.id,
            isActive: true
          }
        });
        console.log(`  ✅ Created subcategory: ${subcat.name} (${subcat.slug})`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Sports subcategories added successfully!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error adding sports subcategories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addSportsSubcategories()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

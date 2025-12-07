const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedMobilesCategory() {
  try {
    console.log('📱 Seeding Mobiles category and subcategories...');

    // Create or get Mobiles category
    const mobilesCategory = await prisma.category.upsert({
      where: { slug: 'mobiles' },
      update: {
        name: 'Mobiles',
        isActive: true,
      },
      create: {
        name: 'Mobiles',
        slug: 'mobiles',
        description: 'Mobile phones, tablets, smart watches, and accessories',
        isActive: true,
        order: 1,
      },
    });

    console.log('✅ Category created/updated:', mobilesCategory.name);

    // Subcategories
    const subcategories = [
      { name: 'Mobile Phones', slug: 'mobile-phones' },
      { name: 'Tablets', slug: 'tablets' },
      { name: 'Smart Watches', slug: 'smart-watches' },
      { name: 'Accessories', slug: 'accessories' },
    ];

    for (const subcat of subcategories) {
      const subcategory = await prisma.subcategory.upsert({
        where: {
          categoryId_slug: {
            categoryId: mobilesCategory.id,
            slug: subcat.slug,
          },
        },
        update: {
          name: subcat.name,
          isActive: true,
        },
        create: {
          name: subcat.name,
          slug: subcat.slug,
          categoryId: mobilesCategory.id,
          isActive: true,
        },
      });
      console.log(`✅ Subcategory created/updated: ${subcat.name}`);
    }

    console.log('✅ Mobiles category seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding mobiles category:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedMobilesCategory();


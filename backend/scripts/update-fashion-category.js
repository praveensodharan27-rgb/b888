require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateFashionCategory() {
  try {
    console.log('📦 Updating Fashion Category with subcategories, brands, and models...\n');

    // Find or create Fashion category
    const fashionCategory = await prisma.category.upsert({
      where: { slug: 'fashion' },
      update: {
        name: 'Fashion',
        description: 'Men, women, kids clothing, footwear, accessories',
        isActive: true,
        order: 6
      },
      create: {
        name: 'Fashion',
        slug: 'fashion',
        description: 'Men, women, kids clothing, footwear, accessories',
        isActive: true,
        order: 6
      }
    });

    console.log(`✅ Fashion Category: ${fashionCategory.name} (${fashionCategory.id})`);

    // Subcategories data
    const subcategoriesData = [
      {
        name: "Men's Wear",
        slug: 'men',
        order: 1
      },
      {
        name: "Women's Wear",
        slug: 'women',
        order: 2
      },
      {
        name: "Kids Wear",
        slug: 'kids',
        order: 3
      },
      {
        name: 'Footwear',
        slug: 'footwear',
        order: 4
      },
      {
        name: 'Watches',
        slug: 'watches',
        order: 5
      },
      {
        name: 'Bags',
        slug: 'bags',
        order: 6
      },
      {
        name: 'Jewellery',
        slug: 'jewellery',
        order: 7
      }
    ];

    // Create/update subcategories
    for (const subcatData of subcategoriesData) {
      const subcategory = await prisma.subcategory.upsert({
        where: {
          categoryId_slug: {
            categoryId: fashionCategory.id,
            slug: subcatData.slug
          }
        },
        update: {
          name: subcatData.name,
          isActive: true
        },
        create: {
          name: subcatData.name,
          slug: subcatData.slug,
          categoryId: fashionCategory.id,
          isActive: true
        }
      });
      console.log(`   ✅ Subcategory: ${subcategory.name} (${subcategory.slug})`);
    }

    console.log('\n✅ Fashion category and subcategories updated successfully!');
    console.log('📋 Brands and models are stored in brands-models.json file');
    console.log('   The brands-models.json file has been updated with the new data.\n');

  } catch (error) {
    console.error('\n❌ Error updating Fashion category:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateFashionCategory();

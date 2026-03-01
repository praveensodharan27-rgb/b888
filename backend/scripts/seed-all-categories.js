require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAllCategories() {
  try {
    console.log('📦 Seeding all categories and subcategories...');

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
        name: 'Pets',
        slug: 'pets',
        description: 'Dogs, cats, birds, fish, pet accessories',
        order: 8,
        subcategories: [
          { name: 'Dogs', slug: 'dogs' },
          { name: 'Cats', slug: 'cats' },
          { name: 'Birds', slug: 'birds' },
          { name: 'Fish', slug: 'fish' },
          { name: 'Pet Accessories', slug: 'pet-accessories' },
        ],
      },
      {
        name: 'Services',
        slug: 'services',
        description: 'Repair services, cleaning, beauty/spa, education, events, business services',
        order: 9,
        subcategories: [
          { name: 'Repair Services', slug: 'repair-services' },
          { name: 'Cleaning', slug: 'cleaning' },
          { name: 'Beauty / Spa', slug: 'beauty-spa' },
          { name: 'Education', slug: 'education' },
          { name: 'Events', slug: 'events' },
          { name: 'Business Services', slug: 'business-services' },
        ],
      },
      {
        name: 'Jobs',
        slug: 'jobs',
        description: 'Full-time, part-time, freelance, internship, contract jobs',
        order: 10,
        subcategories: [
          { name: 'Full-time', slug: 'full-time' },
          { name: 'Part-time', slug: 'part-time' },
          { name: 'Freelance', slug: 'freelance' },
          { name: 'Internship', slug: 'internship' },
          { name: 'Contract', slug: 'contract' },
        ],
      },
      {
        name: 'Commercial & Industrial',
        slug: 'commercial-industrial',
        description: 'Industrial machines, tools, medical equipment, packaging machines',
        order: 11,
        subcategories: [
          { name: 'Industrial Machines', slug: 'industrial-machines' },
          { name: 'Tools', slug: 'tools' },
          { name: 'Medical Equipment', slug: 'medical-equipment' },
          { name: 'Packaging Machines', slug: 'packaging-machines' },
        ],
      },
      {
        name: 'Free Stuff',
        slug: 'free-stuff',
        description: 'Free furniture, electronics, and miscellaneous items',
        order: 12,
        subcategories: [
          { name: 'Free Furniture', slug: 'free-furniture' },
          { name: 'Free Electronics', slug: 'free-electronics' },
          { name: 'Misc Free', slug: 'misc-free' },
        ],
      },
      {
        name: 'Baby & Kids',
        slug: 'baby-kids',
        description: 'Clothes, toys, strollers, cribs, kids furniture',
        order: 13,
        subcategories: [
          { name: 'Clothes', slug: 'clothes' },
          { name: 'Toys', slug: 'toys' },
          { name: 'Strollers', slug: 'strollers' },
          { name: 'Cribs', slug: 'cribs' },
          { name: 'Kids Furniture', slug: 'kids-furniture' },
        ],
      },
      {
        name: 'Beauty & Health',
        slug: 'beauty-health',
        description: 'Cosmetics, skincare, medical devices, supplements',
        order: 14,
        subcategories: [
          { name: 'Cosmetics', slug: 'cosmetics' },
          { name: 'Skincare', slug: 'skincare' },
          { name: 'Medical Devices', slug: 'medical-devices' },
          { name: 'Supplements', slug: 'supplements' },
        ],
      },
      {
        name: 'Other / Misc',
        slug: 'other-misc',
        description: 'Agriculture, office supplies, antiques, miscellaneous',
        order: 15,
        subcategories: [
          { name: 'Agriculture', slug: 'agriculture' },
          { name: 'Office Supplies', slug: 'office-supplies' },
          { name: 'Antiques', slug: 'antiques' },
          { name: 'Miscellaneous', slug: 'miscellaneous' },
        ],
      },
    ];

    for (const categoryData of categoriesData) {
      const category = await prisma.category.upsert({
        where: { slug: categoryData.slug },
        update: {
          name: categoryData.name,
          description: categoryData.description,
          isActive: true,
          order: categoryData.order,
        },
        create: {
          name: categoryData.name,
          slug: categoryData.slug,
          description: categoryData.description,
          isActive: true,
          order: categoryData.order,
        },
      });

      console.log(`✅ Category created/updated: ${category.name}`);

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
          },
          create: {
            name: subcatData.name,
            slug: subcatData.slug,
            categoryId: category.id,
            isActive: true,
          },
        });
        console.log(`  ✅ Subcategory: ${subcatData.name}`);
      }
    }

    console.log('✅ All categories and subcategories seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedAllCategories();


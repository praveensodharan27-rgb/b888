require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const categoriesData = {
  "categories": [
    {
      "id": "electronics",
      "name": "Electronics",
      "slug": "electronics",
      "description": "Mobile phones, laptops, gadgets and accessories",
      "order": 1,
      "subcategories": [
        {
          "id": "mobiles",
          "name": "Mobile Phones",
          "slug": "mobile-phones",
          "brands": [
            { "name": "Samsung", "models": ["Galaxy S23", "Galaxy S24", "Galaxy A54", "Galaxy M14"] },
            { "name": "Apple", "models": ["iPhone 13", "iPhone 14", "iPhone 15", "iPhone 15 Pro"] },
            { "name": "Xiaomi", "models": ["Redmi Note 12", "Note 13 Pro", "Mi 11X"] },
            { "name": "OnePlus", "models": ["Nord CE 3", "11R", "12"] },
            { "name": "Vivo", "models": ["V27", "Y20", "X90"] },
            { "name": "Oppo", "models": ["Reno 8", "F21 Pro"] }
          ]
        },
        {
          "id": "laptops",
          "name": "Laptops",
          "slug": "laptops",
          "brands": [
            { "name": "HP", "models": ["Pavilion", "Victus", "Envy", "Omen"] },
            { "name": "Dell", "models": ["Inspiron", "XPS", "Vostro", "Alienware"] },
            { "name": "Lenovo", "models": ["ThinkPad", "IdeaPad", "Legion"] },
            { "name": "Asus", "models": ["ROG", "TUF", "VivoBook"] },
            { "name": "Apple", "models": ["MacBook Air M2", "MacBook Pro M3"] }
          ]
        },
        {
          "id": "accessories",
          "name": "Accessories",
          "slug": "accessories",
          "brands": [
            { "name": "Boat", "models": ["Airdopes 141", "Rockers 255"] },
            { "name": "JBL", "models": ["Tune 510", "Charge 5"] },
            { "name": "Sony", "models": ["WH-1000XM5", "WF-1000XM4"] }
          ]
        }
      ]
    },
    {
      "id": "vehicles",
      "name": "Vehicles",
      "slug": "vehicles",
      "description": "Cars, bikes, scooters and more",
      "order": 2,
      "subcategories": [
        {
          "id": "cars",
          "name": "Cars",
          "slug": "cars",
          "brands": [
            { "name": "Maruti", "models": ["Swift", "Baleno", "Brezza", "Ertiga"] },
            { "name": "Hyundai", "models": ["i20", "Creta", "Venue", "Verna"] },
            { "name": "Tata", "models": ["Nexon", "Punch", "Harrier", "Safari"] },
            { "name": "Mahindra", "models": ["XUV700", "Thar", "Scorpio"] },
            { "name": "Kia", "models": ["Seltos", "Sonet", "Carens"] }
          ]
        },
        {
          "id": "bikes",
          "name": "Bikes",
          "slug": "bikes",
          "brands": [
            { "name": "Royal Enfield", "models": ["Classic 350", "Meteor", "Hunter"] },
            { "name": "Yamaha", "models": ["R15", "MT-15", "FZ"] },
            { "name": "Bajaj", "models": ["Pulsar 150", "Dominar 400"] },
            { "name": "KTM", "models": ["Duke 200", "RC 390"] }
          ]
        },
        {
          "id": "electric",
          "name": "Electric Vehicles",
          "slug": "electric-vehicles",
          "brands": [
            { "name": "Ola", "models": ["S1", "S1 Pro"] },
            { "name": "Ather", "models": ["450X", "450 Plus"] },
            { "name": "TVS", "models": ["iQube"] }
          ]
        }
      ]
    },
    {
      "id": "fashion",
      "name": "Fashion",
      "slug": "fashion",
      "description": "Clothing, shoes, accessories",
      "order": 3,
      "subcategories": [
        {
          "id": "mens",
          "name": "Men's Wear",
          "slug": "mens-wear",
          "brands": [
            { "name": "Levis", "models": ["501 Jeans", "Slim Fit"] },
            { "name": "Allen Solly", "models": ["Formal Shirt", "Casual Shirt"] },
            { "name": "HRX", "models": ["Track Pants", "T-Shirts"] }
          ]
        },
        {
          "id": "womens",
          "name": "Women's Wear",
          "slug": "womens-wear",
          "brands": [
            { "name": "Zara", "models": ["Dress", "Top", "Skirt"] },
            { "name": "Biba", "models": ["Kurti", "Salwar Set"] },
            { "name": "H&M", "models": ["Blouse", "Jeans"] }
          ]
        },
        {
          "id": "footwear",
          "name": "Footwear",
          "slug": "footwear",
          "brands": [
            { "name": "Puma", "models": ["Sneakers", "Running Shoes"] },
            { "name": "Nike", "models": ["Air Max", "Revolution"] },
            { "name": "Reebok", "models": ["Crossfit", "Walk Lite"] }
          ]
        }
      ]
    },
    {
      "id": "appliances",
      "name": "Appliances",
      "slug": "appliances",
      "description": "Home appliances and electronics",
      "order": 4,
      "subcategories": [
        {
          "id": "refrigerator",
          "name": "Refrigerator",
          "slug": "refrigerator",
          "brands": [
            { "name": "LG", "models": ["Double Door", "Smart Inverter"] },
            { "name": "Samsung", "models": ["Digital Inverter", "Side by Side"] },
            { "name": "Whirlpool", "models": ["Intellifresh", "Protton"] }
          ]
        },
        {
          "id": "washing_machine",
          "name": "Washing Machine",
          "slug": "washing-machine",
          "brands": [
            { "name": "IFB", "models": ["Front Load 7kg", "Top Load 6.5kg"] },
            { "name": "Bosch", "models": ["Serie 6", "Serie 4"] }
          ]
        },
        {
          "id": "air_conditioner",
          "name": "Air Conditioner",
          "slug": "air-conditioner",
          "brands": [
            { "name": "Voltas", "models": ["1.5 Ton Split", "Window AC"] },
            { "name": "Blue Star", "models": ["Inverter AC", "Smart AC"] }
          ]
        }
      ]
    },
    {
      "id": "books",
      "name": "Books",
      "slug": "books",
      "description": "Books, magazines, comics",
      "order": 5,
      "subcategories": [
        {
          "id": "fiction",
          "name": "Fiction",
          "slug": "fiction",
          "brands": [
            { "name": "Penguin", "models": ["Classics", "Bestsellers"] }
          ]
        },
        {
          "id": "academic",
          "name": "Academic",
          "slug": "academic",
          "brands": [
            { "name": "Pearson", "models": ["Engineering", "Medical"] },
            { "name": "McGrawHill", "models": ["MBA", "CA"] }
          ]
        }
      ]
    },
    {
      "id": "real_estate",
      "name": "Real Estate",
      "slug": "real-estate",
      "description": "Properties for rent and sale",
      "order": 6,
      "subcategories": [
        {
          "id": "sale",
          "name": "For Sale",
          "slug": "for-sale",
          "brands": []
        },
        {
          "id": "rent",
          "name": "For Rent",
          "slug": "for-rent",
          "brands": []
        },
        {
          "id": "commercial",
          "name": "Commercial",
          "slug": "commercial",
          "brands": []
        }
      ]
    }
  ]
};

async function seedCategories() {
  try {
    console.log('\n📦 Seeding Categories, Subcategories, Brands, and Models...\n');
    console.log('='.repeat(80));

    await prisma.$connect();
    console.log('✅ Connected to database\n');

    for (const categoryData of categoriesData.categories) {
      // Create or update category
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

      console.log(`✅ Category: ${category.name}`);

      // Create or update subcategories
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

        // Store brands and models count
        if (subcatData.brands && subcatData.brands.length > 0) {
          const totalModels = subcatData.brands.reduce((sum, b) => sum + (b.models?.length || 0), 0);
          console.log(`    ✅ Brands: ${subcatData.brands.length}, Models: ${totalModels}`);
          
          // Brands and models will be stored in Ad.attributes JSON field when creating ads
          // This seed script ensures categories and subcategories exist
          // Frontend/API can use this structure to populate brand/model dropdowns
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Categories and Subcategories seeding completed!');
    console.log('📝 Note: Brands and Models are stored in Ad.attributes JSON field');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Error seeding categories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedCategories();

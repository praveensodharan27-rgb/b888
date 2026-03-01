require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const specificationsData = {
  "mobiles": {
    "mobile-phones": [
      { name: "brand", type: "select", isRequired: true, order: 1 },
      { name: "model", type: "select", isRequired: true, order: 2 },
      { name: "condition", type: "select", isRequired: true, order: 3 },
      { name: "ram", type: "select", isRequired: false, order: 4 },
      { name: "storage", type: "select", isRequired: false, order: 5 },
      { name: "battery", type: "text", isRequired: false, order: 6 },
      { name: "display_size", type: "text", isRequired: false, order: 7 },
      { name: "camera", type: "text", isRequired: false, order: 8 },
      { name: "network", type: "select", isRequired: false, order: 9 },
      { name: "warranty", type: "text", isRequired: false, order: 10 },
      { name: "color", type: "select", isRequired: false, order: 11 },
      { name: "price", type: "number", isRequired: true, order: 12 }
    ],
    "tablets": [
      { name: "brand", type: "select", isRequired: true, order: 1 },
      { name: "model", type: "select", isRequired: true, order: 2 },
      { name: "condition", type: "select", isRequired: true, order: 3 },
      { name: "storage", type: "select", isRequired: false, order: 4 },
      { name: "display_size", type: "text", isRequired: false, order: 5 },
      { name: "connectivity", type: "select", isRequired: false, order: 6 },
      { name: "battery", type: "text", isRequired: false, order: 7 },
      { name: "camera", type: "text", isRequired: false, order: 8 },
      { name: "warranty", type: "text", isRequired: false, order: 9 },
      { name: "color", type: "select", isRequired: false, order: 10 },
      { name: "price", type: "number", isRequired: true, order: 11 }
    ],
    "accessories": [
      { name: "brand", type: "select", isRequired: true, order: 1 },
      { name: "type", type: "select", isRequired: true, order: 2 },
      { name: "condition", type: "select", isRequired: true, order: 3 },
      { name: "price", type: "number", isRequired: true, order: 4 }
    ]
  },
  "electronics-appliances": {
    "laptops": [
      { name: "brand", type: "select", isRequired: true, order: 1 },
      { name: "model", type: "select", isRequired: true, order: 2 },
      { name: "condition", type: "select", isRequired: true, order: 3 },
      { name: "processor", type: "text", isRequired: false, order: 4 },
      { name: "ram", type: "select", isRequired: false, order: 5 },
      { name: "storage", type: "select", isRequired: false, order: 6 },
      { name: "graphics", type: "text", isRequired: false, order: 7 },
      { name: "screen_size", type: "text", isRequired: false, order: 8 },
      { name: "battery_backup", type: "text", isRequired: false, order: 9 },
      { name: "warranty", type: "text", isRequired: false, order: 10 },
      { name: "color", type: "select", isRequired: false, order: 11 },
      { name: "price", type: "number", isRequired: true, order: 12 }
    ],
    "tvs": [
      { name: "brand", type: "select", isRequired: true, order: 1 },
      { name: "model", type: "select", isRequired: true, order: 2 },
      { name: "screen_size", type: "text", isRequired: false, order: 3 },
      { name: "condition", type: "select", isRequired: true, order: 4 },
      { name: "price", type: "number", isRequired: true, order: 5 }
    ],
    "cameras": [
      { name: "brand", type: "select", isRequired: true, order: 1 },
      { name: "model", type: "select", isRequired: true, order: 2 },
      { name: "type", type: "select", isRequired: false, order: 3 },
      { name: "condition", type: "select", isRequired: true, order: 4 },
      { name: "price", type: "number", isRequired: true, order: 5 }
    ],
    "home-appliances": [
      { name: "brand", type: "select", isRequired: true, order: 1 },
      { name: "type", type: "select", isRequired: true, order: 2 },
      { name: "condition", type: "select", isRequired: true, order: 3 },
      { name: "price", type: "number", isRequired: true, order: 4 }
    ],
    "kitchen-appliances": [
      { name: "brand", type: "select", isRequired: true, order: 1 },
      { name: "type", type: "select", isRequired: true, order: 2 },
      { name: "condition", type: "select", isRequired: true, order: 3 },
      { name: "price", type: "number", isRequired: true, order: 4 }
    ]
  },
  "vehicles": {
    "cars": [
      { name: "brand", type: "select", isRequired: true, order: 1 },
      { name: "model", type: "select", isRequired: true, order: 2 },
      { name: "year", type: "number", isRequired: true, order: 3 },
      { name: "fuel_type", type: "select", isRequired: true, order: 4 },
      { name: "km_driven", type: "number", isRequired: true, order: 5 },
      { name: "transmission", type: "select", isRequired: true, order: 6 },
      { name: "condition", type: "select", isRequired: true, order: 7 },
      { name: "price", type: "number", isRequired: true, order: 8 }
    ],
    "bikes": [
      { name: "brand", type: "select", isRequired: true, order: 1 },
      { name: "model", type: "select", isRequired: true, order: 2 },
      { name: "year", type: "number", isRequired: true, order: 3 },
      { name: "fuel_type", type: "select", isRequired: true, order: 4 },
      { name: "km_driven", type: "number", isRequired: true, order: 5 },
      { name: "condition", type: "select", isRequired: true, order: 6 },
      { name: "price", type: "number", isRequired: true, order: 7 }
    ],
    "scooters": [
      { name: "brand", type: "select", isRequired: true, order: 1 },
      { name: "model", type: "select", isRequired: true, order: 2 },
      { name: "year", type: "number", isRequired: true, order: 3 },
      { name: "km_driven", type: "number", isRequired: true, order: 4 },
      { name: "condition", type: "select", isRequired: true, order: 5 },
      { name: "price", type: "number", isRequired: true, order: 6 }
    ]
  },
  "furniture": {
    "sofas": [
      { name: "type", type: "select", isRequired: true, order: 1 },
      { name: "material", type: "select", isRequired: false, order: 2 },
      { name: "condition", type: "select", isRequired: true, order: 3 },
      { name: "price", type: "number", isRequired: true, order: 4 }
    ],
    "tables": [
      { name: "type", type: "select", isRequired: true, order: 1 },
      { name: "material", type: "select", isRequired: false, order: 2 },
      { name: "condition", type: "select", isRequired: true, order: 3 },
      { name: "price", type: "number", isRequired: true, order: 4 }
    ],
    "beds": [
      { name: "size", type: "select", isRequired: true, order: 1 },
      { name: "material", type: "select", isRequired: false, order: 2 },
      { name: "condition", type: "select", isRequired: true, order: 3 },
      { name: "price", type: "number", isRequired: true, order: 4 }
    ]
  },
  "fashion": {
    "mens-wear": [
      { name: "brand", type: "select", isRequired: true, order: 1 },
      { name: "size", type: "select", isRequired: true, order: 2 },
      { name: "type", type: "select", isRequired: true, order: 3 },
      { name: "condition", type: "select", isRequired: true, order: 4 },
      { name: "price", type: "number", isRequired: true, order: 5 }
    ],
    "womens-wear": [
      { name: "brand", type: "select", isRequired: true, order: 1 },
      { name: "size", type: "select", isRequired: true, order: 2 },
      { name: "type", type: "select", isRequired: true, order: 3 },
      { name: "condition", type: "select", isRequired: true, order: 4 },
      { name: "price", type: "number", isRequired: true, order: 5 }
    ],
    "footwear": [
      { name: "brand", type: "select", isRequired: true, order: 1 },
      { name: "size", type: "select", isRequired: true, order: 2 },
      { name: "type", type: "select", isRequired: true, order: 3 },
      { name: "condition", type: "select", isRequired: true, order: 4 },
      { name: "price", type: "number", isRequired: true, order: 5 }
    ]
  },
  "books": {
    "fiction": [
      { name: "title", type: "text", isRequired: false, order: 1 },
      { name: "author", type: "text", isRequired: false, order: 2 },
      { name: "edition", type: "text", isRequired: false, order: 3 },
      { name: "condition", type: "select", isRequired: true, order: 4 },
      { name: "price", type: "number", isRequired: true, order: 5 }
    ],
    "non-fiction": [
      { name: "title", type: "text", isRequired: false, order: 1 },
      { name: "author", type: "text", isRequired: false, order: 2 },
      { name: "edition", type: "text", isRequired: false, order: 3 },
      { name: "condition", type: "select", isRequired: true, order: 4 },
      { name: "price", type: "number", isRequired: true, order: 5 }
    ],
    "academic": [
      { name: "title", type: "text", isRequired: false, order: 1 },
      { name: "author", type: "text", isRequired: false, order: 2 },
      { name: "edition", type: "text", isRequired: false, order: 3 },
      { name: "condition", type: "select", isRequired: true, order: 4 },
      { name: "price", type: "number", isRequired: true, order: 5 }
    ]
  },
  "books-sports-hobbies": {
    "fitness": [
      { name: "brand", type: "select", isRequired: true, order: 1 },
      { name: "model", type: "select", isRequired: true, order: 2 },
      { name: "equipment_type", type: "select", isRequired: false, order: 3 },
      { name: "max_weight", type: "text", isRequired: false, order: 4 },
      { name: "weight", type: "text", isRequired: false, order: 5 },
      { name: "material", type: "select", isRequired: false, order: 6 },
      { name: "warranty", type: "text", isRequired: false, order: 7 },
      { name: "condition", type: "select", isRequired: true, order: 8 },
      { name: "price", type: "number", isRequired: true, order: 9 }
    ],
    "outdoor": [
      { name: "brand", type: "select", isRequired: true, order: 1 },
      { name: "model", type: "select", isRequired: true, order: 2 },
      { name: "item_type", type: "select", isRequired: false, order: 3 },
      { name: "size", type: "select", isRequired: false, order: 4 },
      { name: "capacity", type: "text", isRequired: false, order: 5 },
      { name: "weight", type: "text", isRequired: false, order: 6 },
      { name: "material", type: "select", isRequired: false, order: 7 },
      { name: "waterproof", type: "select", isRequired: false, order: 8 },
      { name: "condition", type: "select", isRequired: true, order: 9 },
      { name: "price", type: "number", isRequired: true, order: 10 }
    ],
    "water-sports": [
      { name: "brand", type: "select", isRequired: true, order: 1 },
      { name: "model", type: "select", isRequired: true, order: 2 },
      { name: "item_type", type: "select", isRequired: false, order: 3 },
      { name: "size", type: "select", isRequired: false, order: 4 },
      { name: "capacity", type: "text", isRequired: false, order: 5 },
      { name: "material", type: "select", isRequired: false, order: 6 },
      { name: "anti_fog", type: "select", isRequired: false, order: 7 },
      { name: "uv_protection", type: "select", isRequired: false, order: 7 },
      { name: "chlorine_resistant", type: "select", isRequired: false, order: 7 },
      { name: "air_chambers", type: "text", isRequired: false, order: 7 },
      { name: "safety_valve", type: "select", isRequired: false, order: 7 },
      { name: "condition", type: "select", isRequired: true, order: 8 },
      { name: "price", type: "number", isRequired: true, order: 9 }
    ]
  },
  "sports": {
    "fitness": [
      { name: "brand", type: "select", isRequired: true, order: 1 },
      { name: "model", type: "select", isRequired: true, order: 2 },
      { name: "equipment_type", type: "select", isRequired: false, order: 3 },
      { name: "max_weight", type: "text", isRequired: false, order: 4 },
      { name: "weight", type: "text", isRequired: false, order: 5 },
      { name: "material", type: "select", isRequired: false, order: 6 },
      { name: "warranty", type: "text", isRequired: false, order: 7 },
      { name: "condition", type: "select", isRequired: true, order: 8 },
      { name: "price", type: "number", isRequired: true, order: 9 }
    ],
    "outdoor": [
      { name: "brand", type: "select", isRequired: true, order: 1 },
      { name: "model", type: "select", isRequired: true, order: 2 },
      { name: "item_type", type: "select", isRequired: false, order: 3 },
      { name: "size", type: "select", isRequired: false, order: 4 },
      { name: "capacity", type: "text", isRequired: false, order: 5 },
      { name: "material", type: "select", isRequired: false, order: 6 },
      { name: "waterproof", type: "select", isRequired: false, order: 7 },
      { name: "weight", type: "text", isRequired: false, order: 8 },
      { name: "power_type", type: "select", isRequired: false, order: 9 },
      { name: "condition", type: "select", isRequired: true, order: 10 },
      { name: "price", type: "number", isRequired: true, order: 11 }
    ],
    "water-sports": [
      { name: "brand", type: "select", isRequired: true, order: 1 },
      { name: "model", type: "select", isRequired: true, order: 2 },
      { name: "item_type", type: "select", isRequired: false, order: 3 },
      { name: "size", type: "select", isRequired: false, order: 4 },
      { name: "capacity", type: "text", isRequired: false, order: 5 },
      { name: "material", type: "select", isRequired: false, order: 6 },
      { name: "anti_fog", type: "select", isRequired: false, order: 7 },
      { name: "condition", type: "select", isRequired: true, order: 8 },
      { name: "price", type: "number", isRequired: true, order: 9 }
    ]
  },
  "appliances": {
    "refrigerator": [
      { name: "brand", type: "select", isRequired: true, order: 1 },
      { name: "capacity", type: "select", isRequired: false, order: 2 },
      { name: "type", type: "select", isRequired: false, order: 3 },
      { name: "condition", type: "select", isRequired: true, order: 4 },
      { name: "price", type: "number", isRequired: true, order: 5 }
    ],
    "washing-machine": [
      { name: "brand", type: "select", isRequired: true, order: 1 },
      { name: "capacity", type: "select", isRequired: false, order: 2 },
      { name: "type", type: "select", isRequired: false, order: 3 },
      { name: "condition", type: "select", isRequired: true, order: 4 },
      { name: "price", type: "number", isRequired: true, order: 5 }
    ],
    "air-conditioner": [
      { name: "brand", type: "select", isRequired: true, order: 1 },
      { name: "capacity", type: "select", isRequired: false, order: 2 },
      { name: "type", type: "select", isRequired: false, order: 3 },
      { name: "condition", type: "select", isRequired: true, order: 4 },
      { name: "price", type: "number", isRequired: true, order: 5 }
    ]
  },
  "real-estate": {
    "for-sale": [
      { name: "property_type", type: "select", isRequired: true, order: 1 },
      { name: "area_sqft", type: "number", isRequired: true, order: 2 },
      { name: "bedrooms", type: "number", isRequired: false, order: 3 },
      { name: "bathrooms", type: "number", isRequired: false, order: 4 },
      { name: "location", type: "text", isRequired: true, order: 5 },
      { name: "price", type: "number", isRequired: true, order: 6 }
    ],
    "for-rent": [
      { name: "property_type", type: "select", isRequired: true, order: 1 },
      { name: "area_sqft", type: "number", isRequired: true, order: 2 },
      { name: "bedrooms", type: "number", isRequired: false, order: 3 },
      { name: "bathrooms", type: "number", isRequired: false, order: 4 },
      { name: "location", type: "text", isRequired: true, order: 5 },
      { name: "rent", type: "number", isRequired: true, order: 6 }
    ],
    "commercial": [
      { name: "property_type", type: "select", isRequired: true, order: 1 },
      { name: "area_sqft", type: "number", isRequired: true, order: 2 },
      { name: "location", type: "text", isRequired: true, order: 3 },
      { name: "price", type: "number", isRequired: true, order: 4 }
    ]
  }
};

// Common options for select fields
const commonOptions = {
  condition: ["New", "Like New", "Excellent", "Good", "Fair", "Poor"],
  ram: ["2 GB", "4 GB", "6 GB", "8 GB", "12 GB", "16 GB", "32 GB"],
  storage: ["32 GB", "64 GB", "128 GB", "256 GB", "512 GB", "1 TB"],
  network: ["4G", "5G", "Wi-Fi Only"],
  fuel_type: ["Petrol", "Diesel", "Electric", "CNG", "Hybrid"],
  transmission: ["Manual", "Automatic", "CVT", "AMT"],
  connectivity: ["Wi-Fi Only", "Wi-Fi + Cellular"],
  size: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
  material: ["Wood", "Metal", "Plastic", "Leather", "Fabric", "Glass"],
  type: ["Sofa", "Recliner", "Sectional", "Loveseat"],
  property_type: ["Apartment", "House", "Villa", "Plot", "Commercial"],
  capacity: ["Small", "Medium", "Large", "Extra Large"]
};

async function seedSubcategorySpecifications() {
  try {
    console.log('\n📦 Seeding Subcategory Specifications...\n');
    console.log('='.repeat(80));

    await prisma.$connect();
    console.log('✅ Connected to database\n');

    let totalSpecs = 0;
    let totalOptions = 0;

    for (const [categorySlug, subcategories] of Object.entries(specificationsData)) {
      // Find category
      const category = await prisma.category.findUnique({
        where: { slug: categorySlug }
      });

      if (!category) {
        console.warn(`⚠️  Category not found: ${categorySlug}`);
        continue;
      }

      console.log(`\n📁 Category: ${category.name}`);

      for (const [subcategorySlug, specs] of Object.entries(subcategories)) {
        // Find subcategory
        const subcategory = await prisma.subcategory.findFirst({
          where: {
            slug: subcategorySlug,
            categoryId: category.id
          }
        });

        if (!subcategory) {
          console.warn(`  ⚠️  Subcategory not found: ${subcategorySlug}`);
          continue;
        }

        console.log(`  📂 Subcategory: ${subcategory.name}`);

        // Create or update specifications
        for (const specData of specs) {
          // Check if specification already exists
          const existingSpec = await prisma.specification.findFirst({
            where: {
              categoryId: category.id,
              subcategoryId: subcategory.id,
              name: specData.name,
              adId: null, // Only category defaults, not product-specific
              isActive: true
            }
          });

          let spec;
          if (existingSpec) {
            // Update existing specification
            spec = await prisma.specification.update({
              where: { id: existingSpec.id },
              data: {
                label: specData.name.charAt(0).toUpperCase() + specData.name.slice(1).replace(/_/g, ' '), // Convert name to label
                type: specData.type,
                required: specData.isRequired,
                isActive: true,
                order: specData.order
              }
            });
          } else {
            // Create new specification
            const specFields = {
              name: specData.name,
              label: specData.name.charAt(0).toUpperCase() + specData.name.slice(1).replace(/_/g, ' '), // Convert name to label
              type: specData.type,
              required: specData.isRequired,
              isActive: true,
              order: specData.order,
              categoryId: category.id,
              subcategoryId: subcategory.id,
              adId: null // Category default, not product-specific
            };
            
            spec = await prisma.specification.create({
              data: specFields
            });
          }

          console.log(`    ✅ Specification: ${specData.name} (${specData.type})`);
          totalSpecs++;

          // Add options for select type specifications
          if (specData.type === 'select') {
            const options = commonOptions[specData.name] || [];
            
            if (options.length > 0) {
              for (let i = 0; i < options.length; i++) {
                const optionValue = options[i];
                
                // Check if option already exists
                const existingOption = await prisma.specificationOption.findFirst({
                  where: {
                    specificationId: spec.id,
                    value: optionValue
                  }
                });
                
                if (existingOption) {
                  // Update existing option
                  await prisma.specificationOption.update({
                    where: { id: existingOption.id },
                    data: {
                      isActive: true,
                      order: i
                    }
                  });
                } else {
                  // Create new option
                  await prisma.specificationOption.create({
                    data: {
                      specificationId: spec.id,
                      value: optionValue,
                      label: optionValue,
                      isActive: true,
                      order: i
                    }
                  });
                }
                totalOptions++;
              }
              console.log(`      📋 Options: ${options.length}`);
            }
          }
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ Specifications seeding completed!`);
    console.log(`   Total Specifications: ${totalSpecs}`);
    console.log(`   Total Options: ${totalOptions}`);
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Error seeding specifications:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedSubcategorySpecifications();

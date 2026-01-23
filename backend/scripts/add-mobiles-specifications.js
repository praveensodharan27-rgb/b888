/**
 * Script to add specifications for Mobiles category
 * Run: node backend/scripts/add-mobiles-specifications.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MOBILES_SPECIFICATIONS = [
  {
    name: 'brand',
    label: 'Brand',
    type: 'select',
    required: true,
    placeholder: 'Select brand',
    order: 1,
    options: [
      { value: 'apple', label: 'Apple' },
      { value: 'samsung', label: 'Samsung' },
      { value: 'xiaomi', label: 'Xiaomi' },
      { value: 'oneplus', label: 'OnePlus' },
      { value: 'oppo', label: 'Oppo' },
      { value: 'vivo', label: 'Vivo' },
      { value: 'realme', label: 'Realme' },
      { value: 'motorola', label: 'Motorola' },
      { value: 'nokia', label: 'Nokia' },
      { value: 'google', label: 'Google' },
      { value: 'nothing', label: 'Nothing' },
      { value: 'other', label: 'Other' }
    ]
  },
  {
    name: 'model',
    label: 'Model',
    type: 'text',
    required: true,
    placeholder: 'e.g., iPhone 13, Galaxy S21',
    order: 2
  },
  {
    name: 'storage',
    label: 'Storage',
    type: 'select',
    required: true,
    placeholder: 'Select storage',
    order: 3,
    options: [
      { value: '32gb', label: '32GB' },
      { value: '64gb', label: '64GB' },
      { value: '128gb', label: '128GB' },
      { value: '256gb', label: '256GB' },
      { value: '512gb', label: '512GB' },
      { value: '1tb', label: '1TB' }
    ]
  },
  {
    name: 'ram',
    label: 'RAM',
    type: 'select',
    required: false,
    placeholder: 'Select RAM',
    order: 4,
    options: [
      { value: '2gb', label: '2GB' },
      { value: '3gb', label: '3GB' },
      { value: '4gb', label: '4GB' },
      { value: '6gb', label: '6GB' },
      { value: '8gb', label: '8GB' },
      { value: '12gb', label: '12GB' },
      { value: '16gb', label: '16GB' }
    ]
  },
  {
    name: 'color',
    label: 'Color',
    type: 'select',
    required: false,
    placeholder: 'Select color',
    order: 5,
    options: [
      { value: 'black', label: 'Black' },
      { value: 'white', label: 'White' },
      { value: 'blue', label: 'Blue' },
      { value: 'red', label: 'Red' },
      { value: 'green', label: 'Green' },
      { value: 'purple', label: 'Purple' },
      { value: 'gold', label: 'Gold' },
      { value: 'silver', label: 'Silver' },
      { value: 'pink', label: 'Pink' },
      { value: 'other', label: 'Other' }
    ]
  },
  {
    name: 'condition',
    label: 'Condition',
    type: 'select',
    required: true,
    placeholder: 'Select condition',
    order: 6,
    options: [
      { value: 'new', label: 'New' },
      { value: 'like_new', label: 'Like New' },
      { value: 'excellent', label: 'Excellent' },
      { value: 'good', label: 'Good' },
      { value: 'fair', label: 'Fair' }
    ]
  },
  {
    name: 'warranty',
    label: 'Warranty',
    type: 'select',
    required: false,
    placeholder: 'Select warranty',
    order: 7,
    options: [
      { value: 'no_warranty', label: 'No Warranty' },
      { value: '1_month', label: '1 Month' },
      { value: '3_months', label: '3 Months' },
      { value: '6_months', label: '6 Months' },
      { value: '1_year', label: '1 Year' },
      { value: '2_years', label: '2 Years' },
      { value: 'manufacturer_warranty', label: 'Manufacturer Warranty' }
    ]
  },
  {
    name: 'battery_health',
    label: 'Battery Health',
    type: 'select',
    required: false,
    placeholder: 'Select battery health',
    order: 8,
    options: [
      { value: '100', label: '100%' },
      { value: '90-99', label: '90-99%' },
      { value: '80-89', label: '80-89%' },
      { value: '70-79', label: '70-79%' },
      { value: '60-69', label: '60-69%' },
      { value: 'below_60', label: 'Below 60%' }
    ]
  },
  {
    name: 'price_range',
    label: 'Price Range',
    type: 'select',
    required: false,
    placeholder: 'Select price range',
    order: 9,
    options: [
      { value: 'under_5k', label: 'Under ₹5,000' },
      { value: '5k_10k', label: '₹5,000 - ₹10,000' },
      { value: '10k_20k', label: '₹10,000 - ₹20,000' },
      { value: '20k_30k', label: '₹20,000 - ₹30,000' },
      { value: '30k_50k', label: '₹30,000 - ₹50,000' },
      { value: '50k_80k', label: '₹50,000 - ₹80,000' },
      { value: 'above_80k', label: 'Above ₹80,000' }
    ]
  }
];

async function addMobilesSpecifications() {
  try {
    console.log('🔍 Finding Mobiles category...');
    
    // Find category by slug or name
    const category = await prisma.category.findFirst({
      where: {
        OR: [
          { slug: 'mobiles' },
          { slug: 'mobile' },
          { slug: 'phones' },
          { name: { contains: 'Mobile', mode: 'insensitive' } },
          { name: { contains: 'Phone', mode: 'insensitive' } }
        ]
      }
    });

    if (!category) {
      console.error('❌ Mobiles category not found. Please create it first or check the category name.');
      console.log('Available categories:');
      const allCategories = await prisma.category.findMany({
        select: { id: true, name: true, slug: true }
      });
      allCategories.forEach(cat => {
        console.log(`  - ${cat.name} (${cat.slug})`);
      });
      return;
    }

    console.log(`✅ Found category: ${category.name} (${category.slug})`);
    console.log(`📝 Adding ${MOBILES_SPECIFICATIONS.length} specifications...\n`);

    const results = [];

    for (const specData of MOBILES_SPECIFICATIONS) {
      try {
        // Check if specification already exists
        const existing = await prisma.specification.findFirst({
          where: {
            name: specData.name,
            categoryId: category.id
          }
        });

        if (existing) {
          console.log(`⚠️  Specification "${specData.label}" already exists. Skipping...`);
          results.push({ spec: specData.label, status: 'skipped', reason: 'already exists' });
          continue;
        }

        // Create specification
        const { options, ...specFields } = specData;
        const specification = await prisma.specification.create({
          data: {
            ...specFields,
            categoryId: category.id,
            subcategoryId: null
          }
        });

        console.log(`✅ Created specification: ${specification.label}`);

        // Create options if provided
        if (options && options.length > 0) {
          for (let i = 0; i < options.length; i++) {
            const option = options[i];
            await prisma.specificationOption.create({
              data: {
                value: option.value,
                label: option.label || option.value,
                specificationId: specification.id,
                order: i
              }
            });
          }
          console.log(`   └─ Added ${options.length} options`);
        }

        results.push({ spec: specData.label, status: 'created', id: specification.id });
      } catch (error) {
        console.error(`❌ Error creating specification "${specData.label}":`, error.message);
        results.push({ spec: specData.label, status: 'error', error: error.message });
      }
    }

    console.log('\n📊 Summary:');
    console.log('='.repeat(50));
    results.forEach(result => {
      const icon = result.status === 'created' ? '✅' : result.status === 'skipped' ? '⚠️' : '❌';
      console.log(`${icon} ${result.spec}: ${result.status}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    const created = results.filter(r => r.status === 'created').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const errors = results.filter(r => r.status === 'error').length;

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Created: ${created}`);
    console.log(`⚠️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addMobilesSpecifications();

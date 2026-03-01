require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMobileSpecs() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 Checking Mobile Phones Specifications');
    console.log('='.repeat(80) + '\n');

    // Find category
    const category = await prisma.category.findUnique({
      where: { slug: 'mobiles' },
      include: {
        subcategories: {
          where: { slug: 'mobile-phones' }
        }
      }
    });

    if (!category) {
      console.error('❌ Category "mobiles" not found!');
      return;
    }

    console.log('✅ Category found:', {
      id: category.id,
      name: category.name,
      slug: category.slug
    });

    const subcategory = category.subcategories[0];
    if (!subcategory) {
      console.error('❌ Subcategory "mobile-phones" not found!');
      return;
    }

    console.log('✅ Subcategory found:', {
      id: subcategory.id,
      name: subcategory.name,
      slug: subcategory.slug,
      categoryId: subcategory.categoryId
    });

    // Get specifications
    const specifications = await prisma.specification.findMany({
      where: {
        categoryId: category.id,
        subcategoryId: subcategory.id,
        isActive: true,
        adId: null
      },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { order: 'asc' }
    });

    console.log('\n📋 Specifications found:', specifications.length);
    console.log('\nSpecification Details:');
    specifications.forEach((spec, index) => {
      console.log(`\n${index + 1}. ${spec.label} (${spec.name})`);
      console.log(`   Type: ${spec.type}`);
      console.log(`   Required: ${spec.required}`);
      console.log(`   Order: ${spec.order}`);
      console.log(`   Options: ${spec.options.length}`);
      if (spec.options.length > 0) {
        console.log(`   Sample options: ${spec.options.slice(0, 3).map(o => o.value).join(', ')}`);
      }
    });

    // Check specifically for model and price
    const modelSpec = specifications.find(s => s.name === 'model');
    const priceSpec = specifications.find(s => s.name === 'price');

    console.log('\n' + '='.repeat(80));
    console.log('🔍 Key Fields Check:');
    console.log('='.repeat(80));
    console.log(`Model field: ${modelSpec ? '✅ Found' : '❌ Missing'}`);
    if (modelSpec) {
      console.log(`   - ID: ${modelSpec.id}`);
      console.log(`   - Label: ${modelSpec.label}`);
      console.log(`   - Type: ${modelSpec.type}`);
      console.log(`   - Required: ${modelSpec.required}`);
      console.log(`   - Options: ${modelSpec.options.length}`);
    }
    console.log(`Price field: ${priceSpec ? '✅ Found' : '❌ Missing'}`);
    if (priceSpec) {
      console.log(`   - ID: ${priceSpec.id}`);
      console.log(`   - Label: ${priceSpec.label}`);
      console.log(`   - Type: ${priceSpec.type}`);
      console.log(`   - Required: ${priceSpec.required}`);
    }
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMobileSpecs();

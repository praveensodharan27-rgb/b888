require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function removeMobilePhoneSpecs() {
  try {
    console.log('\n🧹 Removing all mobile phone specifications...\n');
    console.log('='.repeat(80));

    // Find mobile phones subcategory
    const mobileCategory = await prisma.category.findFirst({
      where: { slug: 'mobiles' }
    });

    if (!mobileCategory) {
      console.error('❌ Mobile category not found');
      return;
    }

    const mobilePhonesSubcat = await prisma.subcategory.findFirst({
      where: {
        slug: 'mobile-phones',
        categoryId: mobileCategory.id
      }
    });

    if (!mobilePhonesSubcat) {
      console.error('❌ Mobile phones subcategory not found');
      return;
    }

    console.log(`✅ Found subcategory: ${mobilePhonesSubcat.name} (ID: ${mobilePhonesSubcat.id})`);

    // Get all specifications for mobile-phones
    const specs = await prisma.specification.findMany({
      where: { subcategoryId: mobilePhonesSubcat.id }
    });

    console.log(`\n📋 Found ${specs.length} specifications to remove`);

    let totalRemoved = 0;

    for (const spec of specs) {
      // Delete related options
      const optionsDeleted = await prisma.specificationOption.deleteMany({
        where: { specificationId: spec.id }
      });

      // Delete related custom values
      const valuesDeleted = await prisma.adSpecificationValue.deleteMany({
        where: { specificationId: spec.id }
      });

      // Delete the specification
      await prisma.specification.delete({
        where: { id: spec.id }
      });

      totalRemoved++;
      console.log(`  ✅ Removed: ${spec.name} (${optionsDeleted.count} options, ${valuesDeleted.count} values)`);
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ Removed ${totalRemoved} specifications for mobile-phones`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error removing mobile phone specs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

removeMobilePhoneSpecs()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

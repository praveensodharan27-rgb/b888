require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function removeMokiaEntries() {
  try {
    console.log('\n🧹 Removing mokia and yyytytty entries from database...\n');
    console.log('='.repeat(80));

    const unwantedEntries = ['mokia', 'yyytytty'];
    let totalRemoved = 0;

    // 1. Remove from SpecificationOption
    console.log('\n📋 Step 1: Removing from SpecificationOption...');
    const allSpecOptions = await prisma.specificationOption.findMany();
    const unwantedOptions = allSpecOptions.filter(opt => {
      const value = (opt.value || '').toLowerCase();
      const label = (opt.label || '').toLowerCase();
      return unwantedEntries.some(entry => 
        value.includes(entry) || label.includes(entry)
      );
    });

    console.log(`Found ${unwantedOptions.length} specification options with unwanted entries`);
    
    for (const option of unwantedOptions) {
      await prisma.specificationOption.delete({
        where: { id: option.id }
      });
      totalRemoved++;
      console.log(`  ✅ Removed option: ${option.value || option.label} (ID: ${option.id})`);
    }

    // 2. Remove from AdSpecificationValue
    console.log('\n💾 Step 2: Removing from AdSpecificationValue...');
    const allSpecValues = await prisma.adSpecificationValue.findMany();
    const unwantedValues = allSpecValues.filter(val => {
      const value = (val.value || '').toLowerCase();
      return unwantedEntries.some(entry => value.includes(entry));
    });

    console.log(`Found ${unwantedValues.length} specification values with unwanted entries`);
    
    for (const value of unwantedValues) {
      await prisma.adSpecificationValue.delete({
        where: { id: value.id }
      });
      totalRemoved++;
      console.log(`  ✅ Removed value: ${value.value} (ID: ${value.id})`);
    }

    // 3. Remove from Ad attributes
    console.log('\n📱 Step 3: Removing from Ad attributes...');
    const allAds = await prisma.ad.findMany({
      select: { id: true, attributes: true }
    });

    const adsToUpdate = allAds.filter(ad => {
      if (!ad.attributes || typeof ad.attributes !== 'object') return false;
      const attrs = ad.attributes;
      const brand = attrs.brand || attrs.Brand || attrs.brand_name;
      const model = attrs.model || attrs.Model || attrs.model_name;
      const brandStr = (brand || '').toString().toLowerCase();
      const modelStr = (model || '').toString().toLowerCase();
      return unwantedEntries.some(entry => 
        brandStr.includes(entry) || modelStr.includes(entry)
      );
    });

    console.log(`Found ${adsToUpdate.length} ads with unwanted entries in attributes`);
    
    for (const ad of adsToUpdate) {
      const updatedAttributes = { ...ad.attributes };
      let updated = false;

      const brand = updatedAttributes.brand || updatedAttributes.Brand || updatedAttributes.brand_name;
      const model = updatedAttributes.model || updatedAttributes.Model || updatedAttributes.model_name;

      if (brand && unwantedEntries.some(entry => brand.toString().toLowerCase().includes(entry))) {
        if (updatedAttributes.brand) delete updatedAttributes.brand;
        if (updatedAttributes.Brand) delete updatedAttributes.Brand;
        if (updatedAttributes.brand_name) delete updatedAttributes.brand_name;
        updated = true;
      }
      if (model && unwantedEntries.some(entry => model.toString().toLowerCase().includes(entry))) {
        if (updatedAttributes.model) delete updatedAttributes.model;
        if (updatedAttributes.Model) delete updatedAttributes.Model;
        if (updatedAttributes.model_name) delete updatedAttributes.model_name;
        updated = true;
      }

      if (updated) {
        await prisma.ad.update({
          where: { id: ad.id },
          data: { attributes: updatedAttributes }
        });
        totalRemoved++;
        console.log(`  ✅ Updated ad: ${ad.id}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ Cleanup completed! Total items removed/updated: ${totalRemoved}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error removing mokia entries:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

removeMokiaEntries()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

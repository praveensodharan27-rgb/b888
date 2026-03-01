require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Entries to remove
const entriesToRemove = ['mokia', 'yyytytty'];

async function removeTestEntries() {
  try {
    console.log('\n🧹 Removing test entries from database...\n');
    console.log('Entries to remove:', entriesToRemove);
    console.log('='.repeat(80));

    let totalRemoved = 0;

    // 1. Remove from Ad attributes (brand/model fields)
    console.log('\n📱 Step 1: Removing from Ad attributes...');
    // Fetch all ads and filter in JavaScript since Prisma doesn't support nested JSON queries
    const allAds = await prisma.ad.findMany({
      select: { id: true, attributes: true }
    });

    const adsToUpdate = allAds.filter(ad => {
      if (!ad.attributes || typeof ad.attributes !== 'object') return false;
      const attrs = ad.attributes;
      const brand = attrs.brand || attrs.Brand || attrs.brand_name;
      const model = attrs.model || attrs.Model || attrs.model_name;
      return (brand && entriesToRemove.includes(brand.toString().toLowerCase())) ||
             (model && entriesToRemove.includes(model.toString().toLowerCase()));
    });

    console.log(`Found ${adsToUpdate.length} ads with test entries in attributes`);
    
    for (const ad of adsToUpdate) {
      const updatedAttributes = { ...ad.attributes };
      let updated = false;

      const brand = updatedAttributes.brand || updatedAttributes.Brand || updatedAttributes.brand_name;
      const model = updatedAttributes.model || updatedAttributes.Model || updatedAttributes.model_name;

      if (brand && entriesToRemove.includes(brand.toString().toLowerCase())) {
        if (updatedAttributes.brand) delete updatedAttributes.brand;
        if (updatedAttributes.Brand) delete updatedAttributes.Brand;
        if (updatedAttributes.brand_name) delete updatedAttributes.brand_name;
        updated = true;
      }
      if (model && entriesToRemove.includes(model.toString().toLowerCase())) {
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

    // 2. Remove from SpecificationOption
    console.log('\n📋 Step 2: Removing from SpecificationOption...');
    const allSpecOptions = await prisma.specificationOption.findMany();
    const specOptions = allSpecOptions.filter(opt => {
      const value = (opt.value || '').toLowerCase();
      const label = (opt.label || '').toLowerCase();
      return entriesToRemove.some(entry => {
        const entryLower = entry.toLowerCase();
        return value === entryLower || value.includes(entryLower) || 
               label === entryLower || label.includes(entryLower);
      });
    });

    console.log(`Found ${specOptions.length} specification options to remove`);
    
    for (const option of specOptions) {
      await prisma.specificationOption.delete({
        where: { id: option.id }
      });
      totalRemoved++;
      console.log(`  ✅ Removed option: ${option.value || option.label} (ID: ${option.id})`);
    }

    // 3. Remove from AdSpecificationValue
    console.log('\n💾 Step 3: Removing from AdSpecificationValue...');
    const allSpecValues = await prisma.adSpecificationValue.findMany();
    const specValues = allSpecValues.filter(val => {
      const value = (val.value || '').toLowerCase();
      return entriesToRemove.some(entry => {
        const entryLower = entry.toLowerCase();
        return value === entryLower || value.includes(entryLower);
      });
    });

    console.log(`Found ${specValues.length} specification values to remove`);
    
    for (const value of specValues) {
      await prisma.adSpecificationValue.delete({
        where: { id: value.id }
      });
      totalRemoved++;
      console.log(`  ✅ Removed value: ${value.value} (ID: ${value.id})`);
    }

    // 3b. Also check and remove from any custom autocomplete suggestions
    console.log('\n🔍 Step 3b: Checking for entries in search/autocomplete data...');
    // This would be handled by the database cleanup above
    // But we can also check if there are any cached suggestions

    // 4. Check brands-models.json file
    console.log('\n📂 Step 4: Checking brands-models.json file...');
    const fs = require('fs');
    const path = require('path');
    const brandsModelsPath = path.join(__dirname, '../data/brands-models.json');
    
    if (fs.existsSync(brandsModelsPath)) {
      const brandsModelsData = JSON.parse(fs.readFileSync(brandsModelsPath, 'utf8'));
      let fileUpdated = false;
      
      // Remove entries from all categories and subcategories
      brandsModelsData.categories = brandsModelsData.categories.map(category => {
        const updatedCategory = { ...category };
        updatedCategory.subcategories = category.subcategories.map(subcat => {
          const updatedSubcat = { ...subcat };
          if (Array.isArray(subcat.brands)) {
            const originalLength = subcat.brands.length;
            updatedSubcat.brands = subcat.brands.filter(brand => {
              const brandName = (brand.name || brand).toLowerCase();
              return !entriesToRemove.some(entry => brandName.includes(entry.toLowerCase()));
            });
            
            // Also filter models within brands
            updatedSubcat.brands = updatedSubcat.brands.map(brand => {
              if (typeof brand === 'object' && Array.isArray(brand.models)) {
                const filteredModels = brand.models.filter(model => {
                  const modelName = (model || '').toLowerCase();
                  return !entriesToRemove.some(entry => modelName.includes(entry.toLowerCase()));
                });
                return { ...brand, models: filteredModels };
              }
              return brand;
            });
            
            if (updatedSubcat.brands.length !== originalLength) {
              fileUpdated = true;
            }
          }
          return updatedSubcat;
        });
        return updatedCategory;
      });
      
      if (fileUpdated) {
        fs.writeFileSync(brandsModelsPath, JSON.stringify(brandsModelsData, null, 2), 'utf8');
        console.log('  ✅ Updated brands-models.json file');
        totalRemoved++;
      } else {
        console.log('  ℹ️  No test entries found in brands-models.json');
      }
    } else {
      console.log('  ℹ️  brands-models.json file not found');
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ Cleanup completed! Total items removed/updated: ${totalRemoved}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error removing test entries:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
removeTestEntries()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

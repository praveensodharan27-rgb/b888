require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkMokiaEntries() {
  try {
    console.log('\n🔍 Checking for mokia entries in database...\n');
    console.log('='.repeat(80));

    const unwantedEntries = ['mokia', 'yyytytty'];
    let foundCount = 0;

    // 1. Check SpecificationOption
    console.log('\n📋 Step 1: Checking SpecificationOption...');
    const allSpecOptions = await prisma.specificationOption.findMany();
    const unwantedOptions = allSpecOptions.filter(opt => {
      const value = (opt.value || '').toLowerCase();
      const label = (opt.label || '').toLowerCase();
      return unwantedEntries.some(entry => 
        value.includes(entry) || label.includes(entry)
      );
    });

    console.log(`Found ${unwantedOptions.length} specification options with unwanted entries`);
    if (unwantedOptions.length > 0) {
      unwantedOptions.forEach(opt => {
        console.log(`  ⚠️  - ${opt.value || opt.label} (ID: ${opt.id})`);
        foundCount++;
      });
    }

    // 2. Check AdSpecificationValue
    console.log('\n💾 Step 2: Checking AdSpecificationValue...');
    const allSpecValues = await prisma.adSpecificationValue.findMany();
    const unwantedValues = allSpecValues.filter(val => {
      const value = (val.value || '').toLowerCase();
      return unwantedEntries.some(entry => value.includes(entry));
    });

    console.log(`Found ${unwantedValues.length} specification values with unwanted entries`);
    if (unwantedValues.length > 0) {
      unwantedValues.forEach(val => {
        console.log(`  ⚠️  - ${val.value} (ID: ${val.id})`);
        foundCount++;
      });
    }

    // 3. Check Ad attributes
    console.log('\n📱 Step 3: Checking Ad attributes...');
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
    if (adsToUpdate.length > 0) {
      adsToUpdate.forEach(ad => {
        const attrs = ad.attributes;
        const brand = attrs.brand || attrs.Brand || attrs.brand_name;
        const model = attrs.model || attrs.Model || attrs.model_name;
        console.log(`  ⚠️  - Ad ID: ${ad.id}, Brand: ${brand}, Model: ${model}`);
        foundCount++;
      });
    }

    // 4. Check brands-models.json
    console.log('\n📂 Step 4: Checking brands-models.json...');
    const fs = require('fs');
    const path = require('path');
    const brandsModelsPath = path.join(__dirname, '../data/brands-models.json');
    
    if (fs.existsSync(brandsModelsPath)) {
      const brandsModelsData = JSON.parse(fs.readFileSync(brandsModelsPath, 'utf8'));
      let foundInFile = false;
      
      const checkObject = (obj, path = '') => {
        if (typeof obj === 'string') {
          const lower = obj.toLowerCase();
          if (unwantedEntries.some(entry => lower.includes(entry))) {
            console.log(`  ⚠️  Found at: ${path} = "${obj}"`);
            foundInFile = true;
            foundCount++;
          }
        } else if (Array.isArray(obj)) {
          obj.forEach((item, i) => checkObject(item, `${path}[${i}]`));
        } else if (typeof obj === 'object' && obj !== null) {
          Object.keys(obj).forEach(key => checkObject(obj[key], path ? `${path}.${key}` : key));
        }
      };
      
      checkObject(brandsModelsData);
      
      if (!foundInFile) {
        console.log('  ✅ No unwanted entries found in brands-models.json');
      }
    } else {
      console.log('  ℹ️  brands-models.json file not found');
    }

    console.log('\n' + '='.repeat(80));
    if (foundCount > 0) {
      console.log(`⚠️  Found ${foundCount} unwanted entries! Run cleanup script to remove them.`);
    } else {
      console.log('✅ No unwanted entries found in database or files!');
      console.log('💡 If you still see "mokia" in the UI, try:');
      console.log('   1. Clear browser cache (Ctrl+Shift+Delete)');
      console.log('   2. Hard refresh the page (Ctrl+F5)');
      console.log('   3. Clear React Query cache (restart frontend)');
    }
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error checking mokia entries:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkMokiaEntries()
  .then(() => {
    console.log('\n✅ Check completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });

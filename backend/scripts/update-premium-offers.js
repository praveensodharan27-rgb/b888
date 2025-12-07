/**
 * Script to update PremiumSettings to include offerPrices structure
 * Run with: node scripts/update-premium-offers.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updatePremiumOffers() {
  try {
    console.log('🔄 Updating PremiumSettings to include offerPrices...');

    // Get current settings
    const settingsRecord = await prisma.premiumSettings.findUnique({
      where: { key: 'premium_settings' }
    });

    let currentSettings = {
      prices: {
        TOP: parseFloat(process.env.PREMIUM_PRICE_TOP || '299'),
        FEATURED: parseFloat(process.env.PREMIUM_PRICE_FEATURED || '199'),
        BUMP_UP: parseFloat(process.env.PREMIUM_PRICE_BUMP_UP || '99'),
        URGENT: parseFloat(process.env.PREMIUM_PRICE_URGENT || '49'),
      },
      durations: {
        TOP: parseInt(process.env.PREMIUM_DURATION_TOP || '7'),
        FEATURED: parseInt(process.env.PREMIUM_DURATION_FEATURED || '14'),
        BUMP_UP: parseInt(process.env.PREMIUM_DURATION_BUMP_UP || '1'),
        URGENT: parseInt(process.env.PREMIUM_DURATION_URGENT || '7'),
      },
    };

    // If settings exist, parse and merge
    if (settingsRecord && settingsRecord.value) {
      try {
        const parsed = JSON.parse(settingsRecord.value);
        currentSettings = {
          ...currentSettings,
          ...parsed,
        };
        console.log('✅ Found existing settings, merging...');
      } catch (e) {
        console.warn('⚠️ Could not parse existing settings, using defaults');
      }
    }

    // Ensure offerPrices structure exists
    if (!currentSettings.offerPrices) {
      currentSettings.offerPrices = {
        TOP: null,
        FEATURED: null,
        BUMP_UP: null,
        URGENT: null,
      };
      console.log('✅ Added offerPrices structure');
    } else {
      // Ensure all offer price fields exist
      const requiredOfferFields = ['TOP', 'FEATURED', 'BUMP_UP', 'URGENT'];
      let updated = false;
      for (const field of requiredOfferFields) {
        if (currentSettings.offerPrices[field] === undefined) {
          currentSettings.offerPrices[field] = null;
          updated = true;
        }
      }
      if (updated) {
        console.log('✅ Updated offerPrices structure with missing fields');
      }
    }

    // Save updated settings
    await prisma.premiumSettings.upsert({
      where: { key: 'premium_settings' },
      update: {
        value: JSON.stringify(currentSettings),
      },
      create: {
        key: 'premium_settings',
        value: JSON.stringify(currentSettings),
      }
    });

    console.log('✅ PremiumSettings updated successfully!');
    console.log('📊 Current structure:');
    console.log(JSON.stringify(currentSettings, null, 2));

  } catch (error) {
    console.error('❌ Error updating PremiumSettings:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updatePremiumOffers();


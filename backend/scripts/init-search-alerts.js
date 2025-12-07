const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Initialize search alert settings with defaults
 */
async function initializeSearchAlertSettings() {
  try {
    console.log('🔧 Initializing search alert settings...');

    // Check if settings already exist
    const existingSettings = await prisma.searchAlertSettings.findFirst();

    if (existingSettings) {
      console.log('✅ Search alert settings already exist');
      console.log('Settings:', JSON.stringify(existingSettings, null, 2));
      return;
    }

    // Create default settings
    const settings = await prisma.searchAlertSettings.create({
      data: {
        enabled: true,
        maxEmailsPerUser: 5,
        checkIntervalHours: 24,
        emailSubject: 'New products matching your search!',
        emailBody: `
          <p>Hi there!</p>
          <p>We found some exciting products matching your recent search: <strong>{{query}}</strong></p>
          <p>Here are {{count}} products you might be interested in:</p>
          {{products}}
          <p style="margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
               style="display: inline-block; padding: 12px 24px; background-color: #667eea; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Browse More Products
            </a>
          </p>
          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            Happy shopping on SellIt!
          </p>
        `.trim()
      }
    });

    console.log('✅ Search alert settings created successfully');
    console.log('Settings:', JSON.stringify(settings, null, 2));
    console.log('\n📝 Available template variables:');
    console.log('   - {{query}} - The search query');
    console.log('   - {{products}} - HTML list of matching products');
    console.log('   - {{count}} - Number of matching products');

  } catch (error) {
    console.error('❌ Error initializing search alert settings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  initializeSearchAlertSettings()
    .then(() => {
      console.log('\n✅ Initialization complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Initialization failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeSearchAlertSettings };


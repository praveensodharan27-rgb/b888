require('dotenv').config();
const { initializeIndex, checkMeilisearchConnection } = require('../services/meilisearch');

async function initialize() {
  try {
    console.log('🔍 Initializing Meilisearch cloud index...');
    console.log('Host:', process.env.MEILISEARCH_HOST);
    
    // Check connection
    const isConnected = await checkMeilisearchConnection();
    if (!isConnected) {
      console.error('❌ Cannot connect to Meilisearch cloud');
      process.exit(1);
    }
    
    // Initialize index
    const success = await initializeIndex();
    if (success) {
      console.log('✅ Meilisearch cloud index initialized successfully!');
      console.log('📊 Index configured with:');
      console.log('  - Searchable: title, description, category, subcategory, location, city, state, neighbourhood, exactLocation, tags');
      console.log('  - Fuzzy matching: Enabled');
      console.log('  - Typo tolerance: Enabled');
    } else {
      console.error('❌ Failed to initialize index');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

initialize();

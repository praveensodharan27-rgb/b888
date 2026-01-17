require('dotenv').config();
const { MeiliSearch } = require('meilisearch');

const client = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_MASTER_KEY || 'masterKey',
});

async function testConnection() {
  try {
    console.log('🔍 Testing Meilisearch cloud connection...');
    console.log('Host:', process.env.MEILISEARCH_HOST);
    console.log('Master Key:', process.env.MEILISEARCH_MASTER_KEY ? '***' + process.env.MEILISEARCH_MASTER_KEY.slice(-4) : 'Not set');
    
    const health = await client.health();
    console.log('✅ Meilisearch cloud connection successful!');
    console.log('Health status:', health);
    
    // Test index operations
    const index = client.index('ads');
    const stats = await index.getStats();
    console.log('📊 Index stats:', stats);
    
    return true;
  } catch (error) {
    console.error('❌ Meilisearch connection failed:', error.message);
    return false;
  }
}

testConnection().then(success => {
  if (success) {
    console.log('\n✅ Meilisearch cloud is ready!');
    console.log('You can now restart your backend server.');
  } else {
    console.log('\n❌ Please check your Meilisearch credentials.');
  }
  process.exit(success ? 0 : 1);
});

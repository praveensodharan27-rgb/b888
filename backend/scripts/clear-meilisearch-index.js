#!/usr/bin/env node

/**
 * Clear Meilisearch Index
 * Removes all documents from the ads index
 */

require('dotenv').config();
const { MeiliSearch } = require('meilisearch');

const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || 'http://127.0.0.1:7700';
const MEILISEARCH_KEY = process.env.MEILISEARCH_MASTER_KEY || process.env.MEILISEARCH_API_KEY;
const INDEX_NAME = process.env.MEILI_INDEX || process.env.MEILISEARCH_INDEX || 'ads';

console.log('🔍 Meilisearch Configuration:');
console.log('   Host:', MEILISEARCH_HOST);
console.log('   Index:', INDEX_NAME);
console.log('   Key:', MEILISEARCH_KEY ? '✅ Set' : '❌ Missing');

async function clearMeilisearchIndex() {
  console.log('\n🔍 Clearing Meilisearch Index...\n');
  console.log('='.repeat(60));

  try {
    const client = new MeiliSearch({
      host: MEILISEARCH_HOST,
      apiKey: MEILISEARCH_KEY,
    });

    console.log('\n📡 Connecting to Meilisearch...');
    
    // Test connection first
    const health = await client.health();
    console.log('   ✅ Connected:', health.status);

    // Get or create index
    console.log(`\n📊 Checking index: ${INDEX_NAME}`);
    let index;
    try {
      index = await client.getIndex(INDEX_NAME);
      console.log('   ✅ Index found');
    } catch (err) {
      console.log('   ⚠️  Index not found, creating...');
      await client.createIndex(INDEX_NAME, { primaryKey: 'id' });
      index = await client.getIndex(INDEX_NAME);
      console.log('   ✅ Index created');
    }

    // Check current document count
    const statsBefore = await index.getStats();
    console.log(`\n📊 Current index stats:`);
    console.log(`   Index: ${INDEX_NAME}`);
    console.log(`   Documents: ${statsBefore.numberOfDocuments}`);

    if (statsBefore.numberOfDocuments === 0) {
      console.log('\n✅ Index is already empty!');
      console.log('');
      return;
    }

    // Delete all documents
    console.log(`\n🔥 Deleting all ${statsBefore.numberOfDocuments} documents...`);
    const task = await index.deleteAllDocuments();
    
    // Wait for task to complete
    console.log(`   Task UID: ${task.taskUid}`);
    console.log(`   Waiting for completion...`);
    
    await client.waitForTask(task.taskUid);

    // Verify deletion
    const statsAfter = await index.getStats();
    console.log(`\n✅ Deletion complete!`);
    console.log(`   Documents before: ${statsBefore.numberOfDocuments}`);
    console.log(`   Documents after: ${statsAfter.numberOfDocuments}`);

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Meilisearch index cleared successfully!\n');

  } catch (error) {
    console.error('\n❌ Error clearing Meilisearch index:', error.message);
    console.error('   Error details:', error);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n⚠️  Meilisearch is not running or not accessible');
      console.error('   Host:', MEILISEARCH_HOST);
    } else if (error.message.includes('not found') || error.message.includes('Route')) {
      console.error('\n⚠️  Index or route not found');
      console.error('   Host:', MEILISEARCH_HOST);
      console.error('   Index:', INDEX_NAME);
      console.error('   Key configured:', MEILISEARCH_KEY ? 'Yes' : 'No');
    }
    
    throw error;
  }
}

// Run script
if (require.main === module) {
  clearMeilisearchIndex()
    .then(() => {
      console.log('✅ Script completed successfully\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { clearMeilisearchIndex };

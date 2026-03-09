#!/usr/bin/env node

/**
 * Clear Meilisearch Cloud Index
 * Works with Meilisearch Cloud instances
 */

require('dotenv').config();
const { MeiliSearch } = require('meilisearch');

const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || 'http://127.0.0.1:7700';
const MEILISEARCH_KEY = process.env.MEILISEARCH_MASTER_KEY || process.env.MEILISEARCH_API_KEY;
const INDEX_NAME = process.env.MEILI_INDEX || process.env.MEILISEARCH_INDEX || 'ads';

async function clearMeilisearchCloud() {
  console.log('\n🔍 Clearing Meilisearch Cloud Index...\n');
  console.log('='.repeat(60));
  console.log('\n📡 Configuration:');
  console.log(`   Host: ${MEILISEARCH_HOST}`);
  console.log(`   Index: ${INDEX_NAME}`);
  console.log(`   Key: ${MEILISEARCH_KEY ? '✅ Set' : '❌ Missing'}`);

  try {
    const client = new MeiliSearch({
      host: MEILISEARCH_HOST,
      apiKey: MEILISEARCH_KEY,
    });

    console.log('\n📊 Getting index...');
    const index = client.index(INDEX_NAME);

    // Get stats
    let statsBefore;
    try {
      statsBefore = await index.getStats();
      console.log(`   ✅ Index found: ${statsBefore.numberOfDocuments} documents`);
    } catch (err) {
      console.log('   ⚠️  Could not get stats, trying direct deletion...');
      statsBefore = { numberOfDocuments: 'unknown' };
    }

    if (statsBefore.numberOfDocuments === 0) {
      console.log('\n✅ Index is already empty!');
      return;
    }

    // Delete all documents
    console.log(`\n🔥 Deleting all documents...`);
    const deleteTask = await index.deleteAllDocuments();
    
    console.log(`   Task UID: ${deleteTask.taskUid}`);
    console.log(`   Status: ${deleteTask.status}`);
    console.log(`   Waiting for completion...`);
    
    // Wait for task with timeout
    const timeout = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const taskStatus = await index.getTask(deleteTask.taskUid);
      console.log(`   Status: ${taskStatus.status}`);
      
      if (taskStatus.status === 'succeeded') {
        console.log('\n✅ Deletion succeeded!');
        break;
      } else if (taskStatus.status === 'failed') {
        console.error('\n❌ Deletion failed:', taskStatus.error);
        throw new Error('Deletion task failed');
      }
      
      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Verify deletion
    try {
      const statsAfter = await index.getStats();
      console.log(`\n📊 Final stats:`);
      console.log(`   Documents before: ${statsBefore.numberOfDocuments}`);
      console.log(`   Documents after: ${statsAfter.numberOfDocuments}`);
    } catch (err) {
      console.log('   ⚠️  Could not verify final stats');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Meilisearch index cleared successfully!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.cause) {
      console.error('   Cause:', error.cause.message);
    }
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   URL:', error.response.url);
    }
    
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check MEILISEARCH_HOST is correct');
    console.error('   2. Check MEILISEARCH_MASTER_KEY is valid');
    console.error('   3. Verify Meilisearch Cloud instance is active');
    console.error('   4. Check index name is correct');
    
    throw error;
  }
}

// Run script
if (require.main === module) {
  clearMeilisearchCloud()
    .then(() => {
      console.log('✅ Script completed successfully\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed\n');
      process.exit(1);
    });
}

module.exports = { clearMeilisearchCloud };

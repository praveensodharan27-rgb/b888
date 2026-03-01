const { autoApprovePendingAds } = require('../services/autoApproval');

/**
 * Manually trigger auto-approval of pending ads
 * Usage: node scripts/auto-approve-pending.js [minutes]
 */
async function run() {
  const args = process.argv.slice(2);
  const minutes = parseInt(args[0]) || 3;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Auto-Approving Ads Pending for ${minutes}+ Minutes`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    const result = await autoApprovePendingAds(minutes);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  Result: ${result.message}`);
    console.log(`  Approved: ${result.approved ?? 0}, Rejected: ${result.rejected ?? 0}`);
    if (result.errors > 0) {
      console.log(`  Errors: ${result.errors}`);
    }
    console.log(`${'='.repeat(60)}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

run();


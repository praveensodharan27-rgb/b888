#!/usr/bin/env node
/**
 * Seed All Database - Categories, Subcategories, Specifications, Auth Settings
 * Run: node scripts/seed-all-db.js
 * Or: npm run seed-all-db
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { execSync } = require('child_process');
const path = require('path');

function run(label, script) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 ${label}`);
  console.log('='.repeat(60));
  execSync(`node ${script}`, {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
  });
}

function main() {
  console.log('\n🚀 Seeding All Database...\n');
  try {
    run('1. Categories & Subcategories', 'scripts/seed-all-categories.js');
    run('2. Category Specifications', 'scripts/seed-all-specifications.js');
    run('3. Auth Settings', 'scripts/seed-auth-settings.js');
    console.log('\n✅ All seeding completed!\n');
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

main();

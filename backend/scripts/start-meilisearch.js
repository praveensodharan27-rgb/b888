#!/usr/bin/env node
require('dotenv').config();
/**
 * Start Meilisearch (Docker). Use: npm run meilisearch:start
 * - If container "meilisearch" exists: docker start meilisearch
 * - Else: docker run -d -p 7700:7700 --name meilisearch getmeili/meilisearch (with master key for dev)
 */
const { execSync } = require('child_process');

function run(cmd, silent = false) {
  try {
    execSync(cmd, { stdio: silent ? 'pipe' : 'inherit', shell: true });
    return true;
  } catch {
    return false;
  }
}

const masterKey = process.env.MEILI_API_KEY || process.env.MEILISEARCH_MASTER_KEY || 'masterKey';

let started = false;
try {
  const out = execSync('docker ps -a -q -f name=^meilisearch$', { encoding: 'utf8', shell: true }).trim();
  if (out) {
    run('docker start meilisearch');
    console.log('Meilisearch container started (docker start meilisearch).');
    console.log('  URL: http://localhost:7700');
    started = true;
  }
} catch (_) {}

if (!started) {
  const created = run(
    'docker run -d -p 7700:7700 -e MEILI_MASTER_KEY=' + masterKey + ' --name meilisearch getmeili/meilisearch:latest'
  );
  if (created) {
    console.log('Meilisearch container created and started on port 7700.');
    console.log('  URL: http://localhost:7700');
    console.log('  Set in .env: MEILISEARCH_HOST=http://localhost:7700 MEILISEARCH_MASTER_KEY=' + masterKey);
  } else {
    console.error('Could not start Meilisearch. Options:');
    console.error('  1. Start Docker Desktop, then run: npm run meilisearch:start');
    console.error('  2. Or run manually: docker run -d -p 7700:7700 -e MEILI_MASTER_KEY=masterKey --name meilisearch getmeili/meilisearch:latest');
    process.exit(1);
  }
}

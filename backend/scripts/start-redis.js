#!/usr/bin/env node
/**
 * Start Redis (Docker). Use: npm run redis:start
 * - If container "redis" exists: docker start redis
 * - Else: docker run -d -p 6379:6379 --name redis redis:latest
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

let started = false;
try {
  const out = execSync('docker ps -a -q -f name=^redis$', { encoding: 'utf8', shell: true }).trim();
  if (out) {
    run('docker start redis');
    console.log('Redis container started (docker start redis).');
    started = true;
  }
} catch (_) {}

if (!started) {
  const created = run('docker run -d -p 6379:6379 --name redis redis:latest');
  if (created) {
    console.log('Redis container created and started on port 6379.');
  } else {
    console.error('Could not start Redis. Options:');
    console.error('  1. Start Docker Desktop, then run: npm run redis:start');
    console.error('  2. Install Redis on Windows: choco install redis-64');
    console.error('  3. Or download: https://github.com/microsoftarchive/redis/releases');
    process.exit(1);
  }
}

/**
 * Benchmark GET /api/user/notifications
 * Run: node scripts/benchmark-notifications-api.js
 * Requires: server running, valid JWT in NOTIFICATIONS_BENCHMARK_TOKEN env or pass as arg.
 *
 * Measures: cold (no cache), cache hit (200 from Redis), 304 (If-None-Match).
 */

const http = require('http');

const BASE = process.env.BENCHMARK_API_URL || 'http://localhost:5000';
const TOKEN = process.env.NOTIFICATIONS_BENCHMARK_TOKEN || process.argv[2];

function request(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(path, BASE);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method: opts.method || 'GET',
        headers: {
          ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
          ...opts.headers,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      }
    );
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.end();
  });
}

function ms(hr) {
  const [s, ns] = hr;
  return Math.round((s * 1e3 + ns / 1e6) * 100) / 100;
}

async function run() {
  if (!TOKEN) {
    console.log('Usage: NOTIFICATIONS_BENCHMARK_TOKEN=<jwt> node scripts/benchmark-notifications-api.js');
    console.log('   or: node scripts/benchmark-notifications-api.js <jwt>');
    process.exit(1);
  }

  const path = '/api/user/notifications?page=1&limit=20';
  console.log('GET', BASE + path);
  console.log('---');

  const times = [];

  const t1 = process.hrtime();
  const r1 = await request(path);
  times.push({ name: 'Cold (no cache)', ms: ms(process.hrtime(t1)), status: r1.status });
  const etag = r1.headers.etag;
  if (!etag) console.warn('No ETag in response');

  const t2 = process.hrtime();
  const r2 = await request(path);
  times.push({ name: 'Second (cache or DB)', ms: ms(process.hrtime(t2)), status: r2.status });

  if (etag) {
    const t3 = process.hrtime();
    const r3 = await request(path, { headers: { 'If-None-Match': etag } });
    times.push({ name: '304 (If-None-Match)', ms: ms(process.hrtime(t3)), status: r3.status });
  }

  console.log('Result:');
  times.forEach(({ name, ms: t, status }) => {
    console.log(`  ${name}: ${t}ms (HTTP ${status})`);
  });
  const cold = times[0].ms;
  if (cold > 100) {
    console.log(`\nTarget: <100ms. Cold response was ${cold}ms. Check indexes and Redis.`);
  } else {
    console.log('\nCold response under 100ms.');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

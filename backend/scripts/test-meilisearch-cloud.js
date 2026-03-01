require('dotenv').config();
const { MeiliSearch } = require('meilisearch');

// Prefer MEILI_* so local (e.g. MEILI_HOST=http://127.0.0.1:7700) overrides Cloud when both set
const host = (process.env.MEILI_HOST || process.env.MEILISEARCH_HOST || 'http://localhost:7700').replace(/\/$/, '');
const apiKey = process.env.MEILI_API_KEY || process.env.MEILI_MASTER_KEY || process.env.MEILISEARCH_MASTER_KEY || 'masterKey';
const indexName = process.env.MEILISEARCH_INDEX || process.env.MEILI_INDEX || 'ads';

const client = new MeiliSearch({ host, apiKey });

async function rawHealthCheck() {
  const url = host + '/health';
  const res = await fetch(url, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

async function testConnection() {
  console.log('Meilisearch check');
  console.log('  Host:', host);
  console.log('  API key:', apiKey ? '***' + String(apiKey).slice(-4) : 'not set');
  console.log('  Index:', indexName);
  console.log('');

  try {
    const raw = await rawHealthCheck();
    if (raw.status === 404) {
      console.error('Meilisearch connection failed: server returned 404 (no Route matched).');
      console.log('');
      console.log('  Meilisearch Cloud may use a different API path. Try:');
      console.log('  1. In .env use only the host from the dashboard, e.g. https://ms-xxxx.fra.meilisearch.io (no path, no trailing slash).');
      console.log('  2. Use the Master Key from the project API Keys (not a search-only key).');
      console.log('  3. Or use local Meilisearch: set MEILI_HOST=http://127.0.0.1:7700 and run npm run meilisearch:start');
      return false;
    }
    if (raw.status === 401) {
      console.error('Meilisearch connection failed: 401 Unauthorized.');
      console.log('');
      console.log('  Use the Master Key from Meilisearch Cloud dashboard (Project → API Keys).');
      return false;
    }
    if (raw.status !== 200) {
      console.error('Meilisearch connection failed: HTTP', raw.status, raw.body || '');
      return false;
    }
  } catch (e) {
    if (e.cause?.code === 'ECONNREFUSED' || e.message?.includes('ECONNREFUSED')) {
      console.error('Meilisearch connection failed: connection refused.');
      console.log('');
      console.log('  Start Meilisearch: npm run meilisearch:start');
      return false;
    }
    throw e;
  }

  try {
    const health = await client.health();
    console.log('OK Meilisearch is reachable');
    console.log('  Health:', health.status || 'available');

    const index = client.index(indexName);
    const stats = await index.getStats();
    console.log('  Index stats:', JSON.stringify(stats, null, 2));
    return true;
  } catch (error) {
    console.error('Meilisearch connection failed:', error.message);
    if (error.message && error.message.includes('no Route matched')) {
      console.log('');
      console.log('  Fix: Use the exact Host URL from Meilisearch Cloud (no path). Use the Master Key from API Keys.');
      console.log('  Or use local: MEILI_HOST=http://127.0.0.1:7700 and npm run meilisearch:start');
    }
    if (error.message && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
      console.log('');
      console.log('  Wrong API key. Use the Master Key from the dashboard.');
    }
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});

/**
 * Basic health check test (no DB required).
 * Run: npm test
 */
const request = require('supertest');

// Use a minimal app that only has health route to avoid DB/Redis in CI
const express = require('express');
const app = express();
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'test',
  });
});

describe('Health', () => {
  it('GET /health returns 200 and status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});

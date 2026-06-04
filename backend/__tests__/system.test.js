// ============================================================
// Basic API smoke tests — CI/CD pipeline uchun
// Database ulanishini talab qilmaydigan endpointlarni tekshiradi
// ============================================================
process.env.NODE_ENV = 'test';

const request = require('supertest');
const express = require('express');

// system route DB'ga bog'liq emas — to'g'ridan-to'g'ri test qilamiz
const systemRoutes = require('../src/routes/system');

describe('System routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'CRM Backend' }));
    app.use('/api/system', systemRoutes);
  });

  test('GET /health returns healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  test('GET /api/system/health returns instance metrics', async () => {
    const res = await request(app).get('/api/system/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('instance');
    expect(res.body).toHaveProperty('cpu_count');
    expect(res.body).toHaveProperty('memory');
    expect(res.body.memory).toHaveProperty('used_mb');
  });

  test('system health reports a positive CPU count', async () => {
    const res = await request(app).get('/api/system/health');
    expect(res.body.cpu_count).toBeGreaterThan(0);
  });
});

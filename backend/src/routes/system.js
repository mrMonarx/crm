const express = require('express');
const os = require('os');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Process boshlangan vaqt va so'rov hisoblagichi (shu nusxa uchun)
const startTime = Date.now();
let requestCount = 0;

// Bu nusxaning (instance/container) noyob identifikatori.
// Docker'da har bir konteynerning hostname'i boshqacha (masalan "a3f9c2b1").
// PM2 cluster'da NODE_APP_INSTANCE turlicha bo'ladi.
const INSTANCE_ID = os.hostname();

// Har bir so'rovni sanab boramiz
router.use((req, res, next) => {
  requestCount++;
  next();
});

// GET /api/system/health — shu nusxa (instance) haqidagi jonli ma'lumot
// Bu endpoint LOAD BALANCING isboti uchun: har safar chaqirilganda
// qaysi konteyner/nusxa javob berayotgani (instance) ko'rinadi.
router.get('/health', (req, res) => {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const load = os.loadavg(); // [1min, 5min, 15min]

  res.json({
    instance: INSTANCE_ID,
    pid: process.pid,
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    request_count: requestCount,
    cpu_count: cpus.length,
    load_average: {
      '1m': +load[0].toFixed(2),
      '5m': +load[1].toFixed(2),
      '15m': +load[2].toFixed(2)
    },
    memory: {
      total_mb: Math.round(totalMem / 1024 / 1024),
      used_mb: Math.round((totalMem - freeMem) / 1024 / 1024),
      process_mb: Math.round(process.memoryUsage().rss / 1024 / 1024)
    },
    node_version: process.version,
    timestamp: new Date().toISOString()
  });
});

// GET /api/system/load-test — sun'iy CPU yuklamasi (high-load simulyatsiya)
// Frontend "Simulate High Load" tugmasi shu endpointga ko'p so'rov yuboradi.
// Har bir so'rov biroz CPU ishlatadi, shunda load balancing ta'siri ko'rinadi.
router.get('/load-test', authenticate, (req, res) => {
  const iterations = Math.min(parseInt(req.query.work) || 5_000_000, 50_000_000);

  // CPU-intensive ish (yuklamani simulyatsiya qilish)
  let result = 0;
  for (let i = 0; i < iterations; i++) {
    result += Math.sqrt(i) * Math.sin(i);
  }

  res.json({
    instance: INSTANCE_ID,
    pid: process.pid,
    iterations,
    handled_by: INSTANCE_ID,
    request_count: requestCount,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

// ============================================================
// PM2 Ecosystem — Cluster Mode (Auto-scaling + Load Balancing)
// ============================================================
// Bu konfiguratsiya backend'ni CLUSTER rejimida ishga tushiradi.
// PM2 bir nechta Node.js nusxasini (instance) ko'taradi va ular
// o'rtasida kelayotgan so'rovlarni avtomatik TAQSIMLAYDI (load balancing).
// Yuqori yuklamada barcha CPU yadrolaridan foydalaniladi.
//
// Ishga tushirish:
//   pm2 start ecosystem.config.js
//
// Nusxalar sonini qo'lda o'zgartirish (scale):
//   pm2 scale crm-backend 4
//
// Monitoring (CPU/Memory real vaqtda):
//   pm2 monit
//   pm2 list
// ============================================================

module.exports = {
  apps: [
    {
      name: 'crm-backend',
      script: 'src/server.js',
      cwd: '/opt/crm/backend',

      // --- Load Balancing / Auto-scaling ---
      // 'max' = mavjud barcha CPU yadrolari uchun bittadan nusxa.
      // PM2 ichki load balancer so'rovlarni nusxalar orasida taqsimlaydi.
      instances: 'max',
      exec_mode: 'cluster',

      // --- Avtomatik qayta ishga tushirish (high availability) ---
      autorestart: true,
      watch: false,

      // --- Resurs chegarasi: nusxa 500MB dan oshsa qayta ishga tushadi ---
      max_memory_restart: '500M',

      // --- Muhit o'zgaruvchilari ---
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },

      // --- Loglar ---
      error_file: '/opt/crm/logs/backend-error.log',
      out_file: '/opt/crm/logs/backend-out.log',
      merge_logs: true,
      time: true
    }
  ]
};

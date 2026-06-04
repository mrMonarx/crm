# NexusCRM — Load Balancing, Auto-scaling va Screenshot qo'llanmasi

> AWS EC2 (51.21.194.172) — PM2 cluster mode + Nginx load balancer
> BTEC Unit 6: Networking in the Cloud

---

## 1-QADAM: Fayllarni serverga yuklash

Loyihaning yangi fayllarini GitHub'ga push qiling (CI/CD avtomatik deploy qiladi):

```bash
git add .
git commit -m "feat: add products module + PM2 load balancing"
git push origin main
```

Yoki serverda qo'lda:

```bash
ssh ubuntu@51.21.194.172
cd /opt/crm
git pull origin main
```

---

## 2-QADAM: PM2 cluster mode (Auto-scaling + Load Balancing)

Serverda backend'ni cluster rejimida ishga tushiring:

```bash
cd /opt/crm/backend
mkdir -p /opt/crm/logs

# Eski jarayonni to'xtatish
pm2 delete crm-backend 2>/dev/null

# Cluster mode'da ishga tushirish (barcha CPU yadrolari)
pm2 start ecosystem.config.js

# Holatni ko'rish
pm2 list
```

`pm2 list` da `crm-backend` qatorida bir nechta nusxa (instance: 0,1,2...) `cluster` rejimida `online` ko'rinadi.

**Nusxalar sonini qo'lda boshqarish (auto-scaling namoyishi):**

```bash
# 4 ta nusxaga ko'paytirish (yuqori yuklama uchun)
pm2 scale crm-backend 4

# 2 ta nusxaga kamaytirish
pm2 scale crm-backend 2
```

---

## 3-QADAM: Nginx load balancer sozlash

```bash
# Yangi konfiguratsiyani ko'chirish
sudo cp /opt/crm/deploy/nginx-crm.conf /etc/nginx/sites-available/crm
sudo ln -sf /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/crm

# Sintaksisni tekshirish
sudo nginx -t

# Qayta yuklash
sudo systemctl reload nginx
```

---

## 4-QADAM: Load test (yuqori yuklama simulyatsiyasi)

Apache Bench bilan ko'p so'rov yuborib, yuklama taqsimlanishini ko'rsatasiz:

```bash
# Apache Bench o'rnatish
sudo apt install apache2-utils -y

# 5000 ta so'rov, 100 tasi bir vaqtda
ab -n 5000 -c 100 http://51.21.194.172/health
```

Test paytida BOSHQA terminalda real vaqtda monitoring oching:

```bash
pm2 monit
```

Yoki:

```bash
watch -n 1 pm2 list
```

---

## SCREENSHOT XARITASI — qaysi screenshot qayerdan

### Assignment 1 — Cloud Infrastructure (A.P1, A.M1, A.P2, A.D1)

| # | Screenshot | Qayerdan olinadi |
|---|-----------|------------------|
| SS-01 | Login sahifa, URL'da `51.21.194.172` ko'rinsin | Brauzer → `http://51.21.194.172/` |
| SS-02 | Dashboard (statistika + grafik) | Brauzer → login: `admin@crm.com` / `Admin1234!` |
| SS-03 | Backend health JSON javobi | Brauzer → `http://51.21.194.172/api/auth/me` yoki terminal `curl http://51.21.194.172/health` |
| SS-04 | `pm2 list` — backend cluster online | SSH terminal |
| SS-05 | AWS EC2 instance running, public IP ko'rinadi | AWS Console → EC2 |

### Assignment 2 — Network Design (VPC, Firewall, Proxy)

| # | Screenshot | Qayerdan olinadi |
|---|-----------|------------------|
| SS-06 | VPC va subnetlar ro'yxati | AWS Console → VPC |
| SS-07 | Security Group qoidalari (port 80, 22, 5000) — firewall isboti | AWS Console → EC2 → Security Groups |
| SS-08 | nginx-crm.conf — `upstream` va `proxy_pass` qismi | Kod muharriri / `cat /etc/nginx/sites-available/crm` |
| SS-09 | DevTools → Network → `/api/` so'rovlari + `X-Upstream` header | Brauzer F12 → Products yoki Customers sahifa |
| SS-10 | Products sahifasi (inventar jadvali + stock) | Brauzer → Products |

### Assignment 3 — Performance & Scalability (D.P7, D.P8, D.M4, D.D3)

| # | Screenshot | Qayerdan olinadi |
|---|-----------|------------------|
| SS-11 | GitHub Actions pipeline yashil ✓ | GitHub → Actions tab |
| SS-12 | `pm2 list` — 4 ta nusxa (scale qilingandan keyin) | SSH terminal: `pm2 scale crm-backend 4` |
| SS-13 | `pm2 monit` — CPU/Memory real vaqtda, test paytida | SSH terminal (load test paytida) |
| SS-14 | `ab` load test natijasi (Requests per second) | SSH terminal |
| SS-15 | Test PAYTIDA `pm2 list` — barcha nusxalar yuklamani ulushgani | SSH terminal |

---

## SCREENSHOT TARTIBI (eng yaxshi dalil ketma-ketligi)

D.M4 va D.D3 (eng yuqori ballar) uchun screenshotlarni shu tartibda oling:

1. **Avval:** `pm2 list` — 1 nusxa, `ab` test, sekin javob (before)
2. **Keyin:** `pm2 scale crm-backend 4` — 4 nusxa
3. **So'ng:** `ab` testni qayta ishga tushiring — `pm2 monit`'da yuklama 4 nusxaga taqsimlangani, javob tezligi oshgani (after)

Bu "before/after" taqqoslash D.D3 ("networking improvements against original design") uchun ideal dalil.

---

## DUCKDNS + HTTPS (ixtiyoriy, lekin "secure network" uchun kuchli)

Domen va bepul SSL qo'shsangiz, screenshotlar ancha professional ko'rinadi.
Buni keyingi bosqichda sozlashimiz mumkin.

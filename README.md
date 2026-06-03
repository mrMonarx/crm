# NexusCRM — Cloud-Based Customer Relationship Management System

> **BTEC Unit 6: Networking in the Cloud** — Full-stack CRM with Docker, CI/CD, and cloud deployment.

---

## 📁 Project Structure

```
crm-system/
├── backend/                  # Node.js + Express REST API
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js   # PostgreSQL connection & schema init
│   │   ├── middleware/
│   │   │   └── auth.js       # JWT authentication middleware
│   │   ├── routes/
│   │   │   ├── auth.js       # Login, register, profile
│   │   │   ├── customers.js  # Customer CRUD
│   │   │   ├── deals.js      # Deals + pipeline
│   │   │   ├── tasks.js      # Task management
│   │   │   ├── activities.js # Activity logging
│   │   │   └── dashboard.js  # Analytics & stats
│   │   └── server.js         # Express app entry point
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── frontend/                 # React + Vite SPA
│   ├── src/
│   │   ├── api/              # Axios HTTP client
│   │   ├── components/       # Sidebar, Header
│   │   ├── context/          # Auth global state
│   │   ├── hooks/            # Custom hooks
│   │   └── pages/            # Dashboard, Customers, Deals, Tasks, Activities
│   ├── Dockerfile
│   ├── nginx.conf            # Nginx SPA + API proxy config
│   ├── vite.config.js
│   └── package.json
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml         # GitHub Actions CI/CD pipeline
│
├── docker-compose.yml        # Full stack orchestration
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Docker & Docker Compose (optional)

### Option 1: Run with Docker (Recommended)

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/crm-system.git
cd crm-system

# 2. Create environment file
cp backend/.env.example backend/.env
# Edit backend/.env and set your DB_PASSWORD and JWT_SECRET

# 3. Build and start all services
docker compose up --build -d

# 4. Check status
docker compose ps
docker compose logs -f backend

# 5. Open in browser
# http://localhost  (frontend)
# http://localhost:5000/health  (backend health)
```

**Login credentials:**
- Email: `admin@crm.com`
- Password: `Admin1234!`

---

### Option 2: Run Manually (Without Docker)

#### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Create the database in PostgreSQL
psql -U postgres -c "CREATE DATABASE crm_db;"

# Start development server
npm run dev
# Backend running at: http://localhost:5000
```

#### Frontend
```bash
cd frontend
npm install

# Start development server
npm run dev
# Frontend running at: http://localhost:3000
```

---

## 📦 Docker Commands Reference

```bash
# Build images
docker compose build

# Start all services (detached)
docker compose up -d

# View running containers
docker compose ps

# View logs
docker compose logs -f              # all services
docker compose logs -f backend      # backend only
docker compose logs -f frontend     # frontend only
docker compose logs -f db           # database only

# Stop all services
docker compose down

# Stop and remove volumes (⚠️ deletes all data)
docker compose down -v

# Rebuild a single service
docker compose up -d --build backend

# Execute command inside container
docker compose exec backend sh
docker compose exec db psql -U postgres crm_db

# Check health
docker inspect crm_backend | grep Health
```

---

## 🔧 GitHub Setup & CI/CD

### Step 1: Create GitHub Repository

```bash
# Initialize git (inside crm-system folder)
git init
git add .
git commit -m "feat: initial CRM system commit"

# Create repo on GitHub (via web or CLI)
gh repo create crm-system --public

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/crm-system.git
git branch -M main
git push -u origin main
```

### Step 2: Configure GitHub Secrets

Go to: **GitHub repo → Settings → Secrets and Variables → Actions → New repository secret**

| Secret Name      | Value                                      |
|------------------|--------------------------------------------|
| `DB_PASSWORD`    | Your production database password          |
| `JWT_SECRET`     | Random secret string (min 32 chars)        |
| `DEPLOY_HOST`    | Your cloud server IP (e.g. 45.76.123.45)  |
| `DEPLOY_USER`    | SSH username (e.g. `ubuntu`)               |
| `DEPLOY_SSH_KEY` | Contents of your `~/.ssh/id_rsa` file     |

### Step 3: Generate SSH Key for Deployment

```bash
# Generate SSH key pair (on your local machine)
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ~/.ssh/deploy_key

# Copy PUBLIC key to your cloud server
ssh-copy-id -i ~/.ssh/deploy_key.pub ubuntu@YOUR_SERVER_IP

# Copy PRIVATE key content to GitHub secret
cat ~/.ssh/deploy_key
# Paste this entire output into DEPLOY_SSH_KEY secret
```

### Step 4: Set Up Cloud Server

```bash
# SSH into your cloud server
ssh ubuntu@YOUR_SERVER_IP

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Create project directory
sudo mkdir -p /opt/crm-system
sudo chown $USER:$USER /opt/crm-system
cd /opt/crm-system

# Create .env file on server
cat > .env << EOF
DB_PASSWORD=your_secure_production_password
JWT_SECRET=your_super_secret_jwt_key_min_32_chars_long
EOF
```

### Step 5: Trigger CI/CD Pipeline

```bash
# Make any change and push to main
git add .
git commit -m "feat: trigger deployment"
git push origin main

# Watch the pipeline in:
# GitHub → Actions tab → CI/CD Pipeline
```

---

## 🔄 CI/CD Pipeline Explained

The `.github/workflows/ci-cd.yml` pipeline runs automatically on every push to `main`:

```
push to main
     │
     ▼
┌─────────────────┐    ┌─────────────────┐
│  test-backend   │    │  build-frontend │
│  (Jest + PG)    │    │  (Vite build)   │
└────────┬────────┘    └────────┬────────┘
         │                      │
         └──────────┬───────────┘
                    ▼
         ┌─────────────────────┐
         │  docker-build-push  │
         │  (GHCR images)      │
         └──────────┬──────────┘
                    ▼
         ┌─────────────────────┐
         │      deploy         │
         │  (SSH to server)    │
         └─────────────────────┘
```

**Jobs:**
1. **test-backend** — Runs Jest tests with a real PostgreSQL database
2. **build-frontend** — Builds React app with Vite, uploads dist artifact
3. **docker-build-push** — Builds & pushes Docker images to GitHub Container Registry (GHCR)
4. **deploy** — SSH into cloud server, pulls new images, restarts containers

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint             | Description           |
|--------|----------------------|-----------------------|
| POST   | `/api/auth/login`    | Login (returns JWT)   |
| POST   | `/api/auth/register` | Register new user     |
| GET    | `/api/auth/me`       | Get current user      |
| PUT    | `/api/auth/profile`  | Update profile        |

### Customers
| Method | Endpoint              | Description           |
|--------|-----------------------|-----------------------|
| GET    | `/api/customers`      | List (with filters)   |
| GET    | `/api/customers/:id`  | Customer detail       |
| POST   | `/api/customers`      | Create customer       |
| PUT    | `/api/customers/:id`  | Update customer       |
| DELETE | `/api/customers/:id`  | Delete customer       |

### Products (Inventory / WMS)
| Method | Endpoint                  | Description                  |
|--------|---------------------------|------------------------------|
| GET    | `/api/products`           | List (filters: category, status, search, low_stock) |
| GET    | `/api/products/stats`     | Inventory summary & value    |
| GET    | `/api/products/:id`       | Product detail               |
| POST   | `/api/products`           | Create product               |
| PUT    | `/api/products/:id`       | Update product               |
| PATCH  | `/api/products/:id/stock` | Adjust stock (+/- quantity)  |
| DELETE | `/api/products/:id`       | Delete product               |

### Deals
| Method | Endpoint              | Description           |
|--------|-----------------------|-----------------------|
| GET    | `/api/deals`          | List deals            |
| GET    | `/api/deals/pipeline` | Kanban pipeline data  |
| POST   | `/api/deals`          | Create deal           |
| PUT    | `/api/deals/:id`      | Update deal/stage     |
| DELETE | `/api/deals/:id`      | Delete deal           |

### Tasks
| Method | Endpoint              | Description           |
|--------|-----------------------|-----------------------|
| GET    | `/api/tasks`          | List tasks            |
| POST   | `/api/tasks`          | Create task           |
| PUT    | `/api/tasks/:id`      | Update/complete task  |
| DELETE | `/api/tasks/:id`      | Delete task           |

### Dashboard
| Method | Endpoint                    | Description           |
|--------|-----------------------------|-----------------------|
| GET    | `/api/dashboard/stats`      | All analytics stats   |
| GET    | `/api/dashboard/activities` | Recent activities     |
| GET    | `/api/dashboard/top-deals`  | Top deals by value    |

---

## 📸 Screenshots Guide (for BTEC Assignment)

### Assignment 1 (Task 1 — Cloud Infrastructure)

| Screenshot | What to Show | Where |
|-----------|--------------|-------|
| **SS-01** | `docker compose up --build` terminal output showing all 3 containers starting | Terminal |
| **SS-02** | `docker compose ps` showing all services as "healthy" | Terminal |
| **SS-03** | Backend health check: `http://localhost:5000/health` in browser | Browser |
| **SS-04** | CRM Login page at `http://localhost` | Browser |
| **SS-05** | Dashboard with stats cards and chart | Browser |

### Assignment 2 (Task 2 — Network Design: VPC, Subnet, VPN, Load Balancer)

| Screenshot | What to Show | Where |
|-----------|--------------|-------|
| **SS-06** | `docker network inspect crm_network` showing container network topology | Terminal |
| **SS-07** | Nginx config file (`nginx.conf`) showing API proxy routing | Code editor |
| **SS-08** | Browser DevTools → Network tab: API requests going to `/api/` | DevTools |
| **SS-09** | `docker compose logs backend` showing incoming requests | Terminal |
| **SS-10** | Customers page with data | Browser |

### Assignment 3 (Task 3 — Performance & Scalability)

| Screenshot | What to Show | Where |
|-----------|--------------|-------|
| **SS-11** | GitHub Actions CI/CD pipeline running (green ticks) | GitHub → Actions |
| **SS-12** | Docker images in GHCR (GitHub → Packages) | GitHub |
| **SS-13** | Deals Pipeline Kanban board | Browser |
| **SS-14** | Tasks page with priority/status filters | Browser |
| **SS-15** | Activity Feed page | Browser |
| **SS-16** | `docker stats` showing CPU/Memory usage of containers | Terminal |
| **SS-17** | `docker compose logs -f` showing real-time logs | Terminal |

---

## 🏗️ Cloud Deployment Architecture

```
Internet
    │
    ▼
[Load Balancer / DNS]
    │
    ▼
[EC2 / Cloud VM]
    │
    ├── [Nginx Frontend :80]  ←── React SPA
    │       │
    │       └── /api/* ──────────→ [Express Backend :5000]
    │                                       │
    │                                       ▼
    │                              [PostgreSQL :5432]
    │
    └── All inside: crm_network (Docker bridge network)
```

### Cloud Provider Options

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| **AWS EC2** | t2.micro (12 months) | Best for enterprise |
| **DigitalOcean** | $4/month droplet | Simplest for beginners |
| **Railway** | Generous free tier | Best for quick deploy |
| **Render** | Free tier available | Auto-deploys from GitHub |

---

## 🛡️ Security Features

- **JWT Authentication** — Stateless token-based auth (24h expiry)
- **bcrypt Password Hashing** — Cost factor 12
- **Helmet.js** — HTTP security headers
- **Rate Limiting** — 100 requests per 15 minutes per IP
- **CORS Policy** — Restricted to frontend origin only
- **Input Validation** — express-validator on all routes
- **Non-root Docker User** — Backend runs as `appuser`
- **Environment Variables** — No secrets in code

---

## 🧪 Testing the API

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@crm.com","password":"Admin1234!"}'

# Get customers (replace TOKEN with JWT from login)
curl http://localhost:5000/api/customers \
  -H "Authorization: Bearer TOKEN"

# Create customer
curl -X POST http://localhost:5000/api/customers \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","company":"Test Co","status":"lead"}'

# Dashboard stats
curl http://localhost:5000/api/dashboard/stats \
  -H "Authorization: Bearer TOKEN"
```

---

## 📖 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router, TanStack Query, Recharts |
| Backend | Node.js, Express.js, bcryptjs, jsonwebtoken |
| Database | PostgreSQL 16 |
| Containerization | Docker, Docker Compose |
| Web Server | Nginx (Alpine) |
| CI/CD | GitHub Actions |
| Registry | GitHub Container Registry (GHCR) |

---

*Built for BTEC HND Unit 6: Networking in the Cloud*

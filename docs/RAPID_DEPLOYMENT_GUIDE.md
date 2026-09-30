# FIN-11 LedgerSense | Rapid Deployment Guide (Railway, Render, Vercel & AWS)

> **Deadline Target**: Deploy your complete, live, working prototype in **under 3 minutes** before the 9:30 PM evaluation, while highlighting enterprise **AWS Cloud Architecture** in your pitch deck.

---

## 1. Quick Comparison: Railway vs. Render vs. Vercel vs. AWS

| Platform | Deployment Speed | Best For | Redis Included? | Setup Complexity | Config File |
|---|---|---|---|---|---|
| **Railway** | **~2 minutes** | Backend API + Redis + Frontend (All-in-One) | Yes (1-click database plugin) | Ultra Low (1-Click GitHub import) | `railway.json`, `Procfile` |
| **Render** | **~3 minutes** | Backend API + Redis (IaC Blueprint) | Yes (1-click via `render.yaml`) | Very Low (`render.yaml` Blueprint) | `render.yaml` |
| **Vercel** | **~1 minute** | Standalone Frontend UI | External via Upstash or Railway | Ultra Low (Git connect) | `vercel.json` |
| **AWS Cloud** | **~20–30 mins** | Enterprise Production Pitch Target | Amazon ElastiCache / DynamoDB | High (VPC, ECS, RDS, ALB, IAM) | `Dockerfile`, CloudFormation/CDK |

---

## 2. Option A: Railway (Fastest Turn-Key Deployment — 2 Minutes)

Railway provides the fastest path to a live public HTTPS URL with Redis and Node.js working out of the box.

### Step 1: Deploy Backend & Frontend in 1 Click
1. Log in to [Railway.app](https://railway.app) (GitHub OAuth).
2. Click **"New Project"** ➔ **"Deploy from GitHub repo"**.
3. Select `Sathvik1533/Finathon-hackathon`.
4. Railway detects `railway.json` and builds the Node.js API and serves the dashboard UI immediately.

### Step 2: Add 1-Click Redis
1. In the Railway dashboard canvas, click **"+ New"** ➔ **"Database"** ➔ **"Add Redis"**.
2. Railway instantly spins up Redis and exposes `REDIS_URL`.
3. In your API service settings ➔ **Variables**, ensure:
   - `PORT`: `4000`
   - `JWT_SECRET`: `finathon-secret-jwt-key-2026`
   - `DATABASE_URL`: Your Supabase connection string (or leave empty to run in-memory)
   - `REDIS_URL`: `${{Redis.REDIS_URL}}` (or select from Railway auto-complete)

### Step 3: Generate Live HTTPS Domain
1. In the API service ➔ **Settings** ➔ **Networking** ➔ Click **"Generate Domain"**.
2. Your live URL is ready: `https://finathon-production.up.railway.app`
3. Visiting the root URL immediately displays the **FIN-11 LedgerSense Executive Terminal**, with real-time API syncing, Redis caching, and Nova streams.

---

## 3. Option B: Render Blueprint Deployment (3 Minutes)

Render offers infrastructure-as-code deployment through the included `render.yaml`.

### Step 1: Connect Blueprint
1. Open [dashboard.render.com](https://dashboard.render.com).
2. Click **"New +"** ➔ **"Blueprint"**.
3. Connect your GitHub repository: `Sathvik1533/Finathon-hackathon`.
4. Render automatically reads `render.yaml` and displays two managed services:
   - `finathon-api` (Web Service, Node.js runtime)
   - `finathon-redis` (Managed Redis instance)

### Step 2: Apply and Launch
1. Click **"Apply"**.
2. Render provisions the Redis cache, injects the internal connection string into `finathon-api`, installs dependencies, and runs `npm run build && npm start`.
3. Your live API and frontend URL will be active at:
   `https://finathon-api.onrender.com`

---

## 4. Option C: Vercel (Instant Dedicated Frontend — 1 Minute)

If you wish to host the static UI on Vercel's global edge network while keeping the API on Railway or Render:

### Step 1: Import Project
1. Open [Vercel.com](https://vercel.com/new).
2. Import `Sathvik1533/Finathon-hackathon`.
3. `vercel.json` is automatically detected at the project root.
4. Framework Preset: **Other** (Root directory: `./` or `web`).

### Step 2: Connect Backend API
1. If your backend is deployed on Railway (`https://your-api.up.railway.app`):
   - Access your Vercel URL with the parameter: `https://your-vercel.vercel.app?api=https://your-api.up.railway.app`
   - The app automatically stores the backend URL in `localStorage` and connects seamlessly.
2. Alternatively, Vercel will proxy `/api/*` requests directly if configured in `vercel.json`.

---

## 5. Option D: Enterprise Production Target (AWS Cloud Architecture)

During the hackathon evaluation at 9:30 PM, present this slide to demonstrate why your team chose Railway/Render for the 3-minute live prototype while engineering the system for enterprise AWS:

```
[ Clients / Web Dashboard ]
           │
           ▼
[ AWS CloudFront CDN + S3 ] (Edge Static Content)
           │
           ▼
[ Application Load Balancer (ALB) ] (SSL Termination, us-east-1)
           │
    ┌──────┴──────────────────────────┐
    ▼                                 ▼
[ ECS Fargate Task 1 ]        [ ECS Fargate Task 2 ]
(Node.js / Express Container) (Node.js / Express Container)
    │                                 │
    ├───────────────┬─────────────────┤
    ▼               ▼                 ▼
[ Amazon RDS ] [ Amazon ElastiCache ] [ Amazon Bedrock ]
PostgreSQL Multi-AZ     Redis Cluster       Claude / Nova AI
(ACID Balance Data)    (Job Locks & Cache) (Guarded Case Explanations)
```

### AWS Enterprise Mapping:
- **Compute**: AWS ECS Fargate with container tasks auto-scaling based on CPU/Memory load.
- **Cache & Concurrency**: Amazon ElastiCache (Redis) providing distributed mutex locks (`reconciliation:run`) to prevent double-processing.
- **Database**: Amazon RDS PostgreSQL with Multi-AZ replication, `NUMERIC(18,4)` precision, and Row-Level Security.
- **AI Explanations**: Amazon Bedrock with strict human-in-the-loop guardrails (AI explains; humans approve).
- **Audit Compliance**: AWS CloudTrail and S3 Object Lock for WORM (Write Once, Read Many) compliance.

---

## 6. Environment Variables Reference

| Variable | Required? | Example Value | Description |
|---|---|---|---|
| `PORT` | Optional | `4000` (or `10000` on Render) | HTTP server port |
| `NODE_ENV` | Optional | `production` | Node environment |
| `JWT_SECRET` | Recommended | `finathon-secret-jwt-key-2026` | Secret key for JWT session tokens |
| `DATABASE_URL` | Optional | `postgresql://user:pass@host:5432/db` | Supabase or PostgreSQL connection string |
| `REDIS_URL` | Optional | `redis://default:pass@host:6379` | Redis connection URL (graceful in-memory fallback if absent) |
| `NOVA_API_KEY` | Optional | `nova_sk_live_demo` | Nova partner API key |
| `DEMO_MERCHANT_ID` | Optional | `m_demo_finathon` | Demo merchant identifier |

---

## 7. Pre-Evaluation 60-Second Sanity Check

Run these quick curl checks to verify your live deployment before the evaluator arrives:

```bash
# 1. Health & Redis Status Check
curl -s https://<YOUR-LIVE-DOMAIN>/api/health | jq .

# Expected Response:
# {
#   "status": "healthy",
#   "service": "finathon-api",
#   "stack": "Node.js + Express + TypeScript + PostgreSQL + Redis",
#   "redis": { "mode": "redis" (or "memory"), "connected": true (or false) }
# }

# 2. Redis Diagnostics Check
curl -s https://<YOUR-LIVE-DOMAIN>/api/redis/status | jq .

# 3. Test Login
curl -s -X POST https://<YOUR-LIVE-DOMAIN>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq .
```

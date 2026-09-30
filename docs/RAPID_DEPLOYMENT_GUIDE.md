# FIN-11 LedgerSense | Rapid Deployment Guide (Railway, Render & Vercel)

> **Deployment Target**: Deploy your complete, live, working prototype in **under 3 minutes** for evaluation across **Vercel** (Frontend) and **Railway / Render** (Backend & Redis).

---

## 1. Quick Comparison: Railway vs. Render vs. Vercel

| Platform | Deployment Speed | Best For | Redis Included? | Setup Complexity | Config File |
|---|---|---|---|---|---|
| **Railway** | **~2 minutes** | Backend API + Redis + Frontend (All-in-One) | Yes (1-click database plugin) | Ultra Low (1-Click GitHub import) | `railway.json`, `Procfile` |
| **Render** | **~3 minutes** | Backend API + Redis (IaC Blueprint) | Yes (1-click via `render.yaml`) | Very Low (`render.yaml` Blueprint) | `render.yaml` |
| **Vercel** | **~1 minute** | Standalone Frontend UI Cockpit | External via Railway or Upstash | Ultra Low (Git connect) | `vercel.json` |

---

## 2. Option A: Railway (Fastest Turn-Key Deployment — 2 Minutes)

Railway provides the fastest path to a live public HTTPS URL with Redis and Node.js working out of the box.

### Step 1: Deploy the API service
1. Log in to [Railway.app](https://railway.app) (GitHub OAuth).
2. Click **"New Project"** ➔ **"Deploy from GitHub repo"**.
3. Select `Sathvik1533/Finathon-hackathon`.
4. The current root `railway.json` builds and starts the Express API from `api/` only. It does not build or serve the Vite frontend.

### Step 2: Add 1-Click Redis
1. In the Railway dashboard canvas, click **"+ New"** ➔ **"Database"** ➔ **"Add Redis"**.
2. Railway instantly spins up Redis and exposes `REDIS_URL`.
3. In your API service settings ➔ **Variables**, ensure:
   - `PORT`: `4000`
   - `JWT_SECRET`: Generate a unique high-entropy secret and set it in Railway Variables; never commit its value.
   - `DATABASE_URL`: Required for production. Set the rotated PostgreSQL URL in Railway Variables; do not leave it empty or commit it.
   - `REDIS_URL`: `${{Redis.REDIS_URL}}` (or select from Railway auto-complete)

### Step 3: Generate Live HTTPS Domain
1. In the API service ➔ **Settings** ➔ **Networking** ➔ Click **"Generate Domain"**.
2. Use the generated domain as the API origin, then verify the documented API health route.
3. A healthy API response does not prove that Nova authentication, database persistence, or the frontend is working; verify each independently before calling the deployment live.

### Optional: Host the frontend on Railway too
The repository currently has separate Vercel frontend configuration and a root Railway API configuration. To serve the UI on Railway as well, configure a second Railway frontend service (keep the existing Vercel deployment):
1. Build from `frontend/` with the locked dependencies and `npm run build`.
2. Serve the generated `frontend/dist/` files on `0.0.0.0:$PORT`, with an SPA fallback to `index.html` for every client route.
3. Set `VITE_API_BASE` to the Railway API origin at build time, and configure API CORS or a same-origin proxy deliberately.
4. Verify direct navigation and refresh on `/dashboard`, `/timeline`, `/exceptions`, `/settlement`, and `/reports`; each must return the app shell, not a host 404.

---

## 3. Option B: Render Blueprint Deployment (3 Minutes)

Render offers infrastructure-as-code deployment through the included `render.yaml`.

### Step 1: Connect Blueprint
1. Open [dashboard.render.com](https://dashboard.render.com).
2. Click **"New +"** ➔ **"Blueprint"**.
3. Connect your GitHub repository: `Sathvik1533/Finathon-hackathon`.
4. Render automatically reads `render.yaml` and provisions:
   - `finathon-api` (Web Service, Node.js runtime, 100% Free Plan)
5. Under Environment Variables:
   - `REDIS_URL`: Leave empty for instant 100% free deployment with built-in graceful in-memory cache/locks, or paste an Upstash / Railway Redis connection URL.
   - (Optional for paid Render plans): Uncomment `finathon-redis` in `render.yaml` to spin up a managed Redis instance ($7/mo starter plan).

### Step 2: Apply and Launch
1. Click **"Apply"**.
2. Render installs dependencies, compiles TypeScript, and runs `npm start`.
3. Your live API and frontend URL will be active immediately at:
   `https://finathon-api.onrender.com`

---

## 4. Option C: Vercel (LIVE PRODUCTION URL)

The frontend cockpit is **currently deployed and live** on Vercel's global edge network:

🌐 **Live Vercel Production URL**: **`https://finathon-ledgersense-web.vercel.app`**  
*(Deployment Alias: `https://finathon-ledgersense-9za50blwk-24r21a05hr-8498s-projects.vercel.app`)*

### Live Connectivity Modes:
1. **With Local Backend Running**:
   - Simply open: `https://finathon-ledgersense-web.vercel.app?api=http://localhost:4000`
   - The edge-hosted Vercel UI will talk directly to your local Node.js engine on port 4000!
2. **With Railway Production Backend**:
   - Once deployed to Railway, open: `https://finathon-ledgersense-web.vercel.app?api=https://your-api.up.railway.app`
   - The UI automatically remembers the URL in `localStorage` across page refreshes.

### How it was deployed:
`vercel --prod --yes` inside `web/` using `web/vercel.json`.

### Step 2: Connect Backend API
1. If your backend is deployed on Railway (`https://your-api.up.railway.app`):
   - Access your Vercel URL with the parameter: `https://your-vercel.vercel.app?api=https://your-api.up.railway.app`
   - The app automatically stores the backend URL in `localStorage` and connects seamlessly.
2. Alternatively, Vercel will proxy `/api/*` requests directly if configured in `vercel.json`.

---

## 5. Option D: Production Stack Summary (Vercel + Railway + Supabase + Redis)

During the hackathon evaluation, present our production stack topology:

```
[ Clients / Web Cockpit on Vercel ]
           │
           │ HTTPS / REST (JWT Auth)
           ▼
[ Railway / Render API Container ]
(Node.js + Express + TypeScript on Port 4000)
           │
           ├──────────────────────────────┬──────────────────────────────┐
           ▼                              ▼                              ▼
[ Supabase PostgreSQL ]          [ Managed Redis ]             [ Data Streams Tier ]
- NUMERIC(18,4) & Integer Paise  - Distributed Job Mutex       - Aczen Nova Financial API
- Row-Level Security (RLS)       - Run Summary Cache           - J.P. Morgan Synthetic Engine
- Append-Only Audit Trigger      - Graceful In-Memory Fallback
```

### Production Tier Mapping:
- **Client Tier**: Vercel edge CDN delivering `web/index.html` with instant load time and zero cold starts.
- **Compute Tier**: Node.js + Express + TypeScript API on Railway / Render running the 7-stage engine in under 120ms.
- **Cache & Mutex**: Redis distributed lock preventing duplicate simultaneous reconciliation runs.
- **Database**: Supabase PostgreSQL with `NUMERIC(18,4)` precision, Row-Level Security, and immutable audit triggers.
- **Data Ingestion**: Real-world Aczen Nova Financial API streams + J.P. Morgan synthetic stress-testing engine.

---

## 6. Environment Variables Reference

| Variable | Required? | Example Value | Description |
|---|---|---|---|
| `PORT` | Optional | `4000` (or `10000` on Render) | HTTP server port |
| `NODE_ENV` | Optional | `production` | Node environment |
 | `JWT_SECRET` | Required | Generate a unique high-entropy value in the provider | Secret key for JWT session tokens |
 | `DATABASE_URL` | Required | Set the rotated provider URL in Railway Variables; never commit it | Supabase or PostgreSQL connection string |
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

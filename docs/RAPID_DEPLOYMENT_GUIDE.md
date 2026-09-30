# FIN-11 LedgerSense | Rapid Deployment Guide (Vercel + Railway + AWS)

> **Goal**: Deploy your complete, live, working prototype in **3 minutes** before the 9:30 PM evaluation, while highlighting enterprise **AWS Cloud Architecture** in your pitch deck.

---

## 1. Quick Comparison: Where to Deploy What

| Component | Fast Hackathon Target (3 Min) | Production Enterprise Target (AWS) | Config File |
|---|---|---|---|
| **Frontend UI** | **Vercel** (Instant Next.js/React hosting) | **AWS S3 + CloudFront** or **AWS ECS Fargate** | `vercel.json` |
| **Backend API** | **Railway** (Node.js + Express + TypeScript) | **AWS ECS Fargate** behind **Application Load Balancer** | `railway.json`, `Procfile` |
| **Redis Cache** | **Railway Redis** (1-click plugin) | **Amazon ElastiCache Redis** / DynamoDB locks | Managed via `REDIS_URL` |
| **Database** | **Supabase PostgreSQL** | **Amazon RDS PostgreSQL** (Multi-AZ) | `supabase/migrations/` |

---

## 2. Option A: 2-Minute Deployment (Railway + Vercel)

### Step 1: Deploy Backend & Redis on Railway (2 Minutes)
1. Go to [Railway.app](https://railway.app) and click **"New Project"**.
2. Select **"Deploy from GitHub repo"** and choose:
   `Sathvik1533/Finathon-hackathon`
3. Railway automatically detects `railway.json` and builds the Node.js Express API from the `/api` directory.
4. Add Redis in 1 click: Click **"+ New"** ➔ **"Database"** ➔ **"Add Redis"**.
   - Railway automatically sets the `REDIS_URL` environment variable!
5. In the backend service **Variables**, add:
   - `DATABASE_URL`: Your Supabase connection string (`postgresql://postgres:Sathvik1533v@...:5432/postgres`)
   - `JWT_SECRET`: `finathon-secret-jwt-key-2026`
   - `PORT`: `4000`
6. Click **"Generate Domain"** under Settings ➔ You now have a live HTTPS API URL (e.g. `https://api-finathon.up.railway.app`)!

### Step 2: Deploy Frontend on Vercel (1 Minute)
1. Go to [Vercel.com](https://vercel.com) and click **"Add New... Project"**.
2. Import `Sathvik1533/Finathon-hackathon`.
3. In **Build & Output Settings**:
   - Framework Preset: **Other**
   - Root Directory: `web`
4. Click **Deploy**!
5. Within 45 seconds, you receive a production URL (e.g. `https://finathon-ledgersense.vercel.app`).

---

## 3. Option B: AWS Enterprise Production Deployment

In your pitch presentation, explain that while Vercel/Railway were used for instantaneous hackathon demonstration, your production architecture is built for **AWS Cloud**:

- **Networking**: VPC across multi-AZ public subnets (`us-east-1a`, `us-east-1b`) with an **Application Load Balancer (ALB)** handling HTTPS traffic.
- **Compute**: **AWS ECS Fargate** running containerized Node.js API tasks with auto-scaling.
- **Data & AI Tier**:
  - **Amazon RDS for PostgreSQL**: Multi-AZ arbitrary-precision `NUMERIC(18,4)` storage with Row Level Security.
  - **Amazon DynamoDB**: Distributed idempotency locks and fast run status cache.
  - **Amazon S3**: Tamper-proof, encrypted storage for exported reconciliation CSV audits.
  - **Amazon Bedrock**: Governed AI case explanations with G1–G5 guardrails (AI never makes financial approval decisions).
  - **Amazon CloudWatch**: End-to-end audit metric alarms and error monitoring.

---

## 4. Environment Variables Checklist

```env
# Database (PostgreSQL / Supabase)
DATABASE_URL=postgresql://postgres:Sathvik1533v@db.lhxxsnxoirjbswdqzpyt.supabase.co:5432/postgres

# Authentication
JWT_SECRET=finathon-secret-jwt-key-2026

# Aczen Nova API Ingestion
NOVA_API_KEY=nova_sk_REPLACE_ME
NOVA_BASE_URL=https://api.novapayments.example/v1

# Redis Cache (Optional, automatically falls back to in-memory)
REDIS_URL=redis://localhost:6379
```

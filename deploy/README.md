# 🚀 FIN-11 LedgerSense | Dual-Deployment Launch Guide

This directory contains the ready-to-launch **1-Click Deployment Configurations** for FIN-11 LedgerSense across both the **Fast Evaluation Target** and the **Enterprise Production AWS Cloud**.

---

## ⚡ 1. Fast Evaluation Target (Vercel + Railway + Supabase)

Designed for instant live demonstration in under 3 minutes.

| Service | Host | 1-Click Config File | Description |
|---|---|---|---|
| **Frontend Web Terminal** | **Vercel** | `frontend/`, root `vercel.json`, `scripts/sync-web-build.mjs` | Vite/React UI; root build synchronizes its output into `web/` for static serving |
| **Backend API Engine** | **Railway** | `railway.json`, `nixpacks.toml`, `Procfile` | Node.js Express TypeScript API with 7-stage engine |
| **Distributed Cache & Lock** | **Railway** | Managed via `REDIS_URL` | Fast in-memory / Redis cache for runs and mutex locks |
| **Database** | **Supabase** | `supabase/migrations/` | PostgreSQL with Row-Level Security & arbitrary precision |

### 1-Click Launch Steps:
1. **Backend & Redis on Railway**:
   - Go to [Railway Dashboard](https://railway.app/new).
   - Select **Deploy from GitHub repo** ➔ `Sathvik1533/Finathon-hackathon`.
   - Add Redis with 1 click: **+ New** ➔ **Database** ➔ **Add Redis** (sets `REDIS_URL`).
   - Add Environment Variables:
     - `DATABASE_URL`: set the rotated provider connection string in Railway Variables; do not commit it.
     - `JWT_SECRET`: set a newly generated high-entropy secret in Railway Variables; do not commit it.
     - `PORT`: `4000`
   - Under Settings, click **Generate Domain** (e.g. `https://finathon-production.up.railway.app`).

2. **Frontend on Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/new).
   - Import `Sathvik1533/Finathon-hackathon`.
   - Set **Root Directory** to the repository root (`.`), not `web`. The `web/` folder is generated static output; selecting it skips the root build and serves a stale bundle.
   - Let the repository `npm run build` script build the API and frontend, then synchronize the Vite bundle to `web/`.
   - Set `VITE_API_BASE` in the Vercel project environment to the **verified Railway API origin**. Do not use a placeholder or put the Nova key in a `VITE_*` variable.
   - First deploy a preview and verify `/`, `/login`, direct workspace routes, `VITE_API_BASE`, and the API's source mode. Production deploy only after review.

---

## ☁️ 2. Enterprise AWS Production Cloud Topology

Enterprise-grade architecture provisioned via AWS CloudFormation.

```
                   Internet / Users
                          │
                     [Route 53]
                          │
             [Application Load Balancer] (HTTPS:443 / HTTP:80)
                          │
         ┌────────────────┴────────────────┐
         │                                 │
         ▼                                 ▼
   [AWS ECS Fargate]                 [AWS ECS Fargate]
  (api-service task 1)              (api-service task 2)
  Auto-scaling (2-10 tasks)         Auto-scaling (2-10 tasks)
         │                                 │
         ├─────────────────────────────────┤
         │                │                │
         ▼                ▼                ▼
   [Amazon S3]     [Amazon DynamoDB]  [Amazon Bedrock]
  (Artifacts,      (Distributed Run   (Claude / Nova
  CSV Audits)      Locks & Cache)     Governed AI)
                          │
                          ▼
             [Amazon RDS / Supabase PG]
             (Arbitrary Precision NUMERIC)
```

### Components Provisioned by `infra/aws/cloudformation.yaml`:
- **VPC & Multi-AZ Subnets**: Isolated networking across `us-east-1a` and `us-east-1b`.
- **Application Load Balancer (ALB)**: Public ingress with health check target group on `/api/health`.
- **AWS ECS Fargate Cluster & Service**: Containerized Node.js API with zero-downtime rolling deploys.
- **Amazon S3**: Encrypted (`SSE-S3`) bucket for CSV batches, MT940 statements, and audit proofs with CORS for presigned uploads.
- **Amazon DynamoDB**: Low-latency distributed mutex table (`finathon-ledgersense-locks`) with TTL and PITR.
- **Amazon Bedrock IAM Role**: Least-privilege permissions for `bedrock:InvokeModel` with G1–G5 governance.
- **Amazon CloudWatch**: Centralized JSON log group `/ecs/finathon-ledgersense` with 30-day retention.

### 1-Click Launch via AWS Console:
Click to launch the CloudFormation stack directly in your AWS console:
👉 **[Launch CloudFormation Stack in us-east-1](https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/quickcreate?stackName=Finathon-LedgerSense-Prod)**

### 1-Click Launch via AWS CLI:
```bash
./infra/scripts/deploy-aws.sh finathon-ledgersense-prod us-east-1
```

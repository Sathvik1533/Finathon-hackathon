# FIN-11 LedgerSense | Production Cloud Architecture & Pitch Guide

## 1. System Topology & AWS Cloud Infrastructure

```
                   Internet / Users
                          │
                          ▼
                 AWS Route 53 / CloudFront
                          │
                          ▼
            Application Load Balancer (ALB)
            ┌─────────────┴─────────────┐
            ▼                           ▼
      Next.js Web App            Caddy Reverse Proxy
      (AWS ECS Fargate /         (EC2 / ECS Fargate)
       Amplify Hosting)                 │
                                        ▼
                               FastAPI Application
                              (Backend Engine Core)
                                  │   │   │   │
           ┌──────────────────────┘   │   │   └──────────────────────┐
           ▼                          ▼   ▼                          ▼
    AWS RDS PostgreSQL            Redis / SQS                   Aczen Nova API
  (or Supabase Managed PG)      (Queue & Worker)               (Real Banking Data)
```

### Component Breakdown
1. **Frontend Tier (`/web`):**
   - Framework: Next.js 14+ with React and Tailwind CSS.
   - Purpose: Reviewer dashboard, exception queue, 4-source timeline viewer, case decision modal, admin configuration editor, and Synthetic Lab comparator.
2. **Backend API Tier (`src/`):**
   - Framework: FastAPI (Python 3.11/3.12).
   - Multi-tenant data repository with zero floating point representation (integer paise).
   - High-throughput Server-Sent Events (SSE) for streaming reconciliation run progress in real time.
3. **Database Tier (`db/` / Supabase):**
   - PostgreSQL 15+ with extensions `pgcrypto` and `vector` (pgvector).
   - Strict statement-level triggers preventing mutation or deletion of `audit_log`.
   - Analytical views `v_run_exception_summary` and `v_run_benchmark` for sub-millisecond dashboard metrics.
4. **Queue & Caching (Redis / AWS SQS):**
   - High-volume batch ingestion offloading and distributed lock coordination for multi-worker environments.
5. **Real-World Nova Ingestion Service:**
   - Ingests real-world gateway captures, settlement credits, and GST tax breakdowns directly from `https://www.aczen.in/nova-api/v1`.

---

## 2. Security & Compliance Architecture

1. **Role-Based Access Control (RBAC):**
   - Two distinct roles: `reviewer` (can view cases and record decisions) and `admin` (can change fee configurations, manage policies, and trigger Nova imports).
   - Passwords hashed using Bcrypt; authentication tokens generated with HMAC-SHA256 JWTs.
2. **Secrets Hygiene:**
   - Zero hardcoded credentials. All tokens (`NOVA_API_KEY`, `JWT_SECRET_KEY`) injected via environment variables or AWS Secrets Manager / SSM Parameter Store.
3. **Data Protection & Sanitization:**
   - Automated error sanitization middleware strips sensitive gateway tokens and keys from error responses and logs before returning to clients.
4. **Formula Injection Neutralization:**
   - All exported CSV reports sanitize string cells beginning with `=`, `+`, `-`, or `@` to protect finance teams from spreadsheet macro exploits.

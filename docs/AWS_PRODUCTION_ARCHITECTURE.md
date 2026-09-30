# FIN-11 LedgerSense | AWS Production Architecture & Cloud Deployment

This document outlines the production cloud architecture for FIN-11 LedgerSense deployed on Amazon Web Services (AWS) demonstrating enterprise-grade reliability, security, and scalability.

---

## 1. High-Level Architecture Diagram

```
                 Internet / Corporate VPN
                            │
                       [Route 53]
                            │
                  [AWS WAF / Shield]
                            │
               [Application Load Balancer] (HTTPS:443)
                            │
    ┌───────────────────────┴───────────────────────┐
    │                                               │
    ▼                                               ▼
[Next.js Web Client]                       [FastAPI Recon API]
(ECS Fargate Service)                      (ECS Fargate Service)
Auto-scaling (2-10 tasks)                  Auto-scaling (2-20 tasks)
    │                                               │
    │                                   ┌───────────┴───────────┐
    │                                   │                       │
    ▼                                   ▼                       ▼
[Amazon S3]                    [ElastiCache Redis]      [Amazon RDS / Supabase]
(Presigned Uploads,            (BullMQ Job Queue,       (PostgreSQL 15+,
CSV/JSON Batches,               SSE Live Progress,       Row-Level Security,
Encrypted with KMS)             Distributed Lock)        pgcrypto, pgvector)
                                        │
                                        ▼
                             [ECS Background Workers]
                             (Pure 7-Stage Recon Engine)
```

---

## 2. AWS Services Breakdown & Implementation Rationale

### 1. Docker & Amazon ECR (Elastic Container Registry)
- **Why**: Multi-stage lightweight Docker image (`python:3.11-slim`) guarantees reproducible deployments without host environment discrepancies.
- **Security**:
  - Runs under non-root user `appuser` (UID 10001).
  - Images scanned automatically on push via ECR Enhanced Image Scanning (powered by Clair/Inspector) to prevent CVE vulnerabilities.

### 2. Amazon ECS with AWS Fargate
- **Why**: Serverless container orchestration. Eliminates EC2 server patching, OS maintenance, and provides zero-downtime rolling deployments.
- **Configuration**:
  - `web-service`: Next.js frontend container.
  - `api-service`: FastAPI application container handling REST APIs and SSE streaming.
  - `worker-service`: Dedicated background tasks processing million-row batch reconciliations asynchronously without tying up HTTP threads.
  - **Auto-Scaling**: Scales up based on CPU utilization (>70%) and Redis queue depth.

### 3. Amazon S3 (Simple Storage Service)
- **Why**: Secure repository for client-uploaded financial datasets (CSV, JSON, MT940, CAMT.053).
- **Security & Best Practices**:
  - Direct browser-to-S3 uploads via **Presigned URLs** (`PUT /api/uploads/presign`). Raw files never traverse backend memory directly during transit.
  - Server-Side Encryption with AWS KMS customer-managed keys (`SSE-KMS`).
  - Strict S3 Block Public Access enabled; bucket policy enforces TLS 1.3.

### 4. Amazon RDS PostgreSQL / Supabase
- **Why**: ACID-compliant relational data store with relational integrity, immutable triggers, and `pgvector` extension for semantic search.
- **Enterprise Features**:
  - Multi-AZ deployment for 99.95% high availability.
  - Private subnet isolation (no public IP address; accessible only from ECS security groups).
  - Automated continuous backups with Point-In-Time-Recovery (PITR).
  - Database triggers enforce immutable append-only constraints on `audit_log`.

### 5. ElastiCache Redis
- **Why**: Low-latency caching, distributed locking, and event streaming.
- **Responsibilities**:
  - **Live Progress Streaming**: Redis Pub/Sub drives Server-Sent Events (SSE) so users see live stage progress without database polling.
  - **Rate Limiting**: Protects login and ingestion endpoints against brute force and DDoS attacks.
  - **Distributed Locks**: Prevents duplicate concurrent reconciliation runs for the same merchant batch.

### 6. Amazon SQS (Simple Queue Service)
- **Why**: Decoupled asynchronous event queuing for batch processing spikes.
- **Pattern**: When a large financial dataset (e.g. 500,000 transactions) is ingested, an SQS message is enqueued with FIFO deduplication. ECS worker tasks pull chunks from SQS, process reconciliation stages, and flush results in transactional batches.

---

## 3. Production Deployment Checklist

1. [x] **Container Security**: Non-root `USER` declared in Dockerfile, `HEALTHCHECK` directive verified.
2. [x] **Secrets Management**: Sensitive credentials stored exclusively in **AWS Systems Manager (SSM) Parameter Store** or **Secrets Manager**; never hardcoded in git.
3. [x] **Network Isolation**: Database and Redis clusters placed in private VPC subnets.
4. [x] **Observability**: CloudWatch Container Insights metrics, structured JSON logging with request ID tracking, and synthetic health checks on `/health` and `/api/health`.

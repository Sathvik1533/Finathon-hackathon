# FIN-11 LedgerSense | AWS Cloud Architecture & Image Prompt (Light Theme)

> **Visual Style Reference**: Modeled strictly after the **EasePrint – AWS Cloud Architecture** layout (Clean white background, clear bordered containers, colored AWS service badges, legible typography, 16:9 widescreen format).

---

## 1. High-Resolution Architecture Flowchart (Mermaid)

```mermaid
flowchart TD
    %% Tiers definition
    subgraph CLIENT_TIER["Client Tier (Finance & Operations Channels)"]
        UI1["React / Next.js Web Portal\n(Executive Dashboard • Ingestion • Reviewer Modal)"]
        UI2["Finance Staff Command Center\n(Amount-at-Risk Queue • Settlement Matcher • Audit Trail)"]
    end

    subgraph EXT_TIER["External Integrations"]
        NOVA["★ Aczen Nova Financial API\n(GET /payments • GET /gateway-transactions • GET /bank-transactions • GET /settlements)"]
        WEBHOOKS["Bank Statement & Processor Feeds\n(UTR Clearing Statements • CSV Fallbacks)"]
    end

    subgraph CICD["CI/CD Pipeline"]
        GH["GitHub Repository\n(Sathvik1533/Finathon-hackathon)"]
        GHA["GitHub Actions\n(Linting • Secrets Scan • Pytest • Node.js Suite)"]
        ECR["Amazon ECR\n(Docker Image Registry)"]
        GH --> GHA --> ECR
    end

    subgraph AWS_CLOUD["AWS Cloud (us-east-1)"]
        subgraph NETWORKING["Networking & Ingress (VPC)"]
            ALB["Application Load Balancer (ALB)\nPermanent HTTPS Ingress"]
            SUBNET_A["Public Subnet us-east-1a"]
            SUBNET_B["Public Subnet us-east-1b"]
            SUBNET_A --- ALB --- SUBNET_B
        end

        subgraph COMPUTE["Compute Tier"]
            ECS["AWS ECS Fargate (Serverless Container)\n• Node.js Express TypeScript API\n• Next.js Frontend Build\n• Deterministic 7-Stage Reconciliation Engine\n  (ID Match ➔ Regex ➔ Partial ➔ Fee ➔ Refund ➔ Batch ➔ Risk Ranking)"]
        end

        subgraph DATA_AI["Data & AI Tier (Storage, Database & Governed Intelligence)"]
            RDS[("PostgreSQL Database (RDS / Supabase)\n• Exact NUMERIC(18,4) Decimal Precision\n• Row Level Security (RLS) Tenant Isolation\n• Immutable Append-Only Audit Trigger")]
            DYNAMO["Amazon DynamoDB\n(Real-Time Job State, Idempotency & Run Locks)"]
            S3["Amazon S3\n(Encrypted Financial Reports & Audit CSV Archives)"]
            BEDROCK["Amazon Bedrock (Claude 3.5 Sonnet)\n(Governed Anomaly Explanations with G1-G5 Guardrails)"]
            CW["Amazon CloudWatch\n(Real-Time Logging, Monitoring & Audit Alarms)"]
        end
    end

    %% Inter-tier connections
    CLIENT_TIER --> ALB
    EXT_TIER --> ALB
    ECR -->|Deploy to ECS (Rolling Update)| ECS
    ALB --> ECS
    ECS <--> RDS
    ECS <--> DYNAMO
    ECS <--> S3
    ECS <--> BEDROCK
    ECS --> CW
```

---

## 2. ChatGPT Image Generation Prompt (Light Theme, Copy & Paste)

Copy and paste the prompt below into **ChatGPT (GPT-4o / DALL-E 3)** to generate the crisp, light-mode architecture diagram matching your reference:

```text
Please generate a crisp, clean, professional enterprise cloud software architecture diagram titled:
"LedgerSense – AWS Cloud Architecture: An End-to-End Payment Reconciliation & Settlement Platform"

Visual Style & Layout (Exactly like the EasePrint AWS Cloud Architecture reference):
- Clean bright light theme: Pure white background (#ffffff), soft light-gray section panels (#f8fafc), thin rounded rectangular borders with subtle shadow.
- High resolution, 16:9 widescreen presentation format.
- Professional vector typography, crisp colored icons (AWS orange, Docker blue, PostgreSQL blue, DynamoDB blue, Bedrock teal).

Diagram Structure (Top to Bottom):
1. TOP ROW [Client Tier]:
   - Blue Box: "React / Next.js Web Portal" (Executive Dashboard, Live Ingestion, Case Reviewer).
   - Purple Box: "Staff Finance Operations Dashboard" (Queue Management, Settlement Matcher, Audit Trail).

2. SECOND ROW [External Integrations]:
   - Amber/Gold Bordered Box: "Aczen Nova Financial API" (Core Engine: /payments, /gateway-transactions, /bank-transactions, /settlements).
   - Blue Box: "Payment Gateways & Banking Rails" (Bank Statements, Webhook Payloads, UTR Settlement Feeds).

3. LEFT COLUMN [CI/CD Pipeline]:
   - Stacked vertical flow: "GitHub (Source Code)" -> "GitHub Actions (Build, Lint & Test)" -> "Amazon ECR (Docker Registry)" -> Arrow pointing to ECS Fargate.

4. CENTER & RIGHT [AWS Cloud (us-east-1)]:
   - Green Ingress Banner: "Networking & Ingress (VPC)" with "Public Subnet us-east-1a", "Application Load Balancer (ALB) HTTPS", "Public Subnet us-east-1b".
   - Central Red/Orange Container: "Compute Tier - AWS ECS Fargate" (Multi-stage Docker container running Node.js + Express + TypeScript Backend, Next.js Frontend, and the Deterministic 7-Stage Reconciliation Engine).
   - Right Purple Container: "Data & AI Tier" with:
     * "PostgreSQL on Supabase / RDS" (Exact NUMERIC(18,4) Currency Precision, Row Level Security, Immutable Audit Triggers).
     * "Amazon DynamoDB" (Job State, Idempotency & Run Locks).
     * "Amazon S3" (Encrypted Financial Audit Exports).
     * "Amazon Bedrock" (Governed AI Anomaly Explanations with G1-G5 Guardrails).
     * "Amazon CloudWatch" (Real-Time Metrics, Logging & Audit Trails).

5. BOTTOM FOOTER [Key Features & Benefits]:
   - Badges along bottom: "0 Precision Loss (NUMERIC)", "Row Level Security (RLS)", "Aczen Nova Real Data", "Deterministic 7-Stage Engine", "Immutable Audit Logs", "Governed AI Assistant".

All labels must be sharp, legible, and technical. The overall aesthetic must feel clean, corporate, and venture-pitch ready.
```

---

## 3. How to Present This Slide Live (30-Second Script)

> *"Judges, here is our complete production cloud topology, modeled on standard AWS financial architecture.*
> 
> *Starting on the top left, the **Aczen Nova Financial API** feeds multi-source accounting streams across internal orders, gateway captures, and bank settlement credits.*
> 
> *Requests flow through an **AWS Application Load Balancer** into **AWS ECS Fargate**, running our **Node.js Express TypeScript API** and our **7-stage deterministic reconciliation engine**.*
> 
> *All financial records are stored in **PostgreSQL** with **NUMERIC(18,4) arbitrary precision** and **Row Level Security (RLS)**, ensuring 0 floating-point penny drift and complete tenant isolation.*
> 
> *For enterprise audit compliance, an immutable trigger prevents any alteration of audit logs. For our future roadmap, we integrate **Amazon Bedrock** for governed, explainable AI case briefs while keeping all financial approvals strictly in the hands of human finance analysts."*

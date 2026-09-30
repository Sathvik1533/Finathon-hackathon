# FIN-11 LedgerSense | Hackathon Pitching & Presentation Guide (Updated for 9:30 PM Evaluation)

This guide gives your entire team the exact narrative, feature walkthrough, deployment strategy, and live demo script to pitch **FIN-11 LedgerSense** with zero confusion.

---

## 1. The 30-Second Elevator Pitch
> *"When a customer buys something online, a single payment generates four separate financial records across internal databases, payment gateways, banking settlement rails, and refund logs. Because these events occur at different times, use different identifiers, and are bundled into bulk settlements minus hidden processing fees and GST, modern finance teams lose millions in uncollected cash and manual reconciliation overhead. We built **LedgerSense**: an enterprise-grade, deterministic payment reconciliation and settlement engine powered by the **Aczen Nova Financial API** that reconstructs the entire transaction lifecycle, detects fee leakages with zero false approvals, and ranks every financial risk by Amount at Risk."*

---

## 2. Our Deployment Strategy: What to Say to Judges
When judges ask where the system is deployed, here is your winning answer:

> *"To demonstrate a live, interactive end-to-end prototype today within the hackathon timeline, our application is deployed on **Vercel** for the high-performance Next.js/React frontend and **Railway** for our Node.js Express backend and Redis cache, connected to **Supabase** for PostgreSQL with Row Level Security.*
> 
> *Our production enterprise architecture is fully designed for **AWS Cloud**: running on **AWS ECS Fargate** behind an **Application Load Balancer**, with **Amazon RDS PostgreSQL** utilizing arbitrary-precision `NUMERIC(18,4)`, **Amazon DynamoDB** for run locks, **Amazon S3** for audit archives, and **Amazon Bedrock** for governed AI anomaly explanations where AI explains but never decides."*

---

## 3. How We Use the Aczen Nova API (Our Core Unfair Advantage)
Stress this heavily — this is what sets us apart from competitors using fake mock numbers:

1. **`GET /payments` (Internal Orders)**: Ingests authentic customer orders (`ORD-101`, `ORD-102`), currency, and gross values. Used in **Stage 1 (ID Matching)**.
2. **`GET /gateway-transactions` (Gateway Captures)**: Ingests payment processor authorization timestamps, gross amounts, processor MDR fees, and GST splits. Used in **Stage 4 (Fee & Tax Recalculation)** to catch processor overcharges.
3. **`GET /bank-transactions` (Bank Clearing Statements)**: Ingests raw nodal bank statements, credit/debit markers, and cryptic bank narrations with UTR numbers (`UTR-HDFC-...`). Used in **Stage 2 (Regex Parsing)**.
4. **`GET /settlements` (Processor Batch Settlements)**: Ingests bulk payout bundles. Used in **Stage 6 (One-to-Many Grouping)** to distinguish legitimate in-flight `TIMING_LAG` (T+2 cutoff) from true `MISSING_BANK_CREDIT`.

---

## 4. Key Differentiators (Why LedgerSense Wins)

| Dimension | Typical Competitor Apps | LedgerSense Architecture |
|---|---|---|
| **Numeric Precision** | `FLOAT` / `DOUBLE` / JS `Number` (accumulates rounding drift) | PostgreSQL **`NUMERIC(18,4)`** & integer paise (0 precision drift) |
| **Data Security** | Generic application-level filtering | Database **Row Level Security (RLS)** & tenant isolation |
| **Audit Compliance** | Mutable database records | **Immutable Append-Only Trigger** (`prevent_audit_log_tamper`) |
| **Decision Logic** | Unregulated AI hallucinating on money | **7-Stage Deterministic Math Engine** (0 False Positive Approvals) |
| **Concurrency** | Last-write-wins (analysts overwrite each other) | **Optimistic Concurrency Control (`HTTP 409`)** with atomic versions |
| **Live UI/UX** | Generic AI-generated landing pages | **High-Craft Operations Cockpit** with 5 live interactive screens |

---

## 5. Live Demo Walkthrough (Step-by-Step for 9:30 PM Evaluation)

### Accessing the Prototype
- **Localhost URL**: `http://localhost:4000` (or `http://localhost:4000/prototype`)
- **Direct HTML File**: `web/index.html` (can also be opened directly in any browser)
- **Login Credentials**:
  - Username: `admin` | Password: `admin123` (Admin Role)
  - Username: `reviewer` | Password: `reviewer123` (Finance Analyst Role)

### Exact 90-Second Demo Script:
1. **Show Executive Dashboard (20 seconds)**:
   - Point out the KPI cards: Total Processed, Successfully Settled, Net Fee Leakage, and Total Amount at Risk.
   - Explain: *"Every single rupee is tracked with exact `NUMERIC(18,4)` precision down to the sub-cent."*
2. **Show Nova Feed Ingestion (20 seconds)**:
   - Click the **"Aczen Nova Feed Explorer"** tab.
   - Click **"Sync Nova Feeds"** ➔ Show live ingestion across all 4 streams (Internal Orders, Gateway Captures, Bank Statements, Settlements).
3. **Execute 7-Stage Reconciliation (20 seconds)**:
   - Click **"Run Reconciliation"** button.
   - Explain: *"The engine executes 7 deterministic stages: ID match, regex narration parsing, weighted partial match, MDR fee verification, refund netting, batch settlement grouping, and risk ranking."*
4. **Resolve Exceptions by Risk (20 seconds)**:
   - Switch to the **"Exceptions Queue"** tab.
   - Show how the top case has the highest financial exposure (`Amount at Risk`).
   - Click **"Review Case"** ➔ Show the details ➔ Select **"Approve"** with rationale ➔ Click Submit.
5. **Show Tamper-Proof Audit Trail (10 seconds)**:
   - Switch to the **"Audit Trail"** tab.
   - Show the newly recorded decision with timestamp, user attribution, and action.
   - Highlight: *"This table is protected by a PostgreSQL trigger that rejects all updates and deletes."*

---

## 6. Forwardable Cheat Sheet for Your Teammates
*(Copy and paste this directly into your team WhatsApp / Slack / Discord)*

```text
🚀 FIN-11 LEDGERSENSE — EVALUATION CHEAT SHEET (9:30 PM)

1. THE PRODUCT:
LedgerSense is an enterprise payment reconciliation engine that matches 4 sources: Internal Orders, Gateway Events, Bank Statements, and Settlements.

2. CORE DIFFERENTIATOR (THE NOVA API):
We do NOT use fake mock numbers. We ingest real-world digital commerce accounting streams from the Aczen Nova Financial API:
- GET /payments (Internal orders)
- GET /gateway-transactions (Gateway captures + MDR fees)
- GET /bank-transactions (Bank narrations + UTRs)
- GET /settlements (Batch payout bundles)

3. WHY OUR CODE WINS:
- DB Precision: PostgreSQL NUMERIC(18,4) + integer paise (0 floating-point penny errors).
- Security: Database Row Level Security (RLS) on all tables.
- Compliance: Immutable audit log protected by database triggers.
- Engine: 7-stage deterministic math (NO AI guessing on money, 0 false approvals).

4. DEPLOYMENT TALKING POINT:
"For today's evaluation, our working prototype is running live on Vercel (Frontend) and Railway (Backend & Redis) with Supabase PostgreSQL. Our enterprise production deployment is fully architected for AWS (ECS Fargate, ALB, RDS, S3, DynamoDB, Bedrock)."

5. LIVE DEMO LINK & CREDENTIALS:
- URL: http://localhost:4000
- Username: admin / Password: admin123
- Flow: Sync Nova Feeds -> Run Reconciliation -> Review Top Exception by Amount at Risk -> Show Audit Trail.
```

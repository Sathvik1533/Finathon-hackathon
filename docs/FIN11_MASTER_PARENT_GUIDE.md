# FIN11 Master Parent Guide

## Section 1: What This Document Is About
This document is for teammates and evaluators to understand the complete end-to-end architecture and flow of the FIN-11 LedgerSense reconciliation engine. It covers the frontend, backend, database, the unfair advantage provided by the Aczen Nova API, and a complete user journey, all explained in simple, plain English without unnecessary technical jargon.

## Section 2: Frontend — What We Built and Why
- **What is the frontend?** The frontend is the part of the application that users see, interact with, and click on.
- **What did we choose?** We chose React and Tailwind CSS. React is a tool for building interactive user interfaces, and Tailwind CSS is a styling tool that helps us make the application look good quickly.
- **Why React for finance?** React offers excellent advantages for financial applications: it allows for component reuse, ensures fast updates without page reloads, provides type safety, and makes integrating secure logins (JWT) very easy.
- **What can users do on it?**
  1. **Login screen:** Users securely log in using an admin or reviewer account.
  2. **Dashboard:** Users view 4 key performance indicators, track the 7-stage pipeline progress, and click a button to trigger reconciliation.
  3. **Multi-Stream Timeline:** Users select specific orders to see 4 data streams side by side.
  4. **Nova 4-Source Explorer:** Users view all 4 data tables directly fetched from the Aczen Nova feeds.
  5. **Exceptions Queue:** Users view a sortable table of issues and can click a Review button to approve, reject, or escalate them.
  6. **Settlement Matcher:** Users visualize how many individual transactions match into a single bulk settlement batch.
  7. **Recon Report:** Users view a summary of the module coverage (11/11) and can export the data as a CSV file.
- **What libraries did we add?** We added React Bits for smooth animation primitives and transition cards, and Aceternity UI for subtle, enterprise-feeling floating cards and spotlights.
- **Where does Aczen Nova API show up in the frontend?** The Nova 4-Source Explorer screen shows live data from Aczen Nova's `/payments`, `/gateway-transactions`, `/bank-transactions`, and `/settlements` endpoints. Without Nova API, users would only see fake static numbers with no real-world financial behavior.

## Section 3: Backend — What We Built and Why
- **What is the backend?** The backend is the hidden engine that does all the heavy lifting, calculations, and data processing behind the scenes.
- **What did we choose?** We chose Node.js, Express, and TypeScript. Node.js runs the engine, Express handles the web requests, and TypeScript ensures the code is strictly typed and error-free.
- **Why these for finance?** They provide exact integer math preventing rounding errors, strong type safety, and very fast processing speeds.
- **What does it do?** It exposes 12 API endpoints that handle everything from user login, triggering reconciliations, viewing exceptions, updating decisions, to generating reports.
- **The 7-stage reconciliation engine:**
  1. Stage 1 matches orders one-to-one using unique IDs.
  2. Stage 2 parses messy bank descriptions to find the exact reference numbers.
  3. Stage 3 handles partial matches by comparing amounts and dates within a safe range.
  4. Stage 4 calculates the exact fees to ensure the gateway hasn't overcharged.
  5. Stage 5 processes refunds to make sure they were correctly credited.
  6. Stage 6 groups many individual payments into one large settlement block.
  7. Stage 7 ranks all the problems it found so humans can fix the biggest risks first.
- **Redis cache:** It acts as a fast, temporary memory that prevents two users from running the engine at the same time and stores the final results so the page loads instantly.
- **Where is Aczen Nova API used in backend?** The backend calls Nova's 4 endpoints to get the real financial data before running the 7-stage engine. Without Nova, we'd have to make up the numbers ourselves, which wouldn't reflect real payment gateway behavior like MDR fees, T+2 settlement windows, etc.

## Section 4: Database — What We Built and Why
- **What is the database?** The database is the secure vault where all the results and records are saved permanently.
- **What did we choose?** We chose Supabase PostgreSQL.
- **Why PostgreSQL for finance?** It guarantees exact precision for currency using NUMERIC(18,4), enforces Row Level Security so users only see what they should, and maintains immutable audit logs.
- **DB Schema:**
  - `finathon_runs`: Stores each reconciliation run, showing when it happened, how many records were checked, and how many discrepancies were found.
  - `finathon_exceptions`: Stores each individual discrepancy found, including what type of issue it is, the money at risk, and the decision made to fix it.
  - `finathon_audit_log`: Stores every action taken, like who approved or rejected what and exactly when. This table can NEVER be edited or deleted.
- **The immutable audit trigger:** Once a decision is recorded, it stays forever. No one can delete or change it.

## Section 5: Nova API — Unfair Advantage
- **What is the Aczen Nova API?** It is a real financial data API from Aczen.in that gives us actual merchant payment records.
- **What are its 4 data streams and what does each one give us?**
  1. **Payments:** Internal merchant orders and expected amounts.
  2. **Gateway Transactions:** Authorization captures with exact contractual MDR fee and GST splits.
  3. **Bank Transactions:** Actual bank clearing statements with messy UTR settlement narrations.
  4. **Settlements:** Gateway batch settlement advices with gross-to-net payout breakdowns.
- **Why is it an unfair advantage?** Most hackathon teams use random fake data; we use real-world financial structures with actual MDR fee schedules, real settlement narration formats, and real T+2 latency behavior.
- **What happens without Nova API?** The reconciliation engine still runs but on generic synthetic data. The fee mismatches, UTR narrations, and settlement batch structures won't reflect real Indian payment gateway behavior.

## Section 6: End-to-End User Journey (Step by Step)
Step 1: Priya opens the app and sees the clean, enterprise-grade login screen.
Step 2: She logs in with admin/admin123, which securely creates a JWT token in the backend to identify her.
Step 3: She goes to the Nova 4-Source Explorer and clicks Sync Nova Feeds, which makes API calls to pull real data from Aczen Nova.
Step 4: She goes to the Dashboard and clicks Trigger Reconciliation, firing the 7 stages and instantly showing the results.
Step 5: She sees 2 exceptions and clicks on the FEE_MISMATCH for ORD-103 to read the AI policy explanation.
Step 6: She clicks Approve and writes a note, which sends an API call to permanently save her decision to the database.
Step 7: She goes to the Audit Trail and sees her decision logged permanently, protected by the immutable trigger.
Step 8: She goes to the Recon Report tab and clicks Export CSV to download the final summary directly from `/api/report?format=csv`.

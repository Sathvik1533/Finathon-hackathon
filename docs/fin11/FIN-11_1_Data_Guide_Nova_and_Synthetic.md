# FIN-11 LedgerSense | Data Guide: Nova API and the Synthetic Engine (v3)

**Status:** v3 adds the `razorpay` batch source (Phase 2, section 12) and clarifies the two Nova branches. Every other guide points here for data sources.
**Parent guide:** FIN-11 Main Guide (`FIN-11_0_Main_Guide_End_to_End.md`). If this document and the parent disagree, the parent wins, then raise a contract PR.
**Stack (fixed):** Next.js + React (web) | Node.js + Express + TypeScript (api) | FastAPI (ai) | PostgreSQL (RDS, pgvector) | AWS (EC2 + docker-compose, RDS, S3, SSM).
**Build tool:** Antigravity IDE, one agent per branch, one small task per prompt, each with an acceptance check.
**Golden rule:** Deterministic first, AI second. Money is integer paise. Nothing hardcoded.

---

## 1. What changed and why

| Before | Now |
|---|---|
| Two batch sources: `simulated`, `upload` | Three: **`nova`**, `simulated`, `upload`; **a fourth, `razorpay`, is added in Phase 2 (section 12)** |
| Simulator had no link to real-world figures (`reference_metrics` were typed into config) | Simulator is calibrated from **real figures computed from Nova**, using the J.P. Morgan AI Research 7-step method |
| "Real vs synthetic" panel used placeholder reference numbers | Panel compares metrics computed from a Nova batch with metrics computed from a synthetic batch, by the same functions |

**Data honesty statement (use verbatim in the README and the demo):**
> The synthetic data engine follows the seven-step process described by J.P. Morgan AI Research for generating synthetic financial datasets (Assefa et al., ICAIF 2020). No J.P. Morgan datasets are used; those are available only by request and none is a reconciliation dataset. Real-world reference figures come from the Nova API (Aczen), read-only, INR, Indian GST.

Never write that J.P. Morgan data was acquired, used, or validated against.

---

## 2. The three batch sources

| Source | Where data comes from | Ground truth | Benchmark panel |
|---|---|---|---|
| `simulated` | Seeded generator (this guide, section 8) | Yes, hidden, on every internal row | Full (precision, recall, false approvals, category accuracy) |
| `nova` | Nova API import (sections 3 to 7) | **No** | "Not available"; show match rate, exception mix, Amount at Risk only |
| `upload` | CSV or JSON via presigned S3 upload | No | "Not available" |
| `razorpay` (Phase 2) | Razorpay API import, Basic Auth, test mode first (Razorpay Guide, Doc 11) | **No** | "Not available"; same rules as Nova |

The engine is identical for all three and never reads `ground_truth`. Do not claim accuracy on a Nova batch. Say "exception rate observed", not "accuracy".

---

## 3. Nova facts the whole team must follow

Source: the Nova API Reference v1 (read-only REST, INR, Indian GST). These are hard rules, not preferences.

| # | Rule | Consequence in our code |
|---|---|---|
| 1 | Base URL uses **www**: `https://www.aczen.in/nova-api/v1`. The apex redirects and clients drop the `Authorization` header, giving 401 | One constant `NOVA_BASE_URL` in env. The PDF header prints `/novaapi/v1` in one place; the body and examples use `/nova-api/v1`. Trust the body, then confirm with `curl $NOVA_BASE_URL/health` in step 3 below |
| 2 | Key format `nova_sk_` + 43 chars, sent as `Authorization: Bearer` | Key lives only in `NOVA_API_KEY` on the **api** service (SSM in prod). Never in web, ai, git, logs or images |
| 3 | Server-side only | The browser never calls Nova. The web app calls our `/api/nova/*` |
| 4 | Only `GET` exists (`POST/PUT/PATCH/DELETE` give 405) | LedgerSense never writes to Nova. Our decisions and audit stay in our PostgreSQL |
| 5 | Lists are paged: `{data, pagination:{limit,offset,total,has_more}}`; default 50, max 200 (clamped) | Always `limit=200`, loop `offset += 200` while `has_more`, **sequentially** |
| 6 | Filters: `field=value` or `field.op=value`, ops `eq in gte lte gt lt ilike`. Unknown field gives `400 unknown_filter` | Filters come from an allow-list file generated from Nova section 10. No invented filters, no PostgREST syntax |
| 7 | 120 requests/minute per key; every authenticated call counts (even 400/404/429). `/health` and 401 do not | Client-side limiter at 100/min, reads `RateLimit-Remaining` and `RateLimit-Reset` |
| 8 | `429`: wait `Retry-After`. `502`: backoff 1s, 2s, 4s, max 3 tries. Never retry 400, 401, 404, 405 | Implemented once in `NovaClient` |
| 9 | Errors handled by `error.code`, log `request_id` | Our error log stores `nova_request_id` |
| 10 | `404 resource_not_found` means "not visible to you" | Treat as absent, never as a crash |
| 11 | Amounts are INR JSON numbers | Convert with `Math.round(x * 100)` to integer paise, then `BigInt`. Unit-test with `0.1`, `0.29`, `1234567.89` |
| 12 | GST is CGST+SGST (intra-state) or IGST (inter-state); the other side is 0 | Sum both sides; never assume one |
| 13 | "Overdue" and ageing use a **fixed dataset as-of date**, not today | Our `as_of` for Nova batches is derived from the data (section 6, step 7), never `new Date()` |
| 14 | Data does not change between requests | Import once per merchant, cache raw payloads in PostgreSQL, re-import only on admin request |
| 15 | Each key sees its own team slice (`/me` returns `team_slot`, `dataset_slice`) | Store both on every import for provenance; teams with different slices see different numbers, that is expected |
| 16 | Unknown response fields may appear later | Zod schemas use `.passthrough()` and read only the fields we map |
| 17 | Response objects contain more fields than are filterable | Field names not listed in Nova section 10 must be **discovered** (section 5), not guessed |

---

## 4. Nova to four-source mapping

The reconciliation problem statement has internal records, gateway records, bank settlement records, plus refunds and settlements. Nova resources map as follows. Field names in **bold** are filterable in Nova section 10 and therefore known; anything else is marked `verify` and must be confirmed in the discovery step.

| Our table | Nova resource | Rows used | Key fields (known) | Notes |
|---|---|---|---|---|
| `internal_txns` | `/payments` joined to `/invoices` | Every payment row | payments: **payment_date, method, invoice_id, client_id, amount, tds_deducted, bank_transaction_id**; invoices: **invoice_number, total_amount, status** | `internal_id` = payment number or id (`verify`); `order_ref` = invoice number; `amount_paise` = amount. `tds_deducted` is a known reason for short receipts: keep it in `evidence` |
| `gateway_txns` | `/gateway-transactions` where `txn_type=capture` | Captures | **txn_type, status, channel_id, card_scope, settlement_id, parent_txn_id, gateway_ref, order_ref, customer_ref, bank_rrn, txn_at, amount, fee** | `gateway_payment_id` = `gateway_ref`; `tax_paise` = GST on fee (`verify` field name; otherwise derive `fee * gst_bps / 10000` and flag `derived`) |
| `refunds` | `/gateway-transactions` where `txn_type` in `refund, chargeback, chargeback_reversal`; `/credit-notes` as context | Refund-like rows | `parent_txn_id` links to the original capture; credit notes: **invoice_id, amount, reason** | Stored with `kind` column (migration 0007) |
| `bank_credits` | `/bank-transactions` where `credit.gt=0` | Credit lines | **account_id, value_date, posted_date, credit, bank_ref, counterparty_text, raw_narration** | `utr` = `bank_ref` (fallback: `bank_rrn`-like token extracted from narration by stage 2); `narration` = `raw_narration` (untrusted text) |
| `source_settlements` (new) | `/settlements` | All | **settlement_ref, settlement_date, period_start, period_end, status, net_amount, adjustments, payout_account_id** | Gives the **expected** credit per settlement, used by stage 6 as a cross-check |
| lineage | `/source-records`, `/payment-channels`, `/bank-accounts` | Optional | source_system, record_type, external_id; channel_code, fee_model, settlement_days | `settlement_days` and `fee_model` feed the calibration profile |

Rules:
1. The mapping lives in `api/config/nova-mapping.json` (resource, field names, filters). Code reads it. Nothing hardcoded.
2. `payments.bank_transaction_id` is a Nova-provided link. The engine **must not** read it (that would be label leakage). Optional stretch: after a run, report "agreement with Nova's own links" as a weak-label metric, clearly named as such.
3. Debits in `/bank-transactions` are not imported in the MVP.

---

## 5. Step by step: Nova onboarding (do this in hours 0 to 2)

1. **Get access.** Sign in at `https://www.aczen.in/nova-api` with your allowlisted email. If your email is not allowlisted, ask the organisers now; everything else depends on it.
2. **Create a key** on the API keys page (name it `fin11-dev`). The full key is shown once. Put it in `api/.env` as `NOVA_API_KEY`. One active key per account: to rotate, revoke then create.
3. **Prove connectivity** (no key needed, then with key):
   ```
   curl "$NOVA_BASE_URL/health"
   curl "$NOVA_BASE_URL/me" -H "Authorization: Bearer $NOVA_API_KEY"
   curl "$NOVA_BASE_URL/gateway-transactions?limit=2" -H "Authorization: Bearer $NOVA_API_KEY"
   ```
   Expect `{"status":"ok"}`, your key record with `team_slot` and `dataset_slice`, then two objects.
4. **Run the discovery script** `api/scripts/nova-discover.ts` (Antigravity prompt N1). For each resource in the mapping it fetches `limit=3`, prints the field names and types, and writes `docs/nova-discovery.md` (field names only, no key, no more than 3 sample rows each).
5. **Fill the `verify` cells** in section 4 and commit `nova-mapping.json`.
6. **Freeze** the mapping at hour 2 with the contract. Changes after that need a contract PR.

**Antigravity prompt N1 (branch `feat/be/nova-client`, paste after the backend preface).** Note: this branch holds only the client, the discovery script and the mapping file. The importer, endpoints and SSE (module B12) live on a different branch, `feat/be/nova`, built after this one is merged.
> Create `api/src/services/nova/NovaClient.ts` and `api/scripts/nova-discover.ts`. NovaClient: base URL and key from env, GET only, Authorization Bearer, limiter at 100 requests per minute, honor Retry-After on 429, exponential backoff 1s/2s/4s (max 3) on 502, no retry on 400/401/404/405, errors surfaced as `NovaError{status, code, requestId}`, `listAll(path, params)` with limit=200 and sequential offset paging. The key must never appear in logs or errors. The discover script fetches limit=3 from every resource in `config/nova-mapping.json` and writes field names and types to `docs/nova-discovery.md`. Unit tests use a fixture HTTP server, never the real API.

---

## 6. Step by step: the Nova import pipeline (backend module B12 implements this)

An admin clicks **Import from Nova** (screen S16). This pipeline is module B12 on branch `feat/be/nova`. The API does:

1. **Preflight.** `GET /health`, `GET /me`. Store `team_slot`, `dataset_slice`. Stop with a clear error if 401 (check `www`, then whitespace in the key).
2. **Create** a `nova_imports` row (`queued`) and return `importId`. Progress is streamed over SSE (same emitter pattern as runs).
3. **Pull resources sequentially** in this order: `/bank-accounts`, `/payment-channels`, `/invoices`, `/payments`, `/gateway-transactions`, `/settlements`, `/bank-transactions` (`credit.gt=0`), `/credit-notes`. Use `listAll`. After each resource save raw rows into `nova_records` (`import_id, resource, nova_id, payload jsonb`) so an import can be replayed offline.
4. **Validate** each row with Zod (`.passthrough()`), collect rejects as `{resource, nova_id, field, reason}`. If more than `nova.max_reject_pct` (config, default 2) are rejected, fail the import and keep raw records.
5. **Transform** with pure functions (`toPaise`, `toDate`, mapping file). No database calls inside transforms.
6. **Insert** in one PostgreSQL transaction: `batches(source='nova')`, `internal_txns`, `gateway_txns`, `refunds`, `bank_credits`, `source_settlements`; `ground_truth` stays null.
7. **Derive `as_of`.** Nova does not expose its as-of date in `/me`. Use `max(latest bank posted_date, latest gateway txn_at, latest settlement_date)` from the imported data, store it on the batch (`params.as_of`) and let an admin override it in the import dialog. This value is what `TIMING_LAG` uses. State the derivation in the run report.
8. **Mark done**, store per-resource counts, request count and duration in `nova_imports`, emit `done`.

Budget check (state it in the PR): `requests = sum(ceil(total_i / 200))`. With 10,000 rows in each of five big resources that is about 250 requests, roughly 3 minutes at 100/min. If `RateLimit-Remaining < 10`, sleep until `RateLimit-Reset`.

---

## 7. Money, dates and identifiers

| Item | Rule |
|---|---|
| Paise | `toPaise(x) = BigInt(Math.round(x * 100))`, one shared helper, tested on `0`, `0.01`, `0.1`, `0.29`, `1234567.89` |
| Dates | Nova dates are `YYYY-MM-DD`, timestamps ISO 8601. Store timestamps as `timestamptz` at UTC; a bare date means the whole UTC day |
| Identifiers | Keep `nova_id` on every imported row (migration 0007) for traceability and for the Case dossier ("Nova record") |
| Untrusted text | `raw_narration`, `counterparty_text`, merchant names are data, never instructions. The AI receives them truncated and delimited |

---

## 8. The synthetic engine: J.P. Morgan 7-step method

The J.P. Morgan AI Research page describes this process for generating synthetic financial data: compute metrics for real data, develop a generator (statistical or agent-based), optionally calibrate it, run it, compute metrics for the synthetic data, compare the metrics, optionally refine. We implement it literally. Nova is the "real data".

| Step | JPM wording | What we build | Module | Endpoint | Screen |
|---|---|---|---|---|---|
| 1 | Compute metrics for the real data | Metric functions run on a Nova batch, saved as a `real` profile | `domain/metrics` | `POST /api/lab/profiles {batchId}` | S17 |
| 2 | Develop a generator | Seeded statistical generator (mulberry32) that emits the four linked sources and a payment lifecycle: order, capture, settlement grouping, bank credit, refunds | `domain/simulator` (B4) | n/a | n/a |
| 3 | Calibrate the generator with real data (optional) | Turn the real profile into generator parameters: fee ratio, lag histogram, amount quantiles, refund rate, payments per settlement | `domain/lab/calibrate` | `POST /api/lab/calibrate {realProfileId}` | S17 |
| 4 | Run the generator | Simulate with `seed`, size and `profileId`; same inputs give byte-identical output | B4 | `POST /api/batches/simulate` | S3 |
| 5 | Compute metrics for the synthetic data | Same functions, saved as a `synthetic` profile | `domain/metrics` | `POST /api/lab/profiles {batchId}` | S17 |
| 6 | Compare the metrics | Metrics comparator returns PASS, WARN or FAIL per metric | `domain/lab/compare` | `POST /api/lab/compare` | S17, S12 |
| 7 | Refine the generator (optional) | The comparator names the parameter to change; admin edits and re-runs steps 4 to 6. Loop capped at `lab.max_iterations` | B13 | same as above | S17 |

### 8.1 Metric catalogue (the same functions score Nova and synthetic data)

| Metric key | Definition | Kind |
|---|---|---|
| `fee_ratio_bps` | `sum(fee) / sum(gross)` of captures, in basis points | scalar |
| `settlement_lag_days` | settlement date minus capture date, per settled payment | distribution |
| `refund_rate_bps` | refunds / captures, by count, in basis points | scalar |
| `amount_quantiles` | p10, p50, p90, p99 and mean of capture amounts, paise | distribution |
| `payments_per_settlement` | mean and p90 of captures per settlement | distribution |
| `failed_share_bps` | failed gateway rows / all gateway rows | scalar |
| `chargeback_rate_bps` | chargebacks / captures | scalar |
| `narration_ref_rate_bps` | bank credits whose narration has an extractable reference (stage 2 rule) | scalar |

### 8.2 Comparator rules (all tolerances in config, section 10)

- Scalar: relative error `|s - r| / max(|r|, epsilon)`. PASS if at most `tol_pass` (default 10%), WARN if at most `tol_warn` (default 25%), else FAIL.
- Distribution: two-sample Kolmogorov-Smirnov statistic on the raw values (or on histogram CDFs). PASS at most 0.10, WARN at most 0.20, else FAIL.
- The comparison table shows real value, synthetic value, error, verdict, and the generator parameter to adjust.

### 8.3 Generator design rules

1. All randomness from one seeded PRNG stream; no `Math.random`, no `Date.now()` inside the generator (pass `asOf`).
2. Different identifiers per source (internal id and order_ref; gateway `pay_...` and `settlement_id`; bank `utr` with messy narrations; refunds `rfnd_...`).
3. One-to-many: payments are grouped into settlements; one bank credit equals the sum of nets minus refunds.
4. Exceptions are injected at the admin's per-category rates and recorded in `ground_truth` (contract in the Database Guide).
5. **Do not calibrate exception rates from the engine's output on Nova**, then present the result as accuracy. That is circular. Nova gives no exception labels; the exception rates stay admin inputs. You may *display* the exception mix observed on a Nova batch for comparison, labelled as observed.
6. The metric functions and the generator live in `api/src/domain`, pure and unit-tested, with no import from `services` or `models`.

---

## 9. Acceptance checks

| Check | Expected |
|---|---|
| `curl $NOVA_BASE_URL/health` from your laptop and from the EC2 box | 200 `{"status":"ok"}` |
| Nova call with a wrong key, and with apex domain | 401 (this proves you handle it, and that the error envelope shows `request_id`) |
| `toPaise` tests | Pass on all listed values |
| Import a Nova team slice | `nova_imports.status=done`, counts per resource stored, batch source `nova`, `ground_truth` null |
| Second import request without change | Reuses cache or creates a new batch; never exceeds 120 requests per minute (check `RateLimit-Remaining` in logs) |
| Real profile vs same real profile | Comparator: all PASS, KS = 0 |
| Same seed and same profile | Byte-identical generator output (hash test) |
| Calibrated synthetic vs real | At least 6 of 8 metrics PASS or WARN; FAILs are shown, not hidden |
| Nova key search | `grep -r nova_sk_` over repo, images and logs returns nothing |

---

## 10. Config additions (seed in config v1, editable by admin)

```json
"nova": { "max_reject_pct": 2, "rate_limit_per_min": 100, "as_of_override": null },
"lab": {
  "tol_pass": 0.10, "tol_warn": 0.25, "ks_pass": 0.10, "ks_warn": 0.20,
  "max_iterations": 5, "amount_model": "empirical_quantiles"
}
```
The old `reference_metrics` block becomes a fallback used only when no Nova `real` profile exists, and the UI must then label it "typed reference, not measured".

---

## 11. Citations for the README

- Assefa, S., Dervovic, D., Mahfouz, M., Tillman, R., Reddy, P., Balch, T., Veloso, M. *Generating Synthetic Data in Finance: Opportunities, challenges and pitfalls.* ICAIF 2020 (also NeurIPS 2019 Workshop on AI in Financial Services). Process page: jpmorganchase.com/about/technology/research/ai/synthetic-data
- Nova API Reference v1 (Aczen), read-only accounting data.
- LedgerLens (github.com/Sathvik1533/LedgerLens): prior work by the same author; credit it as the origin of the deterministic-first design, four-source pipeline, eight exception categories and optimistic-concurrency review flow.
- Razorpay API documentation (authentication, settlements, settlement recon): razorpay.com/docs/api (Phase 2).

---

## 12. Phase 2: Razorpay as a fourth source (starts after the end-to-end gate)

| Item | Rule |
|---|---|
| Source value | `batches.source = 'razorpay'`; `ground_truth` null; benchmark "not available"; say "exception rate observed" |
| Authentication | Basic Auth, Key ID and Key Secret, server-side in the api service only; test mode first; `rzp_live_` keys refused unless `RAZORPAY_ALLOW_LIVE=true` |
| Mapping | `api/config/razorpay-mapping.json`, frozen after the Razorpay discovery step (Doc 11, prompt R3). Orders, payments, refunds, settlements and settlement recon map to `internal_txns`, `gateway_txns`, `refunds`, `source_settlements` |
| Bank credits | Razorpay does not provide the merchant's bank statement: they come from an uploaded bank CSV or a Nova import (decision D-R1) |
| Money | Razorpay amounts are integers in paise; validate as integers; no float conversion needed |
| Engine | Unchanged, identical for all four sources; never reads `ground_truth` |
| Metrics | The metric catalogue (8.1) can profile a `razorpay` batch as a `real` profile in a later iteration; not required for Phase 2 |

Full specification: `FIN-11_11_Razorpay_Integration_Guide.md`.

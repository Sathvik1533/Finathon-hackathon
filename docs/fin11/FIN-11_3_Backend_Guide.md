# FIN-11 LedgerSense | Backend Guide (v3)

**Parent guide:** FIN-11 Main Guide (`FIN-11_0_Main_Guide_End_to_End.md`). If they disagree, the parent wins, then raise a contract PR.
**Track:** Backend. Owns `/api`. Branch prefix `feat/be/*`. Stack: Node 20, Express, TypeScript, `pg` (parameterized SQL), Zod, node-pg-migrate client only (migrations belong to the database track).
**Related:** Data Guide (Nova + synthetic) and Database Guide (0007 to 0009).

## What changed in v3
1. **B12 is split into two branches:** B12a `feat/be/nova-client` (client, discovery, mapping; Data Guide prompt N1) and B12 `feat/be/nova` (importer, endpoints, SSE). v2 used both names for the same work in different guides.
2. **B1** serves `GET /health` (container check) and `GET /api/health` (through the proxy) so the smoke test works.
3. **B14 Razorpay connector and import** (Phase 2, after the end-to-end gate): `RazorpayClient` with Basic Auth, import pipeline, four endpoints, config section `razorpay`, env vars `RAZORPAY_*`. Specified in Doc 11.
4. **B11 webhook** is now a Must after the gate (raw body, HMAC, dedupe, record-only), branch `feat/be/webhooks`.
5. The log redactor also masks `rzp_test_...`, `rzp_live_...` tokens and the Basic `Authorization` header.

## What changed in v2
1. **B12 Nova connector** (client, import pipeline, status endpoints) and **B13 Synthetic Lab** (profiles, calibrate, compare).
2. **B4 simulator** takes an optional `profileId` (calibrated parameters) and follows the JPM 7-step method.
3. **B6 engine** uses `source_settlements` as an expected-credit cross-check and takes `as_of` from the batch for Nova data.
4. **B9 metrics** builds the real-vs-synthetic comparison from stored profiles, not typed reference numbers.
5. New endpoints, config sections (`nova`, `lab`) and env vars (`NOVA_*`).

---

## 1. How the backend team works in Antigravity (steps)
1. Open the monorepo in Antigravity; one agent per branch in section 2; never two agents in one folder.
2. `git switch develop && git pull && git switch -c <branch>`.
3. Paste the shared preface, then the branch prompt (small tasks, one module each).
4. Ask the agent to run the acceptance check itself and paste evidence in the PR.
5. Review the diff. Reject hardcoded rates, categories, secrets, sample rows, string-built SQL.

**Shared preface (paste before every backend prompt)**
> You are working only in `/api` (Node, Express, TypeScript) on the branch named below. Database is PostgreSQL only (connect as the `api_app` role; never run DDL). Use parameterized SQL only. Money is integer paise (BigInt in the domain layer). `userId` and `merchantId` come only from the JWT; every query includes `merchant_id`. Nothing hardcoded: rates, tolerances, stage order, categories and thresholds come from the config snapshot. Validate every input with Zod. Return the generic error envelope with a request ID. The deterministic engine never depends on the AI service and never reads `ground_truth`. The Nova API key is read only from `NOVA_API_KEY`, is never logged, and Nova is called only from the server. Write tests for the acceptance check and run them before finishing. Keep the PR under about 300 lines.

## 2. Module map and dependencies

| # | Module | Branch | Depends on |
|---|---|---|---|
| B1 | Foundation | feat/be/foundation | feat/db/schema-core |
| B2 | Auth, roles, tenant isolation | feat/be/auth-rbac | B1 |
| B3 | Config API (versioned) | feat/be/config-api | B2, feat/db/audit-config |
| B4 | Simulator (seeded, JPM method) | feat/be/simulator | feat/db/schema-core |
| B5 | Ingestion and upload | feat/be/ingestion | B1 |
| **B12a** | **Nova client and discovery** | **feat/be/nova-client** | **B1** |
| **B12** | **Nova import and endpoints** | **feat/be/nova** | **B12a, B3, feat/db/nova** |
| B6 | Reconciliation engine | feat/be/recon-engine | B3, B4 |
| B7 | Job runner and SSE | feat/be/jobs-sse | B6 |
| B8 | Cases, decisions, read APIs | feat/be/cases | B7, feat/db/schema-recon |
| B9 | Metrics and reports | feat/be/metrics-reports | B6 |
| **B13** | **Synthetic Lab** | **feat/be/lab** | **B4, B9, B12, feat/db/lab** |
| B10 | AI proxy (Express to FastAPI) | feat/be/ai-proxy | B8 |
| B11 | Razorpay webhook (Must after G-E2E) | feat/be/webhooks | B1, feat/db/razorpay |
| **B14** | **Razorpay client and import (Phase 2)** | **feat/be/razorpay-client, feat/be/razorpay-import** | **B3, B12 pattern, feat/db/razorpay** |

Build order: B1, B2 (with DB core) then B3, B4, B5, **B12** in parallel, then B6, B7, B8, B9, **B13**, B10. **B12a starts at hour 0** because its discovery step needs the real Nova key. **B11 and B14 start only after Gate G-E2E** (Main Guide 7.1); B14 is the first thing cut if the gate is missed.

---

## 3. Module specifications

### B1. Foundation (feat/be/foundation)
- Folders `api/src/{routes,middleware,domain,services,models}` plus `api/config/` (JSON config such as `nova-mapping.json`).
- Middleware: request ID (`X-Request-Id`, echoed in errors and logs), helmet, CORS allowlist from `CORS_ORIGIN`, express-rate-limit, Zod validation helper, JSON body cap.
- `pg` Pool (size from env), graceful shutdown, `GET /health` with `SELECT 1`, **also mounted at `GET /api/health`** (public path through the proxy; used by the smoke test).
- Generic error envelope `{error:{code,message,requestId}}`; stack traces only in server logs; logger never prints secrets, auth bodies, or any `Authorization` header (add a redaction test that sends a `nova_sk_` looking string **and an `rzp_live_`/`rzp_test_` looking string**).
- **Done when:** thrown error returns the envelope with request ID and no stack in production; `/health` and `/api/health` return 200.
- **Prompt:** Create the Express TypeScript foundation in `/api` with request-ID, helmet, CORS allowlist from env, express-rate-limit, Zod validate helper, `pg` Pool with parameterized queries only, `/health` running `SELECT 1`, a generic error handler, and a log redactor that masks `Authorization` headers and any `nova_sk_...` token. No secrets or constants hardcoded.

### B2. Auth, roles, tenant isolation (feat/be/auth-rbac)
- `POST /api/auth/login|logout`, `GET /api/auth/me`. bcrypt; JWT signed with `JWT_SECRET`, claims `sub, merchantId, role`, expiry from env.
- Cookie: httpOnly, Secure, SameSite=Lax, path `/`. CSRF: require `Origin` in the allowlist and header `X-Requested-With: fin11` on every non-GET.
- `requireAuth`, `requireRole('admin')`. Every repository function takes `merchantId` and adds it to WHERE. Cross-tenant ids return 404, not 403.
- **Done when:** logged out 401; reviewer on admin route 403; other tenant's id 404; 6 fast logins 429; POST without CSRF header 403.
- **Prompt:** Implement auth in Express as above with supertest tests for 401, 403, cross-tenant 404, 429 and CSRF 403.

### B3. Config API (feat/be/config-api)
- `GET /api/config` (latest plus versions), `PUT /api/config` (admin) inserts version N+1 with `updated_by` and `change_note`. Never UPDATE.
- Zod ranges: bps 0 to 10000, tolerance at least 0, date window 0 to 60, stage keys and rounding rule from known lists, **`nova.max_reject_pct` 0 to 100, `nova.rate_limit_per_min` 1 to 110, `lab.tol_*` and `lab.ks_*` between 0 and 1, `lab.max_iterations` 1 to 20; Phase 2: `razorpay.max_reject_pct` 0 to 100, `razorpay.rate_limit_per_min` 1 to 100, `razorpay.page_size` 1 to 100, `razorpay.default_lookback_days` 1 to 365.**
- Seed default v1 per merchant (section 6). Runs and imports read the latest version at start and store a snapshot.
- **Done when:** editing fee bps creates v+1; a later run stores the new snapshot; out-of-range gives 422; reviewer gets 403.

### B4. Simulator (feat/be/simulator), the JPM generator
- `POST /api/batches/simulate` with `size, seed, feePercent, gstPercent, settlementLagDays, per-category exception rates, asOf, profileId?`. Returns `batchId`.
- If `profileId` is given, calibration parameters (fee ratio, lag histogram, amount quantiles, refund rate, payments per settlement) override the manual fields; the batch `params` record the `profileId` and its values so the run is replayable.
- Seeded PRNG (mulberry32), one stream, no `Math.random`, no `Date.now()`; same inputs give byte-identical output (unit test hashes two runs).
- Four linked sources with different identifiers each; payments grouped into settlements (one bank credit covers many payments net of fee, GST and refunds); messy bank narrations that sometimes embed the reference.
- Inject exceptions at requested rates; write hidden `ground_truth` on every internal row. Bulk insert in one transaction.
- Metric functions (`domain/metrics`) are shared with B13, so the same code scores Nova and synthetic data.
- **Done when:** same seed and profile give identical output; observed fee and failure rates match requested rates within sampling error; ground truth present on every row.
- **Prompt:** Write a seeded generator in `api/src/domain/simulator`: inputs size, seed, feePercent, gstPercent, settlementLagDays, asOf, exception rates per category, optional calibration profile. Output internal, gateway, bank, refund rows with different identifiers per source, messy narrations, one-to-many settlement grouping, injected exceptions and `ground_truth`. Integer paise only. Add a hash test of two runs. Metric functions live in `domain/metrics` and are pure.

### B5. Ingestion and upload (feat/be/ingestion)
- `POST /api/uploads/presign` returns a private S3 (MinIO locally) presigned PUT URL under `<merchantId>/`. `POST /api/batches/upload {uploadKey, sourceType}` verifies prefix, size cap, extension (`.csv` or `.json`), parses in memory.
- Zod row validation per source type. All-or-nothing: any invalid row creates no batch and returns the first 100 errors `{row, field, reason}`. Success creates a batch `source='upload'`, `ground_truth` null. `StorageAdapter` interface (S3 in prod, MinIO in dev).

### B12a. Nova client and discovery (feat/be/nova-client) NEW
Prompt N1 in the Data Guide (section 5). Delivers `NovaClient`, `FixtureNovaClient`, `nova-discover.ts`, `docs/nova-discovery.md` and the frozen `api/config/nova-mapping.json`. Merge this first.

### B12. Nova connector and import (feat/be/nova) NEW
Implements Data Guide sections 3 to 7 on top of B12a. Do that guide's step 1 to 6 (onboarding, discovery) before coding the importer.

**Endpoints**

| Method and path | Role | Purpose |
|---|---|---|
| `GET /api/nova/status` | admin | Runs Nova `/health` and `/me`; returns `{reachable, team_slot, dataset_slice, rate_limit_per_min, keyPrefix}`. `keyPrefix` is the first 16 characters only |
| `POST /api/nova/import` | admin | Body `{asOfOverride?}`; creates `nova_imports` row, starts the job, returns `importId` |
| `GET /api/nova/imports` and `/:id` | reviewer, admin | History and detail |
| `GET /api/nova/imports/:id/stream` | reviewer, admin | SSE: `resource`, `page`, `rejects`, `done`, `error` |

**NovaClient skeleton (`api/src/services/nova/NovaClient.ts`)**
```ts
const BASE = process.env.NOVA_BASE_URL ?? "https://www.aczen.in/nova-api/v1"; // always www
const KEY = process.env.NOVA_API_KEY;                                          // never logged
export class NovaError extends Error {
  constructor(public status: number, public code: string, public requestId?: string) { super(`Nova ${status} ${code}`); }
}
export class NovaClient {
  private windowStart = 0; private used = 0;
  private lastRemaining?: number; private lastReset?: number;   // from RateLimit-* response headers
  constructor(private perMin = 100) {}
  private async throttle(remaining?: number, resetSec?: number) {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) { this.windowStart = now; this.used = 0; }
    if (this.used >= this.perMin || (remaining !== undefined && remaining < 5)) {
      await sleep(Math.max(1, resetSec ?? 60) * 1000); this.windowStart = Date.now(); this.used = 0;
    }
    this.used++;
  }
  async get<T>(path: string, params: Record<string, string | number> = {}, attempt = 0): Promise<T> {
    if (!KEY) throw new NovaError(0, "nova_key_missing");
    await this.throttle(this.lastRemaining, this.lastReset);
    const url = new URL(BASE + path);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    const res = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${KEY}` } });
    this.lastRemaining = Number(res.headers.get("RateLimit-Remaining") ?? NaN);
    this.lastReset = Number(res.headers.get("RateLimit-Reset") ?? NaN);
    if (res.status === 429 && attempt < 3) { await sleep(Number(res.headers.get("Retry-After") ?? 60) * 1000); return this.get(path, params, attempt + 1); }
    if (res.status === 502 && attempt < 3) { await sleep(1000 * 2 ** attempt); return this.get(path, params, attempt + 1); }
    const body: any = await res.json();
    if (!res.ok) throw new NovaError(res.status, body?.error?.code ?? "unknown", body?.request_id);
    return body as T;
  }
  async listAll<T>(path: string, params: Record<string, string | number> = {}, onPage?: (n: number) => void): Promise<T[]> {
    const rows: T[] = [];
    for (let offset = 0; ; offset += 200) {
      const page = await this.get<{ data: T[]; pagination: { has_more: boolean } }>(path, { ...params, limit: 200, offset });
      rows.push(...page.data); onPage?.(rows.length);
      if (!page.pagination.has_more) return rows;
    }
  }
}
```
Never retry 400, 401, 404, 405 (they fall through to `NovaError`). A `FixtureNovaClient` (used only when `NODE_ENV=test`) replays recorded JSON so CI never touches the real API.

**Import job steps (pure transforms, one DB transaction at the end)**
1. Preflight `/health`, `/me`; store `team_slot`, `dataset_slice`.
2. `listAll` in the fixed order from Data Guide 6.3, saving raw rows into `nova_records`.
3. Zod-validate with `.passthrough()`; count rejects; fail the import if rejects exceed `nova.max_reject_pct`.
4. Transform through `nova-mapping.json` (`toPaise`, `toDate`); build internal/gateway/refund/bank/source-settlement rows.
5. Derive `as_of` (latest posted, captured or settlement date) unless `asOfOverride`; store `as_of_source`.
6. Insert everything and the batch (`source='nova'`) in one transaction; write counts and `request_count` to `nova_imports`.
7. Emit `done` with the `batchId`; the UI offers "Run reconciliation".

**Errors:** map `NovaError` to `502 nova_unavailable` for the admin UI with our request ID and the Nova `request_id`; never return Nova message bodies verbatim; never include the key.
**Done when:** wrong key yields 502 with no key in body or logs; a fixture import yields the expected counts and paise values; `toPaise` tests pass; the client never exceeds `perMin` in a 200-page simulation; SSE shows per-resource progress.
**Prompt:** Implement B12 per the Backend Guide: `NovaClient`, `nova-mapping.json` loader, transform functions, import job with SSE, the four endpoints, and tests with `FixtureNovaClient`. The importer must not read `payments.bank_transaction_id` into any matching field. Reviewer can read imports; only admin can start one.

### B6. Reconciliation engine (feat/be/recon-engine)
- Seven stages as pure functions `(ctx, state) => state`, no DB inside; loader uses set-based SQL, engine computes, writer saves matches, match_items, run_outcomes and exceptions in one transaction. Stage order and toggles come from the snapshot.
- Money helpers use BigInt paise. `fee = round(gross * fee_bps / 10000)`, `gst = round(fee * gst_bps / 10000)`, `expectedNet = gross - fee - gst`; rounding rule from config. For Nova batches use the **observed** fee and tax from the gateway row and compare to the configured formula (difference beyond tolerance raises `FEE_MISMATCH`).
- Stage 6 also compares each settlement's sum of expected nets with `source_settlements.net_amount_paise` (when present) and records a disagreement in the match explanation. It never overrides the bank credit comparison.
- Every run stores `config_snapshot`, `seed`, `as_of`. For Nova batches `as_of` comes from `batches.params.as_of`, never `new Date()`.
- The engine never approves an exception; it writes only status `OPEN`.
- **Done when:** unit tests pass for duplicates, partial refunds, fee mismatch, missing bank credit, timing lag, one-to-many settlement, plus a Nova fixture test; benchmark on simulated data shows 0 false approvals; a test with `ground_truth` nulled and Nova link fields stripped gives identical output.

### B7. Job runner and SSE (feat/be/jobs-sse)
- `POST /api/runs {batchId}` creates a queued run and returns `runId`. One active run per merchant, in-process queue behind a module boundary. Progress via EventEmitter keyed by run id and saved in `runs.progress`. On restart, running runs become failed (also `nova_imports`).
- `GET /api/runs/:id/stream`: `text/event-stream`, `Cache-Control: no-cache`, `X-Accel-Buffering: no`, heartbeat every 15 s, event `id:` and `Last-Event-ID`, cookie auth and tenant check. Events: `stage, recordsProcessed, matchesFound, exceptionsFound, done, error`. No polling anywhere.

### B8. Cases, decisions, read APIs (feat/be/cases)
- `GET /api/exceptions` (filters category, status, severity; order by `amount_at_risk_paise DESC`; capped page size). `GET /api/cases/:id` returns evidence, four-source timeline, fee breakdown, stored AI suggestion and, for Nova batches, the `nova_id` of each linked record.
- `POST /api/cases/:id/decision {action, rationale, expectedVersion}`: one transaction, `UPDATE exceptions SET status=$1, version=version+1 WHERE id=$2 AND merchant_id=$3 AND version=$4`; zero rows means 409 with current state; else insert `audit_log`. `ai_suggestion_shown` is copied server-side. Status machine: OPEN to APPROVED, REJECTED or ESCALATED; ESCALATED to APPROVED or REJECTED. Rationale required, trimmed, control characters stripped, length capped.
- Read APIs: `/api/batches`, `/api/runs`, `/api/transactions`, `/api/settlements(/:id)`, `/api/refunds`, `/api/audit`, `GET/POST /api/users` (admin). Pagination and merchant scoping everywhere.
- **Done when:** two concurrent decisions give one 200 and one 409; audit row has previous/new state, rationale, actor and stored AI suggestion; UPDATE on audit_log fails at the database.

### B9. Metrics and reports (feat/be/metrics-reports)
- `GET /api/metrics/:runId`: match rate, settled amount, exception counts and Amount at Risk by category, lag distribution, and the benchmark. If the batch has no labelled rows (`labelled_rows = 0`) return `benchmark: null`. Cache per runId until the run finishes.
- `GET /api/reports/:runId?format=json|csv`: CSV streams rows and prefixes any cell starting with `=`, `+`, `-`, `@`, tab or CR with a single quote.
- Real-versus-synthetic panel: read the latest `real` and `synthetic` profiles (B13); if no real profile exists return the typed `reference_metrics` labelled `"source":"typed"`.

### B13. Synthetic Lab (feat/be/lab) NEW
Implements Data Guide section 8.

| Method and path | Role | Purpose |
|---|---|---|
| `POST /api/lab/profiles {batchId}` | admin | Compute the metric catalogue for a batch; kind is `real` if batch source is `nova`, `synthetic` if `simulated`; upload batches are refused |
| `GET /api/lab/profiles` | reviewer, admin | List profiles |
| `POST /api/lab/calibrate {realProfileId}` | admin | Returns `generator_params` derived from a real profile (also stored on the profile) |
| `POST /api/lab/compare {realProfileId, syntheticProfileId}` | admin | Runs the comparator (config tolerances), stores `lab_comparisons`, returns per-metric `real, synthetic, error, verdict, parameter_hint` |
| `GET /api/lab/comparisons` | reviewer, admin | History (iteration counter, capped at `lab.max_iterations`) |

Rules: all computations use the shared metric functions; the comparator is a pure function with unit tests (identical profiles give PASS and KS 0; a 30% fee error gives FAIL and a hint naming `feePercent`); no auto-tuning loop in MVP, the admin edits parameters and re-runs.
**Prompt:** Implement B13 per the Backend Guide and Data Guide 8: profile, calibrate, compare endpoints, pure comparator with tolerances from the config snapshot, unit tests, and refusal to profile upload batches.

### B10. AI proxy (feat/be/ai-proxy)
- `POST /api/ai/explain {exceptionId}`, `/api/ai/policy-chat`, `/api/ai/brief {runId}`, `/api/ai/lab-narrative {comparisonId}`; admin: `/api/ai/reindex`, `/api/ai/eval`. Express builds a scoped evidence bundle (only the case's records, truncated, no secrets, no Nova key, no unrelated customer data, **no Nova raw payloads beyond mapped fields**) and calls FastAPI with `X-Internal-Key`.
- Timeout and one retry from env; circuit breaker; Zod-validate the response; store a valid draft in `exceptions.ai_suggestion` (bumps `version`).
- Fallback on timeout, error or invalid output: deterministic explanation with `aiAvailable:false`. Per-user rate limits on AI routes. Reindex sends policy bodies in the request.
- **Done when:** with FastAPI stopped the case page works; FastAPI without the key returns 401; invalid model output is discarded.

### B11. Razorpay webhook (feat/be/webhooks), Must after G-E2E
`POST /api/webhooks/razorpay` mounted **before** the JSON parser with `express.raw({type:"application/json", limit:"1mb"})`. Authentication is the signature only (no cookie, no CSRF header): HMAC-SHA256 of the raw body with `RAZORPAY_WEBHOOK_SECRET`, hex, compared with `X-Razorpay-Signature`; check lengths first, then `crypto.timingSafeEqual`; 401 and store nothing on mismatch or missing header. After verification: parse, read the event id and type, resolve the merchant from the payload account id via `merchants.razorpay_account_id` (unknown account: reply 200 and drop), insert into `razorpay_webhook_events` with `ON CONFLICT (event_id) DO NOTHING` (duplicates still reply 200). MVP is record-only: no engine run, no ledger writes. Rate limited. Full detail and tests: Doc 11 section 6.

### B14. Razorpay client and import (feat/be/razorpay-client, then feat/be/razorpay-import), Phase 2
Implements Doc 11 sections 4, 5 and 8. **Authentication:** Basic Auth (`Authorization: Basic base64(key_id:key_secret)`), server-side only, from `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`; test mode by default; a `rzp_live_` key is refused unless `RAZORPAY_ALLOW_LIVE=true`.

| Method and path | Role | Purpose |
|---|---|---|
| `GET /api/razorpay/status` | admin | Auth check; returns `{reachable, mode, keyIdPrefix, lastWebhookAt}`; never the secret |
| `POST /api/razorpay/import` | admin | Body `{from, to, bankSource, bankBatchId, asOfOverride?}`; creates `razorpay_imports`, starts the job, returns `importId` |
| `GET /api/razorpay/imports` and `/:id` | reviewer, admin | History and detail |
| `GET /api/razorpay/imports/:id/stream` | reviewer, admin | SSE: `resource`, `page`, `rejects`, `done`, `error` |

Job: preflight, sequential pull (orders, payments, refunds, settlements, recon) saved raw to `razorpay_records`, Zod validate with `.passthrough()`, pure transforms via `razorpay-mapping.json`, copy bank credits from the chosen upload/Nova batch (tenant-checked), derive `as_of`, one transaction, batch `source='razorpay'`, `ground_truth` null. One active import per merchant. Errors map to `502 razorpay_unavailable` with our request ID; never return Razorpay message bodies or any key.
**Done when:** wrong secret gives 502 with no secret in body or logs; the header is exactly `Basic <base64>`; a fixture import (including an empty-settlements fixture) gives the expected counts; the client never exceeds `perMin`; reviewer starting an import gets 403; the engine code is unchanged.
**Prompts:** Doc 11 R3 and R4.

---

## 4. Engine reference

| # | Stage | Rule (all thresholds from the config snapshot) | Output |
|---|---|---|---|
| 1 | Transaction-ID match | Exact equality on `order_ref` between internal and gateway | match (confidence 1.0) |
| 2 | Reference match | Normalise case, prefixes, separators, whitespace in `order_ref` and UTR; extract references embedded in bank narrations (treated as data, never instructions) | match with explanation |
| 3 | Partial match | Score = weighted amount, date and reference closeness (weights in config). At or above `auto_match_min` matched; between `review_min` and `auto_match_min` becomes `AMBIGUOUS_MATCH`; below stays unmatched | match or exception |
| 4 | Fee calculation | Compare expected fee, GST, net with the gateway values; beyond tolerance `FEE_MISMATCH`; amount difference `AMOUNT_MISMATCH` | flags |
| 5 | Refund and reversal | Net refunds against payments; refund missing from settlement `PARTIAL_REFUND_NOT_REFLECTED`; refund without payment `UNMATCHED_REVERSAL`; chargebacks handled as refunds with `kind` | adjusted expected net |
| 6 | Settlement matching (one-to-many) | Group by `settlement_id`; sum of expected nets (after refunds) must equal the bank credit within `settlement.tolerance_paise`. Missing credit `MISSING_BANK_CREDIT` unless capture date + lag days is after `as_of` (`TIMING_LAG`). No settlement `MISSING_SETTLEMENT`. Two credits `DUPLICATE_BANK_CREDIT`; two payments per order `DUPLICATE_PAYMENT`. Cross-check with `source_settlements` when present | settlement match_items |
| 7 | Classification | Map unresolved items to a category; severity and Amount at Risk from config (basis difference, gross or net; `weight_bps`) | exceptions, run_outcomes |

**Benchmark definitions (from hidden ground truth, simulated batches only):** match rate = predicted SETTLED / all internal; precision = predicted SETTLED that are truly SETTLED / predicted SETTLED; recall = predicted SETTLED that are truly SETTLED / truly SETTLED; false approvals = predicted SETTLED whose truth is an exception (target 0); category accuracy = exceptions with the right category / all true exceptions (with confusion table). "False approval" in the benchmark is a wrong SETTLED label; separately the engine never writes APPROVED.

## 5. Endpoint summary

| Method and path | Role | Module |
|---|---|---|
| POST `/api/auth/login`, `/logout`; GET `/api/auth/me` | public / any | B2 |
| POST `/api/batches/simulate` | reviewer, admin | B4 |
| POST `/api/uploads/presign`; POST `/api/batches/upload` | reviewer, admin | B5 |
| **GET `/api/nova/status`; POST `/api/nova/import`; GET `/api/nova/imports(/:id)`; GET `/api/nova/imports/:id/stream`** | **admin (status, import) / reviewer (reads)** | **B12** |
| GET `/api/batches`, `/api/runs`, `/api/runs/:id`; POST `/api/runs`; GET `/api/runs/:id/stream` | reviewer, admin | B7, B8 |
| GET `/api/exceptions`, `/api/cases/:id`; POST `/api/cases/:id/decision` | reviewer, admin | B8 |
| GET `/api/transactions`, `/settlements(/:id)`, `/refunds`, `/audit` | reviewer, admin | B8 |
| GET `/api/metrics/:runId`, `/api/reports/:runId` | reviewer, admin | B9 |
| **POST/GET `/api/lab/profiles`, POST `/api/lab/calibrate`, POST `/api/lab/compare`, GET `/api/lab/comparisons`** | **admin (writes)** | **B13** |
| GET/PUT `/api/config` | admin (PUT) | B3 |
| GET/PUT `/api/policies`, `/api/prompts` | admin (PUT) | B10 |
| POST `/api/ai/explain`, `/ai/policy-chat`, `/ai/brief`, `/ai/lab-narrative` | reviewer, admin | B10 |
| POST `/api/ai/reindex`, `/ai/eval` | admin | B10 |
| GET/POST `/api/users` | admin | B8 |
| POST `/api/webhooks/razorpay` | signature (HMAC) | B11 |
| **GET `/api/razorpay/status`; POST `/api/razorpay/import`; GET `/api/razorpay/imports(/:id)`; GET `/api/razorpay/imports/:id/stream`** | **admin (status, import) / reviewer (reads)** | **B14** |
| GET `/health`, `/api/health` | public | B1 |

Status codes: 200/201 success, 401 not logged in, 403 wrong role or CSRF, 404 not found or other tenant, 409 version conflict, 422 validation, 429 rate limit, **502 `nova_unavailable` / `razorpay_unavailable`** (upstream data providers only; AI failures never leak, the fallback is used), 500 generic.

## 6. Config v1 (seed; every value read from the snapshot)
```json
{
 "stages": [{"key":"txn_id_match","enabled":true},{"key":"reference_match","enabled":true},
   {"key":"partial_match","enabled":true},{"key":"fee_calculation","enabled":true},
   {"key":"refund_handling","enabled":true},{"key":"settlement_match","enabled":true},
   {"key":"classification","enabled":true}],
 "tolerance": {"amount_paise":100,"date_window_days":3},
 "fees": {"fee_bps":200,"gst_bps":1800,"rounding":"half_up"},
 "settlement": {"tolerance_paise":100,"lag_days":2},
 "confidence": {"auto_match_min":0.90,"review_min":0.60,"weights":{"amount":0.5,"date":0.2,"reference":0.3}},
 "categories": {
   "FEE_MISMATCH":{"severity":"medium","basis":"difference","weight_bps":10000},
   "MISSING_BANK_CREDIT":{"severity":"high","basis":"net","weight_bps":10000},
   "TIMING_LAG":{"severity":"low","basis":"net","weight_bps":2000}},
 "nova": {"max_reject_pct":2,"rate_limit_per_min":100,"as_of_override":null},
 "lab": {"tol_pass":0.10,"tol_warn":0.25,"ks_pass":0.10,"ks_warn":0.20,"max_iterations":5,"amount_model":"empirical_quantiles"},
 "razorpay": {"max_reject_pct":2,"rate_limit_per_min":60,"page_size":100,"default_lookback_days":30},
 "reference_metrics": {"fee_bps":200,"settlement_lag_days":2,"refund_rate_bps":150}
}
```
Placeholders only. Add the remaining categories (`AMOUNT_MISMATCH`, `PARTIAL_REFUND_NOT_REFLECTED`, `UNMATCHED_REVERSAL`, `MISSING_SETTLEMENT`, `DUPLICATE_BANK_CREDIT`, `DUPLICATE_PAYMENT`, `AMBIGUOUS_MATCH`) with severity and basis. `reference_metrics` is a labelled fallback only (Data Guide 10). Check current Razorpay pricing before choosing real defaults.

## 7. Environment variables (api service)

| Variable | Purpose |
|---|---|
| NODE_ENV, PORT | Runtime |
| DATABASE_URL | PostgreSQL URL for `api_app` |
| JWT_SECRET, JWT_TTL_SECONDS, COOKIE_DOMAIN | Session |
| CORS_ORIGIN | Browser origin allowlist |
| INTERNAL_KEY, AI_SERVICE_URL, AI_TIMEOUT_MS | Private FastAPI call |
| S3_BUCKET, AWS_REGION, UPLOAD_MAX_BYTES | Uploads (MinIO endpoint locally) |
| **NOVA_API_KEY** | **Nova bearer key (`nova_sk_...`); SSM in production; never in git** |
| **NOVA_BASE_URL** | **`https://www.aczen.in/nova-api/v1` (with www)** |
| **RAZORPAY_KEY_ID** | **Phase 2. `rzp_test_...` (or `rzp_live_...` only with the allow flag). Api service only** |
| **RAZORPAY_KEY_SECRET** | **Phase 2. Basic Auth password. SSM in production; never in git, logs, web or ai** |
| RAZORPAY_BASE_URL | Default `https://api.razorpay.com/v1` |
| RAZORPAY_ALLOW_LIVE | Unset by default; must be `true` to allow a live key |
| RAZORPAY_WEBHOOK_SECRET | Webhook signature verification (different from the key secret) |

`api/.env.example` holds dummy values only (`NOVA_API_KEY=nova_sk_REPLACE_ME`, `RAZORPAY_KEY_ID=rzp_test_REPLACE_ME`, `RAZORPAY_KEY_SECRET=REPLACE_ME`).

## 8. Completion checklist
- [ ] Every route has auth and role middleware; no cookie gives 401 on all protected routes
- [ ] Other tenant's ids return 404; `merchantId` never read from body or query
- [ ] CSRF guard on non-GET; login rate limit active
- [ ] All SQL parameterized (grep finds no string-built SQL)
- [ ] **`NovaClient`: GET only, www base URL, limiter, 429/502 handling, no retry on 400/401/404/405, key never logged (redaction test)**
- [ ] **Nova import: fixture import matches expected counts and paise; rejects over threshold fail the import; `as_of` derived and stored**
- [ ] **Nova key appears only in `NOVA_API_KEY` on the api service (`grep -r nova_sk_` empty in repo and image)**
- [ ] **Phase 2: `RazorpayClient` sends exactly `Basic <base64>`, blocks live keys without the flag, redaction test passes, import gives a `razorpay` batch, webhook verifies the raw-body HMAC and dedupes, reviewer gets 403 on import**
- [ ] Simulator: same seed and profile give identical output; requested rates respected
- [ ] **Lab: profiles, calibrate and compare work; comparator unit tests pass; upload batches refused**
- [ ] Upload validation returns row-level reasons; only `.csv` and `.json`; size cap enforced
- [ ] Engine: all seven stages toggle from config; run stores snapshot, seed and `as_of`; ground-truth-nulled and Nova-links-stripped tests give identical output
- [ ] One-to-many settlement match demonstrated with a real example (from Nova and from a simulated batch)
- [ ] Simulated benchmark shows match rate, precision, recall, 0 false approvals; Nova batches show `benchmark: null`
- [ ] SSE with heartbeat and reconnect for runs and Nova imports; no polling
- [ ] Decision endpoint: concurrent edits give exactly one 409; audit row includes the stored AI suggestion
- [ ] AI proxy falls back to the deterministic explanation; FastAPI without key returns 401
- [ ] CSV export neutralises formula cells; reports match dashboard numbers
- [ ] Errors generic with request ID; no stack traces or secrets in responses or logs

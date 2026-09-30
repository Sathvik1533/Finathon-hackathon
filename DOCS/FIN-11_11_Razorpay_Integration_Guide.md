# FIN-11 LedgerSense | Razorpay Integration Guide, Phase 2 (v3)

**Parent guide:** FIN-11 Main Guide (`FIN-11_0`). If they disagree, the parent wins, then raise a contract PR.
**Starts only after Gate G-E2E** (Main Guide 7.1): the Nova + simulator flow works end to end on `develop`, tagged `v0.9-e2e`.
**Touches every track:** contracts, database, backend, frontend, infra, a small AI change. Branches are listed in section 12 and in Doc 10.
**Golden rule unchanged:** deterministic first, AI second; money is integer paise; the engine is source-agnostic and is not modified for Razorpay.

---

## 1. What we are integrating, and what "auth" means

**Razorpay authentication (facts to build on).** All Razorpay APIs use HTTP **Basic Auth**: username = Key ID, password = Key Secret, sent as `Authorization: Basic <base64(key_id:key_secret)>`. The scheme word must be exactly `Basic`; variants such as `BASIC`, `basic`, `Basic "token"` or `Basic $token` fail. There are separate **Test** and **Live** key sets. The Key Secret is shown only when generated (Razorpay does not store it), keys can be regenerated if lost or exposed, and the secret must never be shared or committed. Source: Razorpay API Authentication docs (`razorpay.com/docs/api/authentication`); re-check before release because pricing and limits change.

**What we build with it (Phase 2):**
1. `RazorpayClient` in the **api** service: server-side, read-only, Basic Auth, test mode by default.
2. A fourth batch source **`razorpay`**: pull orders, payments, refunds, settlements and settlement-recon lines for a date range, transform them into our four-source tables, run the same engine.
3. A verified **webhook** receiver (`POST /api/webhooks/razorpay`): HMAC signature on the raw body with a **separate webhook secret**.
4. A Razorpay tab on **S16** (status, import, live progress, history, last webhook).

**What this is not.** It is not how users log in (that stays our JWT cookie). It is not "Sign in with Razorpay" OAuth for partner apps, and it does not create payments, refunds or payouts (we only read). If OAuth was intended, raise a contract PR before writing code (Main Guide D-R3).

---

## 2. Preconditions and human steps

| # | Step | Who | Detail |
|---|---|---|---|
| 1 | Gate G-E2E passed and `v0.9-e2e` tagged | Lead | Main Guide 7.1 |
| 2 | Create a Razorpay account and stay in **Test mode** | Lead | Razorpay Dashboard |
| 3 | Generate **Test** API keys | Lead/Backend | Dashboard → Settings → API Keys → Generate Key (Test mode selected). Download the pair immediately: the secret is not shown again |
| 4 | Put keys in `api/.env` only | Backend | `RAZORPAY_KEY_ID=rzp_test_REPLACE_ME`, `RAZORPAY_KEY_SECRET=REPLACE_ME`. Never in web, ai, git, chat, logs |
| 5 | Create some test data | Lead | Create orders and test payments (test checkout or API) and at least one refund, so the import has rows |
| 6 | Create a webhook in the Dashboard | Infra + Lead | URL `https://<domain>/api/webhooks/razorpay` (needs the deployed HTTPS URL, or a temporary tunnel for local work); choose a **webhook secret** different from the API key secret; subscribe to payment, refund and settlement events; store the secret as `RAZORPAY_WEBHOOK_SECRET` |
| 7 | Live mode | Lead | Not in the MVP. Live keys require `RAZORPAY_ALLOW_LIVE=true` in the api env and a Lead-approved contract PR |

**Community-reported caveat (verify in step R3 discovery):** in test mode no real money moves, so the settlement-recon endpoint may return zero settlements. That is an expected result, not an error. The demo plan for that case is decision **D-R4** (section 13).

---

## 3. Design decisions

| Topic | Decision |
|---|---|
| Batch source | `batches.source = 'razorpay'`; `ground_truth` stays null; benchmark shows "not available"; say "exception rate observed", never "accuracy" |
| Engine | Unchanged. Uses observed fee and tax from the gateway rows like Nova batches; `as_of` comes from `batches.params.as_of` |
| `as_of` | `max(latest settlement date, latest payment created_at, latest refund created_at)` from the imported data unless an admin overrides; never `new Date()` |
| Credentials | Environment-level single key pair for the hackathon (D-R2). Per-merchant encrypted credentials are a stretch |
| Mode safety | Client reads the key ID prefix: `rzp_test_` means test, `rzp_live_` means live. Live is refused unless `RAZORPAY_ALLOW_LIVE=true` |
| Bank side | Razorpay does not expose the merchant's bank statement. A Razorpay batch therefore needs **bank credits from elsewhere** (D-R1): default is an uploaded bank CSV; alternative is copying credits from a completed Nova import. The import dialog requires one of the two |
| Direction | Read-only. We never call a Razorpay POST/PATCH/DELETE endpoint |
| Rate limits | Configurable limiter (`razorpay.rate_limit_per_min`, default conservative 60); honor `429` and `Retry-After`. Check Razorpay's current limits before raising it |

### 3.1 Mapping (field names marked `verify` must be confirmed by discovery step R3 and then frozen in `api/config/razorpay-mapping.json`)

| Our table | Razorpay resource | Key mapping | Notes |
|---|---|---|---|
| `internal_txns` | `GET /v1/orders` | `internal_id` = `receipt` (your own reference; fallback order id); `order_ref` = order `id`; `amount_paise` = `amount`; `created_at` = `created_at` (unix seconds) | Orders carry the merchant's own receipt, which is the closest thing to an internal record (`verify`) |
| `gateway_txns` | `GET /v1/payments` | `gateway_payment_id` = `id` (`pay_...`); `order_ref` = `order_id`; `amount_paise` = `amount`; `fee_paise` = `fee`; `tax_paise` = `tax`; `status`; `captured_at`; `bank_rrn` from acquirer data if present (`verify`) | Amounts are integers in paise, no float conversion; still `z.number().int()` |
| `gateway_txns.settlement_id` | `GET /v1/settlements/recon/combined` | `entity_id` (payment id) → `settlement_id` per line (`verify`) | Also gives per-line `fee`, `tax`, `debit`, `credit`, `settled`, `settled_at` |
| `refunds` | `GET /v1/refunds` | `refund_id` = `id` (`rfnd_...`); `gateway_payment_id` = `payment_id`; `amount_paise`; `status`; `created_at`; `kind = 'refund'` | Chargebacks/disputes are out of scope for Phase 2 |
| `source_settlements` | `GET /v1/settlements` | `settlement_ref` = `id` (`setl_...`); `net_amount_paise` = `amount`; `utr` (`verify`); dates; status | `utr` here should equal the bank credit's `utr`, which helps stage 2 and 6 |
| `bank_credits` | not from Razorpay | copied from the upload batch or Nova batch chosen at import time | D-R1 |

Pagination style: Razorpay list endpoints use `count` (page size, max 100) and `skip`, and time filters `from`/`to` as unix seconds (`verify` in discovery). The recon endpoint takes `year`, `month`, optional `day` (`GET /v1/settlements/recon/combined`).

---

## 4. `RazorpayClient` (api/src/services/razorpay/RazorpayClient.ts)

```ts
const BASE = process.env.RAZORPAY_BASE_URL ?? "https://api.razorpay.com/v1";
const KEY_ID = process.env.RAZORPAY_KEY_ID;          // rzp_test_... or rzp_live_...
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;  // never logged, never returned
export class RazorpayError extends Error {
  constructor(public status: number, public code: string, public requestId?: string) { super(`Razorpay ${status} ${code}`); }
}
export type Mode = "test" | "live";
export function modeOf(id: string): Mode {
  if (id.startsWith("rzp_test_")) return "test";
  if (id.startsWith("rzp_live_")) return "live";
  throw new RazorpayError(0, "razorpay_key_format");
}
export class RazorpayClient {
  private windowStart = 0; private used = 0;
  constructor(private perMin = 60) {
    if (!KEY_ID || !KEY_SECRET) throw new RazorpayError(0, "razorpay_key_missing");
    if (modeOf(KEY_ID) === "live" && process.env.RAZORPAY_ALLOW_LIVE !== "true") throw new RazorpayError(0, "razorpay_live_blocked");
  }
  private authHeader() {                                   // exact scheme word: "Basic"
    return "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
  }
  private async throttle() { /* same window logic as NovaClient, limit = perMin */ }
  async get<T>(path: string, params: Record<string, string | number> = {}, attempt = 0): Promise<T> {
    await this.throttle();
    const url = new URL(BASE + path);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    const res = await fetch(url, { method: "GET", headers: { Authorization: this.authHeader() } });
    if (res.status === 429 && attempt < 3) { await sleep(Number(res.headers.get("Retry-After") ?? 30) * 1000); return this.get(path, params, attempt + 1); }
    if (res.status >= 500 && attempt < 3) { await sleep(1000 * 2 ** attempt); return this.get(path, params, attempt + 1); }
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new RazorpayError(res.status, body?.error?.code ?? "unknown", res.headers.get("x-razorpay-request-id") ?? undefined);
    return body as T;
  }
  async listAll<T>(path: string, params: Record<string, string | number> = {}, pageSize = 100, onPage?: (n: number) => void): Promise<T[]> {
    const rows: T[] = [];
    for (let skip = 0; ; skip += pageSize) {
      const page = await this.get<{ items: T[]; count: number }>(path, { ...params, count: pageSize, skip });
      rows.push(...page.items); onPage?.(rows.length);
      if (page.items.length < pageSize) return rows;
    }
  }
}
```
Rules: GET only; never retry 400, 401, 404; the Authorization header and both key values are redacted by the logger (extend the B1 redactor with `rzp_(test|live)_[A-Za-z0-9]+` and the header name); errors are mapped to `502 razorpay_unavailable` with our request ID and never echo Razorpay's message body; a `FixtureRazorpayClient` (used when `NODE_ENV=test`) replays recorded JSON so CI never calls Razorpay. (`verify` in discovery: the request-id header name and the list envelope `items`/`count`.)

---

## 5. Import pipeline (B14, `feat/be/razorpay-import`)

Same shape as the Nova import so the UI and SSE hook are reused.

1. **Preflight:** confirm key present and mode allowed; one cheap authenticated call (for example `GET /orders?count=1`) to prove the credentials; store `mode` and `key_id_prefix` (first 12 characters only).
2. **Create** `razorpay_imports` (`queued`), return `importId`; progress over SSE (events `resource`, `page`, `rejects`, `done`, `error`). One active import per merchant.
3. **Pull sequentially:** orders, payments, refunds, settlements, settlement recon (by month/day covering the range). Save each raw row to `razorpay_records`.
4. **Validate** with Zod (`.passthrough()`), rejects `{resource, id, field, reason}`; fail if rejects exceed `razorpay.max_reject_pct`.
5. **Transform** with pure functions and `razorpay-mapping.json` (unix seconds to `timestamptz`; integer paise validated, no float math).
6. **Bank credits:** copy from the chosen upload or Nova batch (tenant-checked: same `merchant_id`), into the new batch.
7. **Insert** in one transaction: batch `source='razorpay'`, all rows, `params` = `{as_of, from, to, mode, bankBatchId}`.
8. **Derive `as_of`** (section 3) unless overridden; store `as_of_source`.
9. **Done:** counts, request count, duration; emit `done` with `batchId`; UI offers "Run reconciliation".

Empty results are valid: zero settlements in test mode produces a batch whose settlement side is empty; the run report states this plainly.

---

## 6. Webhook receiver (B11, `feat/be/webhooks`), now a Must after G-E2E

- Route `POST /api/webhooks/razorpay`, mounted **before** the JSON parser with `express.raw({type: "application/json", limit: "1mb"})`. No cookie auth, no CSRF header (Razorpay cannot send them); the signature is the authentication.
- Verify: `expected = HMAC_SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)` (hex) compared with header `X-Razorpay-Signature`. Compare lengths first, then `crypto.timingSafeEqual` (it throws on unequal lengths). Mismatch or missing header: `401`, store nothing.
- Only after verification: parse JSON, read the event id (header `X-Razorpay-Event-Id`, `verify`) and event type, resolve the merchant from the payload's account id via `merchants.razorpay_account_id`. Unknown account: respond `200` and drop it (log only), so Razorpay does not retry forever.
- Dedupe: `INSERT ... ON CONFLICT (event_id) DO NOTHING`; a duplicate still returns `200`.
- MVP behaviour: **record only** (`razorpay_webhook_events`). No automatic engine runs, no writes to ledger tables. The S16 tab shows "last webhook received".
- Rate limit the route and respond quickly (Razorpay expects a fast 2xx).
- Tests: valid signature accepted; one flipped byte rejected; missing header rejected; duplicate id ignored; body larger than the cap rejected.

---

## 7. Database (branch `feat/db/razorpay`)

Migrations **0010** and **0011**. Same rules as Doc 2: plain SQL, node-pg-migrate markers, never edit a merged migration.

```sql
-- 0010_razorpay.sql  Up Migration
ALTER TABLE batches DROP CONSTRAINT batches_source_check;
ALTER TABLE batches ADD CONSTRAINT batches_source_check
  CHECK (source IN ('simulated','upload','nova','razorpay'));

ALTER TABLE merchants ADD COLUMN razorpay_account_id text;
CREATE UNIQUE INDEX merchants_razorpay_account_uq ON merchants (razorpay_account_id)
  WHERE razorpay_account_id IS NOT NULL;

CREATE TABLE razorpay_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  batch_id uuid REFERENCES batches(id),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed')),
  mode text NOT NULL CHECK (mode IN ('test','live')),
  key_id_prefix text NOT NULL,                    -- first 12 characters of the Key ID only
  date_from timestamptz NOT NULL, date_to timestamptz NOT NULL,
  bank_source text NOT NULL CHECK (bank_source IN ('upload','nova')),
  bank_batch_id uuid NOT NULL REFERENCES batches(id),   -- source of the bank credits (same merchant, checked in code)
  as_of date, as_of_source text CHECK (as_of_source IN ('derived','override')),
  resource_counts jsonb NOT NULL DEFAULT '{}',
  request_count int NOT NULL DEFAULT 0, reject_count int NOT NULL DEFAULT 0,
  progress jsonb NOT NULL DEFAULT '{}', error text,       -- our code + Razorpay request id, never the key
  created_by uuid REFERENCES users(id),
  started_at timestamptz, finished_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX razorpay_imports_merchant_idx ON razorpay_imports (merchant_id, created_at DESC);

CREATE TABLE razorpay_records (
  import_id uuid NOT NULL REFERENCES razorpay_imports(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  resource text NOT NULL, rzp_id text NOT NULL, payload jsonb NOT NULL,
  PRIMARY KEY (import_id, resource, rzp_id));

CREATE TABLE razorpay_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  event_id text NOT NULL, event_type text NOT NULL, account_id text,
  payload jsonb NOT NULL, received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id));                              -- only verified events are stored
CREATE INDEX razorpay_events_merchant_idx ON razorpay_webhook_events (merchant_id, received_at DESC);

ALTER TABLE internal_txns      ADD COLUMN razorpay_id text;
ALTER TABLE gateway_txns       ADD COLUMN razorpay_id text;
ALTER TABLE refunds            ADD COLUMN razorpay_id text;
ALTER TABLE source_settlements ADD COLUMN razorpay_id text, ADD COLUMN utr text;
-- Down Migration  (dev only; production rollback = restore the pre-migration snapshot)
ALTER TABLE source_settlements DROP COLUMN utr, DROP COLUMN razorpay_id;
ALTER TABLE refunds DROP COLUMN razorpay_id;
ALTER TABLE gateway_txns DROP COLUMN razorpay_id;
ALTER TABLE internal_txns DROP COLUMN razorpay_id;
DROP TABLE razorpay_webhook_events, razorpay_records, razorpay_imports;
DELETE FROM runs WHERE batch_id IN (SELECT id FROM batches WHERE source = 'razorpay');
DELETE FROM batches WHERE source = 'razorpay';
DROP INDEX merchants_razorpay_account_uq;
ALTER TABLE merchants DROP COLUMN razorpay_account_id;
ALTER TABLE batches DROP CONSTRAINT batches_source_check;
ALTER TABLE batches ADD CONSTRAINT batches_source_check CHECK (source IN ('simulated','upload','nova'));
```
```sql
-- 0011_grants_razorpay.sql  Up Migration (runs as migrator)
GRANT SELECT, INSERT, UPDATE ON razorpay_imports TO api_app;
GRANT SELECT, INSERT ON razorpay_records, razorpay_webhook_events TO api_app;   -- no UPDATE, no DELETE
-- ai_service gets nothing: it must never read Razorpay data
-- Down Migration
REVOKE ALL ON razorpay_imports, razorpay_records, razorpay_webhook_events FROM api_app;
```
Retention: `razorpay_records` and old webhook events are purged by the release script as `migrator` (extend `purge-nova-records.sh` into `purge-provider-records.sh`; Doc 6).

**Acceptance (psql):** a `razorpay` batch inserts, an invalid source fails; `api_app` cannot DELETE from `razorpay_records`; `ai_service` cannot SELECT any `razorpay_*` table; a duplicate `event_id` is rejected by the constraint; Down then Up is clean.

---

## 8. Backend surface (Doc 3, B14 and B11)

| Method and path | Role | Purpose |
|---|---|---|
| `GET /api/razorpay/status` | admin | Auth check; returns `{reachable, mode, keyIdPrefix, lastWebhookAt}`; never the secret |
| `POST /api/razorpay/import` | admin | Body `{from, to, bankSource: "upload"\|"nova", bankBatchId, asOfOverride?}`; returns `importId` |
| `GET /api/razorpay/imports`, `/:id` | reviewer, admin | History and detail |
| `GET /api/razorpay/imports/:id/stream` | reviewer, admin | SSE progress |
| `POST /api/webhooks/razorpay` | signature | Section 6 |

Config (added to config v1, editable by admin, Zod ranges): `"razorpay": {"max_reject_pct": 2, "rate_limit_per_min": 60, "page_size": 100, "default_lookback_days": 30}` with `max_reject_pct` 0 to 100, `rate_limit_per_min` 1 to 100, `page_size` 1 to 100, `default_lookback_days` 1 to 365. The live-mode switch is **not** in config; it is the environment variable only.

Env (api only): `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_BASE_URL` (default `https://api.razorpay.com/v1`), `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_ALLOW_LIVE` (default unset).

---

## 9. Frontend (branch `feat/fe/sources-razorpay`, extends S16)

- Second tab **Razorpay** beside **Nova** on `/app/sources`.
- **Status card:** reachable, mode badge (`TEST` prominent; `LIVE` in a warning style), key ID prefix, last webhook time. Never a secret.
- **Import dialog (admin):** date range (Zod: `from <= to`, at most 365 days), bank credits source select (upload batch or Nova batch, listing existing batches of that source), optional as-of override, the text "Razorpay is read-only; nothing is written to Razorpay", button **Import from Razorpay**.
- **Live progress** with the same `useSSE` hook; history table with **Run reconciliation**.
- `SourceBadge` gains `Razorpay`. Benchmark panel shows "not available" for it.
- Development uses the Prism mock from the OpenAPI contract; the browser never talks to Razorpay.

---

## 10. Infra and secrets (branch `feat/infra/razorpay`)

- SSM SecureString under `/fin11/prod/api/`: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_BASE_URL`, `RAZORPAY_WEBHOOK_SECRET`. **Nothing under `/fin11/prod/ai/` and nothing in web or GitHub secrets.**
- Egress check from the box: `curl -sS -o /dev/null -w '%{http_code}' https://api.razorpay.com/v1/` returns an HTTP status (any 4xx proves reachability without a key).
- gitleaks: add to `.gitleaks.toml`
  ```toml
  [[rules]]
  id = "razorpay-key-id"
  description = "Razorpay key id"
  regex = '''rzp_(test|live)_[A-Za-z0-9]{10,}'''
  [[rules]]
  id = "razorpay-key-secret-assignment"
  description = "Razorpay key secret assigned in a file"
  regex = '''RAZORPAY_(KEY_SECRET|WEBHOOK_SECRET)\s*[=:]\s*['"]?[A-Za-z0-9_\-]{16,}'''
  ```
  with `rzp_test_REPLACE_ME` and `REPLACE_ME` allow-listed. (The secret has no fixed prefix, so this rule is a heuristic; it does not replace review.)
- Smoke test additions: `/api/razorpay/status` logged out returns 401; `POST /api/webhooks/razorpay` with a bad signature returns 401.
- Caddy: no change needed (the webhook lives under `/api/*`); the raw body must reach Express untouched (no compression or rewriting).
- CloudWatch metric filter alarm if logs ever contain `rzp_live_` or `rzp_test_` followed by a secret-like token.
- Cleanup after demo: regenerate or deactivate the Razorpay test keys, delete the webhook in the Dashboard, purge `razorpay_records`.

---

## 11. AI service (branch `feat/ai/source-razorpay`, tiny)

The AI service never gets a Razorpay key or calls Razorpay. Only these changes: the run brief (F4) and case explanation accept `source: "razorpay"`; the brief states the source and never claims accuracy; benchmark fields null mean "not available". Add one pytest for the brief with `source=razorpay`.

---

## 12. Branches and prompts (paste after the track's shared preface)

Order: R1 → (R2 ∥ R3) → R4 → R5 → (R6 ∥ R7 ∥ R8). Full branch table in Doc 10.

| ID | Branch | Prompt |
|---|---|---|
| R1 | `feat/contracts/razorpay` | Add to `/contracts/openapi.yaml`: `GET /api/razorpay/status`, `POST /api/razorpay/import`, `GET /api/razorpay/imports`, `GET /api/razorpay/imports/{id}`, `GET /api/razorpay/imports/{id}/stream`, `POST /api/webhooks/razorpay` (raw body, `X-Razorpay-Signature` header), the `razorpay` batch source value, and the config `razorpay` section. Regenerate the typed client and the Prism mock. |
| R2 | `feat/db/razorpay` | Create `0010_razorpay.sql` and `0011_grants_razorpay.sql` exactly as in Doc 11 section 7. Prove: a `razorpay` batch inserts, invalid source fails, `api_app` cannot DELETE `razorpay_records`, `ai_service` cannot read any `razorpay_*` table, duplicate `event_id` fails, Down/Up repeat cleanly. |
| R3 | `feat/be/razorpay-client` | Create `RazorpayClient` and `FixtureRazorpayClient` as in Doc 11 section 4, plus `api/scripts/razorpay-discover.ts` that fetches `count=3` from each resource and writes field names and types to `docs/razorpay-discovery.md` (no key, no more than 3 sample rows). Extend the log redactor. Tests: header format is exactly `Basic <base64>`, live key blocked without `RAZORPAY_ALLOW_LIVE`, no retry on 400/401/404, 429 honors `Retry-After`, secret never appears in logs or errors. Then freeze `api/config/razorpay-mapping.json` from the discovery output. |
| R4 | `feat/be/razorpay-import` | Implement B14 per Doc 11 sections 5 and 8: import job, pure transforms from `razorpay-mapping.json`, bank-credit copy with tenant check, `as_of` derivation, four endpoints, SSE, tests with the fixture client (including an empty-settlements fixture). The engine must not change. |
| R5 | `feat/be/webhooks` | Implement the webhook per Doc 11 section 6 with the five listed tests. Record only. |
| R6 | `feat/fe/sources-razorpay` | Extend `/app/sources` with the Razorpay tab per Doc 11 section 9 against the Prism mock, then the real API. Render every server string as plain text; never show more than the key ID prefix. |
| R7 | `feat/infra/razorpay` | Add SSM parameters, gitleaks rules, smoke-test lines, egress check and purge script extension per Doc 11 section 10. |
| R8 | `feat/ai/source-razorpay` | Per Doc 11 section 11. |

---

## 13. Open decisions (Lead answers before R4 starts)

| # | Question | Default |
|---|---|---|
| D-R1 | Where do bank credits come from for a Razorpay batch? | An uploaded bank CSV (works for every team); alternative is copying from a Nova import |
| D-R2 | One environment-level key pair or per-merchant credentials? | Environment-level for the hackathon |
| D-R3 | Does "Razorpay auth" also mean OAuth partner sign-in? | No |
| D-R4 | If test mode returns zero settlements, what does the demo show? | Show the honest result (empty settlement side, `MISSING_SETTLEMENT` exceptions explained in the run report) **and** run the same flow on the Nova batch for the settlement story. Do not fabricate settlements |

---

## 14. Acceptance checks

| Check | Expected |
|---|---|
| Status with correct test keys | `reachable: true`, `mode: "test"`, only the 12-character key ID prefix |
| Status with a wrong secret | Our `502 razorpay_unavailable` with request ID; no secret anywhere in body or logs |
| Live key without `RAZORPAY_ALLOW_LIVE` | Refused at startup/first call |
| Import of a test date range | `razorpay_imports.status=done`, counts per resource, batch source `razorpay`, `ground_truth` null |
| Run on that batch | Runs like any other; benchmark `null` |
| Webhook: valid signature | 200, one row in `razorpay_webhook_events` |
| Webhook: one flipped byte, missing header, duplicate id | 401, 401, 200 with no second row |
| Reviewer starts an import | 403 |
| `grep -r "rzp_live_"` and secret patterns over repo, images, logs | Nothing |
| `ai` service | No Razorpay variable, no Razorpay traffic |

## 15. Completion checklist
- [ ] Contract PR merged (R1) and the Prism mock updated
- [ ] Migrations 0010 and 0011 merged; Down/Up verified; grants proven
- [ ] `RazorpayClient`: Basic header exact, test/live gate, limiter, retries, redaction tests
- [ ] `docs/razorpay-discovery.md` committed and `razorpay-mapping.json` frozen
- [ ] Import produces a `razorpay` batch with derived `as_of`; empty-settlement case handled
- [ ] Webhook: raw body, timing-safe compare, dedupe, record-only
- [ ] S16 Razorpay tab with TEST banner; only key ID prefix displayed; reviewer read-only
- [ ] SSM parameters, gitleaks rules, smoke tests, egress check done
- [ ] Brief for a Razorpay run states the source and makes no accuracy claim
- [ ] Demo step 11 rehearsed; D-R1 to D-R4 answered in writing

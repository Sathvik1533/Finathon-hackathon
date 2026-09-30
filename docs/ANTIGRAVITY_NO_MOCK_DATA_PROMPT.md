# Antigravity prompt — verified live data, no mock UI

**Copy/paste everything inside the prompt block into Antigravity.** This is an implementation contract, not permission to deploy.

---

## PROMPT

You are working on **LedgerSense** in `Sathvik1533/Finathon-hackathon`. Deliver a complete, honest, responsive reconciliation product—not a screenshot-only redesign and not a demo that looks live.

### The non-negotiable goal

Make the product work end to end on **verified, dynamically fetched and persisted source data**. Never invent, seed, randomize, or silently fall back to transaction rows, amounts, rates, match results, charts, notifications, merchant identities, bank/GSTIN details, or “connected/success” status. A passing build or fixture-based test does not prove live data works.

**Test fixtures are allowed only inside isolated unit/integration tests or an explicit local-only demo mode.** They must never be returned by a production adapter, bundled as production UI examples, or labelled as Nova/live data. Do not implement a “mock response handler” as a substitute for the provider.

If an essential credential, data source, provider permission, or API contract is unavailable, stop that part safely: show a clear `Not configured`/`Unavailable` state, list the exact blocker, and ask the owner to configure the credential privately. Do not fake completion to avoid a blocker.

### First: verify the actual source and branch

1. Read `docs/ANTIGRAVITY_REBUILD_BRIEF.md`, `docs/NOVA_API_USAGE.md`, `docs/fin11/FIN-11_1_Data_Guide_Nova_and_Synthetic.md`, `docs/fin11/FIN-11_3_Backend_Guide.md`, `docs/fin11/FIN-11_5_Frontend_Guide.md`, [`docs/LEDGERSENSE_HANDOFF.md`](LEDGERSENSE_HANDOFF.md), and [`ideas.md`](../ideas.md). Inspect the real checked-out branch and current source; these documents are requirements, not proof that code exists.
2. Verify the **current official Nova/Aczen API documentation** and exact host, auth scheme, permissions, routes, pagination, limits, response schema, and provenance. Do not guess fields currently marked “discover” in the FIN-11 guide. Record which source supplies orders, which supplies gateway captures/fees, and which supplies bank credits. If Nova does not supply one of those streams, configure and implement that real source separately; never manufacture the missing stream.
3. Current-state warning from 2026-10-01: the publicly reviewed `main` and `develop` refs were both at `acd14bd`; the open review branch `fix/security-remove-active-credentials` was at `a0d4950`. Antigravity's latest claims about `api/src/test_nova.ts`, `api/src/test_full_system.ts`, `/api/reconcile/analytics`, and `/api/notifications/read` were **not present on any of those three remote refs when checked**. They may exist in Antigravity's uncommitted local workspace; verify the files, routes and commit SHA before saying they are done. Do not treat a status message as source code or runtime proof.
4. The public static `web/index.html` previously referenced different/older bundle hashes than the Vite source build. A repository-root build now compiles and synchronizes the `frontend/` app into `web/`. The Vercel project must build from the **repository root (`.`), not `web/`**, and must have `VITE_API_BASE` set to the verified backend origin. This task has no permission to change production settings or deploy.

### Data architecture and source truth

- The default source state is `unconfigured`. A source is `live/connected` only after a real, server-side authenticated request succeeds—not because a key is non-empty, `/health` returns 200, or fixtures exist.
- Keep `NOVA_API_KEY`, database credentials and signing secrets in private API-host variables only (for example Railway). Never put them in chat, prompts, Git, browser storage, query strings, `VITE_*`, logs, screenshots, or error payloads.
- Build the Nova adapter on the provider's verified contract. Use bounded timeouts, pagination, rate-limit/backoff, schema validation, idempotency, safe/redacted errors and structured provenance. Do not log raw customer data or authorization headers.
- Import actual records into PostgreSQL with source, source record ID, batch/import ID, imported time, provider as-of time, source/dataset label, accepted/rejected counts and the rule/config version. Prevent duplicates and detect malformed records. Never claim durable persistence if the application only wrote to memory.
- After an import, query the persisted database rows through LedgerSense API endpoints. Reconciliation must consume those persisted source rows; each result must be traceable back to a real source row, selected import/run and rule version. Keep money exact internally (integer paise/decimal database types) and format only for display.
- If any required stream is missing, the reconciliation run must be blocked or explicitly partial according to a documented rule. **Do not count missing feeds as zero, “matched,” balanced, low-risk, or 100% success.** Return a typed unavailable response (for example HTTP 503 with a stable source state), not an empty-success response.
- Preserve the user's working deployed integration if a verified connection exists. Before changing its endpoint/auth/schema, capture a safe baseline and make a staging read-only request. Do not overwrite an existing working connector based only on this brief.

### Required end-to-end behaviors

Implement and verify each item against the actual code/API; if a backend route is absent, implement it fully on persisted source data or label the feature unavailable. Do not stub the browser response.

1. **Connection and import:** status distinguishes `unconfigured`, `unreachable`, `unauthorized`, `authenticated`, `importing`, `imported`, and `persistence_error` (or an equally explicit contract). A real import returns a batch ID and real counts; import history is retained. Status includes verified-at/freshness metadata without exposing secrets.
2. **Feeds:** payments/orders, gateway transactions and bank credits displayed by the app come from persisted API results. Include source and as-of time. Rows shown in the UI must be traceable to a real imported batch; no fixed `ORD-101`–`ORD-104`, `pay_001`, Acme merchant, bank, GSTIN, or embedded provider examples in production.
3. **Reconciliation and timeline:** triggering a run invokes the real backend against the chosen persisted source batches. The run reports actual processed/matched/discrepancy counts and rule version. Timeline links records by verified references and shows missing counterpart records as missing—not synthesized.
4. **Calendar and charts:** date/period controls update the URL/query and cause the API to query persisted runs/records for exactly that selection. Charts plot only API-returned bucket data; accompanying accessible summaries/table values agree with the graph. If the API has no matching data, show an empty state; if unsupported, remove/disable the control with an explanation. Never invent paths, bar heights, trends, growth percentages or totals.
5. **Settlements:** match actual settlement batches to actual bank credits. Missing bank data stays unknown/unmatched, not `₹0`, zero variance, or balanced. Preserve source IDs and show how totals derive from included rows.
6. **Exceptions:** queue items are actual discrepancy records. Decisions are persisted by the backend with actor, timestamp and rationale; on error keep the item unresolved and show the error. Do not claim immutable/tamper-proof audit unless the storage guarantees this.
7. **Notifications:** render persisted server events only. If no real notification source exists, remove the bell/count or show a genuinely empty state with no unread dot. Read/unread state must persist and each item must navigate to its own supported record.
8. **Reports/exports:** generate from the selected persisted run, with the same totals as the UI. Do not emit fallback CSV or fixed 100%/zero-fraud/false-approval claims.
9. **Authentication/logout:** no auto-login, hard-coded production user, fake offline token, or query-string token. On sign-out revoke the real session where supported, clear client data/query cache, replace-route to `/login`, and remain signed out after refresh/back. The user reported “Sign Out → Merchant Details”; reproduce on the live/staging build and add a regression test. Do not fabricate merchant details: the current account API does not supply merchant name, tax ID or bank details.
10. **Routing:** `/` is the public product landing page explaining in plain language that LedgerSense compares order, gateway and bank records and surfaces differences for review. All valid routes survive direct URL entry/refresh. Invalid routes show a real 404, not dashboard/merchant redirects.

### Visual/product requirements — desktop and mobile

- Follow `ideas.md`: authored editorial-finance look; Newsreader for display headlines, Instrument Sans for interface/body, IBM Plex Mono only for IDs and tabular values; warm neutral canvas, ink/slate text, restrained forest action color and semantic amber/rust; disciplined spacing, thin dividers, low-elevation surfaces. No default-looking type stack, generic fintech template, gradients, glowing live dots, glass cards, stacked rounded-card walls, stock dashboard photos, microtype, or decorative “AI” labels.
- **Desktop:** one persistent navigation rail, one compact top bar, one work area; clear queue/evidence/action hierarchy; financial data aligned with tabular numerals.
- **Phone:** treat the site as a mobile-native responsive web app (not a claim that an iOS/Android app exists). Use a compact top bar, safe-area-aware bottom navigation, touch targets at least 44×44 CSS px, secondary-route sheet, mobile-readable account/action sheets, and stacked labeled records when column comparison does not work. No clipped controls, desktop sidebar shrunk to phone width, or horizontal page overflow.
- Test a narrow phone viewport (390×844) and desktop (1440×900), keyboard focus, Escape-to-close, reduced-motion, text zoom, loading/empty/error/stale/permission-denied states and route refresh. Capture screenshots of the **actual tested build**, not a mock or design canvas.

### Required tests and proof (separate fixture tests from live proof)

1. Run unit tests using deterministic test-only HTTP/repository adapters. Assert that fixtures cannot be selected in `NODE_ENV=production`.
2. Run integration tests for provider parsing/pagination/backoff and the real database/repository behavior. Fixtures may drive tests but must be named as fixtures and never be represented as a successful provider import.
3. Add a no-source test: with default `NOVA_MODE=unconfigured`, status reports unconfigured; feed/reconcile/report routes do not return success/empty-balanced; they return an explicit unavailable state.
4. Add a staging smoke test using credentials already configured privately by the owner: verify authenticated provider metadata, perform a small read-only fetch, import into staging PostgreSQL, query the saved rows through LedgerSense, restart the service and verify the same batch/counts/provenance survive. Print only safe status/counts/IDs; redact keys and payloads. If no credential is available, mark this acceptance **blocked**, not passed.
5. Add browser E2E for desktop and phone flows listed above, including calendar query change, real chart values, payment rows, notifications, sign-out/back/refresh, direct routes, error/empty states and no horizontal overflow.
6. Search production source and built assets for fixture IDs, sample merchants, fixed financial values, mock/fallback handlers, false success labels and fake dates. Explain every remaining match (test-only source or explicitly labelled demo). Assert no test credentials/secrets were bundled.
7. Run the repository-root `npm run build`, API unit/E2E suites and frontend build. Verify the fresh `web/index.html` references the assets from `frontend/dist` and the build did not copy source maps. Inspect Vercel preview behavior only if the preview is authorized and configured; do not deploy production here.

### Acceptance: do not claim “complete” unless

- A real authenticated upstream read and a database-persisted import were observed in staging, with a batch ID and counts that survive restart.
- Real source rows flow through the API → UI → reconciliation → exception/report paths, with matching provenance and without mocks.
- Calendar, charts, ledger, settlement and notifications respond to real persisted data and query selections.
- Logout and routing regressions pass in a browser.
- Desktop and phone browser checks pass on the actual build.
- Test reports clearly separate deterministic test-fixture coverage from live staging proof.

If a live credential or source is missing, finish all safe source/UI work, leave the production source as `unconfigured`, and report the blocker and exact safe setup step. **Do not invent sample rows or say “full dynamic data” is complete.**

### Branch, release and final report

- Work only on a review feature branch and update the existing PR. Do **not** push directly to `main` or `develop`, merge, rewrite history, use a deployment claim/authorization link, or deploy production unless the owner gives new, explicit approval after seeing the exact target and release plan.
- Do not claim “6/6 Nova tests” or “7/7 E2E means live” without naming test command, test code and whether it used fixtures, a stub HTTP server, a real provider or persisted staging DB.
- At completion report: exact branch/commit/PR; files changed; verified official provider contract sources; every test command/result; real staging batch ID/counts only if genuinely created; browser viewport/test results; remaining blockers; and whether any external config/deploy was changed (default: no).

---

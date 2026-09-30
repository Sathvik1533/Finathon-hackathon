# FIN-11 LedgerSense | Frontend Guide (v2)

**Parent guide:** FIN-11 Project Guide. If they disagree, the parent wins, then raise a contract PR.
**Track:** Frontend. Owns `/web`. Branch prefix `feat/fe/*`. Stack: Next.js (React, TypeScript), Zod, TanStack Query, recharts, typed client generated from `/contracts/openapi.yaml`.
**Related:** Data Guide (Nova + synthetic), Backend Guide (endpoints).

## What changed in v2
1. **Two new screens:** S16 Data sources (Nova import) and S17 Synthetic Lab (JPM 7-step view).
2. **S3 Batches** gets an "Import from Nova" source and a calibration selector for the simulator.
3. **S5 Dashboard, S6 to S9** show a batch source badge (`Nova`, `Simulated`, `Upload`); the benchmark panel shows "not available" for Nova and upload batches.
4. **S12 Reports:** the real-vs-synthetic panel compares a Nova profile with a synthetic profile (from S17), not typed numbers.
5. **Rule:** the browser never calls Nova and never sees the Nova key. It only calls `/api/nova/*`.

---

## 1. How the frontend team works in Antigravity (steps)
1. Open the monorepo; one agent per branch in section 3; never two agents in one folder.
2. `git switch develop && git pull && git switch -c <branch>`.
3. Paste the shared preface, then the branch prompt (one screen per prompt).
4. Ask the agent to run the acceptance check and paste evidence in the PR.
5. Review. Reject hardcoded rates, categories, stages, sample rows, secrets, `dangerouslySetInnerHTML`.

**Shared preface (paste before every frontend prompt)**
> You are working only in `/web` (Next.js, React, TypeScript) on the branch named below. Use the API client generated from `/contracts/openapi.yaml`; never hand-write endpoint URLs. The frontend never talks to the database, to FastAPI, or to the Nova API. No mock or sample rows in the final build; every number comes from the API. Handle loading, empty, error and 403 states. Validate forms with Zod using the same rules as the server. Money arrives as integer paise strings; format only with `formatPaise`. Render all external text as plain text (narrations, Nova names, AI output, rationale). Never store tokens in localStorage. Keep the PR under about 300 lines. Nothing hardcoded: categories, stages, metric names and rates come from the API.

### Shared building blocks (build first on feat/fe/layout)

| Block | Rule |
|---|---|
| API client | Generate types and client from the OpenAPI file (openapi-typescript + openapi-fetch). One wrapper adds credentials, the `X-Requested-With: fin11` header, request-ID capture, 401 redirect |
| Server state | TanStack Query; no global store for server data |
| SSE hook | One `useSSE(url)` hook: EventSource with credentials, backoff reconnect, typed events, cleanup. Reused by run console **and Nova import progress** |
| Money | `formatPaise(bigintOrString)` uses integer math. Unit tests for 0, 1, 99, 100, 123456789 |
| Forms | Zod schemas in `/web/src/schemas` mirror API validation; inline 422 errors |
| Mocks (dev only) | Prism mock from the OpenAPI contract until hour 19; **Nova endpoints are mocked by Prism too** (the web app never sees real Nova). Remove every mock before the release tag |
| Security | CSP in `next.config`, no `dangerouslySetInnerHTML`, no secrets in `NEXT_PUBLIC_*`, same-origin `/api` in production |
| Accessibility | Keyboard-operable tables and decision panel, visible focus, labels on every input, status by text as well as color |
| Source badge | Small component `<SourceBadge source>` used on batch lists, run headers, dashboard, case dossier |

## 2. Screen map and build order

```
/login -> /app (dashboard) -> /app/sources (Nova import) -> /app/batches -> /app/runs/:id (live SSE)
 -> /app (KPIs) -> /app/queue -> /app/cases/:id (decide) -> /app/audit -> /app/reports
 side: transactions, settlements, refunds ; lab: /app/lab (JPM 7-step)
 admin: /admin/config -> Refresh -> numbers move ; /admin/policies ; /admin/users
```

| # | Screen | Route | Role | Branch |
|---|---|---|---|---|
| S1 | App shell and navigation | /app | reviewer, admin | feat/fe/layout |
| S2 | Login | /login | anyone | feat/fe/auth |
| **S16** | **Data sources (Nova)** | **/app/sources** | **reviewer (read), admin (import)** | **feat/fe/sources** |
| S3 | Batches and simulator | /app/batches | reviewer, admin | feat/fe/batches |
| S4 | Run console (live SSE) | /app/runs/:id | reviewer, admin | feat/fe/run-console |
| S5 | Dashboard and Refresh | /app | reviewer, admin | feat/fe/dashboard |
| S6 | Transactions explorer | /app/transactions | reviewer, admin | feat/fe/transactions |
| S7 | Settlements (one-to-many) | /app/settlements | reviewer, admin | feat/fe/settlements |
| S8 | Exception queue | /app/queue | reviewer, admin | feat/fe/queue |
| S9 | Case dossier | /app/cases/:id | reviewer, admin | feat/fe/case-dossier |
| S10 | Refunds and reversals | /app/refunds | reviewer, admin | feat/fe/refunds |
| S11 | Audit trail | /app/audit | reviewer, admin | feat/fe/audit |
| S12 | Reports and benchmark | /app/reports | reviewer, admin | feat/fe/reports |
| **S17** | **Synthetic Lab** | **/app/lab** | **reviewer (read), admin (write)** | **feat/fe/lab** |
| S13 | Admin: rules and config | /admin/config | admin | feat/fe/admin-config |
| S14 | Admin: policies and prompts | /admin/policies | admin | feat/fe/admin-ai |
| S15 | Admin: users (optional) | /admin/users | admin | feat/fe/admin-users |

**Contract gap to close at hour 2:** add to `/contracts/openapi.yaml`: `GET /api/batches, /runs, /settlements, /transactions, /refunds, /audit`, `GET/POST /api/users`, `POST /api/uploads/presign`, `POST /api/ai/policy-chat`, **`GET /api/nova/status`, `POST /api/nova/import`, `GET /api/nova/imports(/:id)`, `GET /api/nova/imports/:id/stream`, `POST/GET /api/lab/profiles`, `POST /api/lab/calibrate`, `POST /api/lab/compare`, `GET /api/lab/comparisons`, `POST /api/ai/brief`, `POST /api/ai/lab-narrative`.**

---

## 3. Screen specifications

### S1. App shell (feat/fe/layout)
- **Shows:** sidebar Dashboard, Data sources, Batches, Runs, Transactions, Settlements, Queue, Refunds, Audit, Reports, Lab; Admin group (Config, Policies, Users) only for admin. Top bar: merchant, email, role badge, logout, toast area; selected run in URL `?run=<id>`.
- **Rules:** menu from one typed array (label, route, required role). Session from `GET /api/auth/me` in Next middleware. 401 redirects to `/login?next=...`. Error pages 403, 404, 500 show the API request ID.
- **Done when:** reviewer never sees Admin group; `/admin/config` as reviewer renders 403; expired session returns to login.
- **Prompt:** Create the app shell at /app: role-gated sidebar (typed config array with required role), top bar, and 401/403/404/500 pages that show the API request ID. Include Data sources and Lab entries.

### S2. Login (feat/fe/auth)
- Email and password, pending state, one generic error `Invalid email or password`, 429 message using `Retry-After`. Redirect to `next` or `/app`. No public signup.
- Zod mirrors server rules; 422 inline; cookie is httpOnly; non-GET requests send the CSRF header via the shared client.
- **Done when:** wrong password shows the generic error; six fast attempts show the 429 message; refresh keeps the session; storage holds no token.

### S16. Data sources / Nova (feat/fe/sources) NEW
- **API:** `GET /api/nova/status`, `POST /api/nova/import`, `GET /api/nova/imports(/:id)`, `GET /api/nova/imports/:id/stream` (SSE).
- **Shows:**
  1. Connection card: reachable yes/no, team slot, dataset slice, rate limit per minute, key prefix (16 characters). Never the full key. Button "Check connection" (admin).
  2. Import dialog (admin only): optional "as-of date override" (date input, empty means derive), explanation text "Nova is read-only; nothing is written to Nova", button "Import from Nova".
  3. Live progress (same SSE hook): per-resource rows with counts, request count, rejects, elapsed time.
  4. Import history table: started, status, counts per resource, reject count, as-of date and whether derived or overridden, link to the batch, button "Run reconciliation" (creates a run and opens S4).
- **States:** no imports yet (empty state with the import button for admin, explanation for reviewer); `nova_unavailable` error shows our request ID; reviewer sees a disabled import button with a tooltip.
- **Done when:** a fixture-backed import shows live progress and creates a batch tagged `Nova`; a wrong-key error shows a friendly message and no key text anywhere; "Run reconciliation" navigates to the run console.
- **Prompt:** Build /app/sources: connection card from GET /api/nova/status, admin-only import dialog with optional as-of override (Zod), live progress using useSSE on the import stream, and history table with a Run reconciliation button. Render every server string as plain text. Never display more than the key prefix returned by the API.

### S3. Batches and simulator (feat/fe/batches)
- **API:** `POST /api/batches/simulate`, `POST /api/uploads/presign`, `POST /api/batches/upload`, `GET /api/batches`, **`GET /api/lab/profiles`**.
- **Shows:** simulator form (size, seed with Randomize, fee percent, GST percent, lag days, one rate field per exception category from `GET /api/config`), **plus "Calibration profile" select (None, or a Nova-derived profile; choosing one shows which fields it overrides and disables them)**. Upload panel (`.csv` or `.json`, source type, size cap, row-level report). Batch list with **source badge** (Nova, Simulated, Upload), counts, latest run status, Run button.
- **Done when:** same seed and parameters give identical counts; malformed file shows row reasons and creates no batch; simulate creates a batch, starts a run, navigates to S4; selecting a profile records its id in the batch params.
- **Prompt:** Build /app/batches with the simulator form (category rate fields from GET /api/config), a calibration profile select fed by GET /api/lab/profiles that disables overridden fields, the presign upload panel with a row-level report, and a batch list with SourceBadge.

### S4. Run console (feat/fe/run-console)
- **API:** `GET /api/runs/:id/stream` (SSE), `GET /api/runs/:id`. Stage stepper from the run's config snapshot; counters recordsProcessed, matchesFound, exceptionsFound, elapsed; event log; "Open dashboard" on done. Source badge and `as_of` shown in the header.
- **Rules:** one `useSSE` hook; states connecting, streaming, reconnecting, failed, done. Never poll, never fake progress. Close on unmount.
- **Done when:** counters equal final database counts; stopping the API shows "reconnecting" then recovers or shows failed.

### S5. Dashboard and Refresh (feat/fe/dashboard)
- **API:** `GET /api/metrics/:runId`, `GET /api/runs`. Run selector, source badge; KPI cards (match rate, settled amount, exception count, Amount at Risk); charts (exceptions by category, Amount at Risk by category, settlement lag distribution); benchmark panel **shows "Not available for Nova and upload batches" when `benchmark` is null**.
- **Refresh:** dialog prefilled with last simulated-batch parameters (or "Re-run on the latest Nova import"), creates a new batch and run, opens S4.
- **Done when:** every number traces to an API field; Refresh creates a new batch; after an admin changes fee percent, Refresh changes KPIs.

### S6 to S11 (unchanged behaviour, one line each)
| Screen | What to build | Done when |
|---|---|---|
| S6 Transactions (`GET /api/transactions`) | One table across four sources with source column and status chip; filters (source, status, date, amount, free text); server pagination; filters in URL; side panel with linked records **and Nova ids when present** | Searching a gateway payment id shows its linked internal, bank and refund rows |
| S7 Settlements (`GET /api/settlements(/:id)`) | List of bank credits; detail with the payments grouped behind one credit: gross, fee, GST, refunds, expected net, credited, difference; **plus the Nova-reported settlement net when available** | Sum of listed nets equals the credit within tolerance for a matched settlement; differences shown with sign and text |
| S8 Queue (`GET /api/exceptions`) | Ranked by Amount at Risk descending; filters from API; keyboard navigation | Row order equals API order; filters survive reload |
| S9 Case dossier (`GET /api/cases/:id`, `POST .../decision`, `POST /api/ai/explain`, `/api/ai/policy-chat`) | Header, four-source timeline, fee breakdown, deterministic explanation always visible, AI panel (`no policy found`, `AI unavailable`), policy chat, decision panel sending `version` and a 409 conflict dialog. **Show the Nova record id and source badge on each timeline item** | Two tabs deciding the same case: second gets the conflict dialog; AI stopped still works; HTML in a narration shows as literal text |
| S10 Refunds (`GET /api/refunds`) | Refunds against original payments with `kind` (refund, chargeback, chargeback reversal), settlement status and exception badges | Unreflected partial refund is flagged and links to its case |
| S11 Audit (`GET /api/audit`) | Read-only paginated log with expandable stored AI suggestion; no mutation controls | A decision from S9 appears within one refresh |

### S12. Reports and benchmark (feat/fe/reports)
- **API:** `GET /api/reports/:runId?format=json|csv`, `GET /api/metrics/:runId`, `GET /api/lab/comparisons`.
- **Shows:** JSON and CSV export; benchmark versus hidden ground truth (simulated batches only); **real-vs-synthetic panel reading the latest lab comparison: for each metric real (Nova) value, synthetic value, verdict; if none exists show "Run the Synthetic Lab" link and label any fallback numbers "typed reference, not measured"**.
- **Done when:** CSV opens cleanly and formula cells are neutralised; benchmark equals the dashboard; panel matches S17.

### S17. Synthetic Lab (feat/fe/lab) NEW
- **API:** `POST/GET /api/lab/profiles`, `POST /api/lab/calibrate`, `POST /api/lab/compare`, `GET /api/lab/comparisons`, `POST /api/ai/lab-narrative`.
- **Layout: the seven J.P. Morgan steps as a vertical stepper:**
  1. Compute real metrics: pick a Nova batch, "Compute profile" (admin).
  2. Generator: read-only card describing the seeded statistical generator and its version.
  3. Calibrate: "Calibrate from this profile" shows the derived parameters (fee ratio, lag histogram, amount quantiles, refund rate, payments per settlement).
  4. Run: button opens S3 with the profile preselected.
  5. Compute synthetic metrics: pick the simulated batch, "Compute profile".
  6. Compare: table with columns metric, real, synthetic, error, verdict (PASS, WARN, FAIL by text and icon, not color alone), parameter hint. Distribution metrics also show a small overlay chart of the two CDFs.
  7. Refine: shows the iteration counter (max from config), a "Explain differences" button (AI narrative, labelled AI, with `AI unavailable` fallback), and a link to edit the generator parameters.
- **Rules:** the data honesty statement from the Data Guide appears at the top of the page. Reviewers see everything read-only. No number is typed in the browser.
- **Done when:** comparing a profile with itself shows all PASS; changing the fee percent in the simulator and re-running shows `fee_ratio_bps` move to FAIL or WARN with a hint naming the fee parameter; iteration counter stops at the cap.
- **Prompt:** Build /app/lab as a seven-step vertical stepper following the JPM method: profile compute for Nova and synthetic batches, calibrate, run link to /app/batches, comparison table with PASS/WARN/FAIL text, CDF overlay chart with recharts, iteration counter, and an AI explain button using POST /api/ai/lab-narrative with an "AI unavailable" fallback. Admin-only write actions; everything read from the API.

### S13 to S15 (admin)
| Screen | Build | Done when |
|---|---|---|
| S13 `/admin/config` | Grouped form from the config schema: tolerance, date window, fee bps, GST bps, rounding, stage toggles and order, confidence thresholds, category severity and weights, **Nova settings (max reject percent, requests per minute), Lab tolerances**; version history with diff; restore-as-new; banner "Applies from the next run" | Editing fee bps creates a new version; the next run's snapshot shows it; reviewer gets 403 |
| S14 `/admin/policies` | Policy and prompt-template editors with version history; re-index status after save; injection-surface warning | After saving a policy, the policy chat cites the new version |
| S15 `/admin/users` (optional) | List and create reviewer or admin; show a one-time temporary password | A created reviewer can log in and cannot open admin pages |

---

## 4. Frontend timeline (aligned to the 36-hour plan)

| Hours | Work | Gate |
|---|---|---|
| 0-2 | Read contract and screen list; scaffold checked (`/web` runs, health page); **Nova discovery output read** | Contract and screens frozen at hour 2 |
| 2-10 | Shared blocks, S1, S2 against the mock server, then the real API | Hour 10: layout and login work on the real API |
| 10-19 | **S16 sources**, S3, S4 (SSE hook), S5, still on mocks where backend is not merged | Hour 19: switch from mocks to the real API |
| 20-25 | S6 to S12, **S17 lab**, S13 to S15; polish states and accessibility | Hour 25: all main screens read live data |
| 25-34 | AI panel (S9) through the Express proxy; bug fixes; security pass (CSP, no innerHTML, no tokens in storage) | Hour 34: code freeze |

## 5. Completion checklist
- [ ] All 17 screens exist at their routes and are reachable by the right roles only
- [ ] No mock server, sample JSON or static table rows remain (search the repo)
- [ ] Every KPI, chart and table value comes from an API response
- [ ] Loading, empty, error and 403 states exist on every screen
- [ ] Forms validate with Zod; server 422 errors appear inline
- [ ] Login: generic error, 429 message, session survives refresh, no token in browser storage
- [ ] **S16: import progress arrives over SSE; only the key prefix is ever displayed; reviewer cannot start an import**
- [ ] **Source badge appears on batches, runs, dashboard and case dossier; benchmark shows "not available" for Nova and upload batches**
- [ ] **S17: seven steps, comparison table with text verdicts, iteration cap, AI explanation with fallback**
- [ ] Run console updates only from SSE events; reconnect works
- [ ] Case dossier: four-source timeline, fee breakdown, AI panel states, decision with version, 409 dialog
- [ ] External text (narrations, Nova names, AI output, rationale) is rendered as plain text; the injection narration has no effect
- [ ] Reports export works; dashboard, reports and benchmark show identical numbers
- [ ] Admin config edit then Refresh visibly moves exceptions, Amount at Risk and metrics
- [ ] CSP set; no `NEXT_PUBLIC_` secrets; `grep -r nova_sk_ web/` is empty; keyboard-only run through queue and decision works

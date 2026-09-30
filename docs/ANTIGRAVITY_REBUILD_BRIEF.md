# LedgerSense — Antigravity UI/UX and End-to-End Build Brief

**Repository:** [Sathvik1533/Finathon-hackathon](https://github.com/Sathvik1533/Finathon-hackathon)

**Live site reviewed:** [finathon-ledgersense-web.vercel.app](https://finathon-ledgersense-web.vercel.app/)

**Review date:** 2026-10-01

**Purpose:** Give Antigravity one accurate product brief, a safe order of work, and testable completion criteria. For a strict copy/paste instruction that forbids mock data from appearing live and defines the real-data proof gates, use [`ANTIGRAVITY_NO_MOCK_DATA_PROMPT.md`](ANTIGRAVITY_NO_MOCK_DATA_PROMPT.md). Neither document claims that live Nova data has already been authenticated.

## Current-branch correction — 2026-10-01

The user supplied a screenshot showing `api/src/novaClient.ts` returning fixed `pay_001`–`pay_004` and `gw_tx_001`–`gw_tx_004` records directly from the provider client. That is **not** live Nova ingestion. The review branch now separates those records into `api/src/fixtures/novaDemo.ts`; the API defaults to `NOVA_MODE=unconfigured`, and fixture mode is explicit (`NOVA_MODE=demo`) for non-production development/tests only. Production ignores demo mode. Data routes return HTTP 503 when no source is configured, and the UI labels demo/unconfigured states instead of substituting rows.

**This does not implement a live Nova connector.** The sandbox had no Nova key, and the FIN-11 Data Guide marks some provider fields for discovery. Do not claim an authenticated import from the passing demo-mode tests. A live client still needs the provider's official/current contract, a server-side secret in the API host, schema discovery, and a staging import/persistence check. See [`NOVA_API_USAGE.md`](NOVA_API_USAGE.md) and [`LEDGERSENSE_HANDOFF.md`](LEDGERSENSE_HANDOFF.md).

The public `/` route is now a product landing page in source. Production's `web/index.html` was still referencing the old `index-CCDR2V5Z.js` / `index-gsB6rAZJ.css`, while the current frontend build emitted different hashes. The repository-root build now compiles both API and frontend and synchronizes the Vite bundle into `web/`. Vercel must use the **repository root** (not `web`) for that build/API handler to run, and `VITE_API_BASE` must be set to the verified Railway API origin. **No Vercel project-setting change, production deploy, or merge was performed**, so public production behavior remains unverified.

## 1. Executive assessment

The table below records the **pre-redesign baseline** and earlier public checks; the current branch correction above supersedes it where stated. The desired result is not a more decorated dashboard. It is a dependable reconciliation workbench where a reviewer can see what is unmatched, why it matters, what evidence supports a match, and what action is safe to take.

| Area | Pre-redesign baseline verified state | Consequence |
|---|---|---|
| Live routing | The public root returns HTTP 200, but direct requests to `/dashboard`, `/timeline`, and `/exceptions` return 404. Vercel `/api/nova/status` and `/api/health` also return 404 on the public domain. React routes and Vercel rewrite files exist, so the actual Vercel project root/build configuration or applied rewrite must be fixed and tested. | A root-page success is not a deployment pass. Deep links, refreshes, and the API origin must work on both hosts. |
| Visual UX | The dashboard repeats navigation, the displayed date-range pill is a non-interactive `motion.div` with a fixed date, period buttons do not drive data, and the bar/area charts and several KPIs are hard-coded. Payment history is fixed sample data. | Replace decoration with a coherent workbench and API-backed, filter-aware visuals. |
| Nova status | The user reported Nova may be working. In this Sandbox, no provider key was available; the public Aczen `/health` returned HTTP 200, while the Vercel `/api/nova/status` route returned 404. At the time of the source review, GitHub `main` was `acd14bd`. | Treat the user's Nova report as unverified: verify the current Railway/API connection before claiming it works. A public health check or visible rows alone is not proof of an authenticated import. |
| Nova implementation | In the pre-redesign source at `acd14bd`, `api/src/novaClient.ts` returned fixed example records and `frontend/src/api/nova.ts` caught API failures and returned a static fallback labelled “Aczen Nova API (Production Fallback)”. The UI could therefore look populated after an API failure. | Keep those values only as visibly labelled demo fixtures; do not present them as live provider data. |
| Reported interactions | At `acd14bd`, source confirmed an inert date selector, hard-coded charts, an always-on notification dot, and a demo session recreated when auth storage is empty. The user also reported sign-out landing on Merchant Details; no Merchant Details route/component was present in that snapshot. | Verify the redesigned source and deployed behavior with browser tests for calendar, charts, notifications, logout, route and browser-back flows; do not treat click handlers alone as proof. |
| Tests | Local checks passed after installing locked dependencies: API unit suite 12/12, API integration script 7/7, and the Vite production build. The integration script logs in-memory persistence fallbacks and fixed `ORD-101`–`ORD-104` records. | These are useful baseline checks, not evidence of real Nova authentication, PostgreSQL persistence, or browser-level E2E. Add those gates. |
| Architecture | The actual frontend is Vite/React in `frontend/`, with build output in `frontend/dist/`; the current root `railway.json` builds and starts the Express API in `api/` only. The v3 frontend guide describes Next.js under `/web`. | Resolve the documentation/code mismatch explicitly. Do not silently migrate the working Vite app to Next.js as part of a visual redesign. |
| Security | This review branch removes committed database/JWT defaults, but the API still contains demo authentication paths and query-string token support. | Keep demo accounts local/test-only, move production auth to real users/sessions, remove tokens from URLs, and verify provider secrets exist in Railway before enabling production fail-fast configuration. |
| Dependencies | `npm audit` reported four frontend advisories (one high, three moderate); some suggested remediations are major-version changes. | Assess and fix deliberately; do not run `npm audit fix --force` as a blind cleanup. |

The legacy [`docs/NOVA_API_USAGE.md`](NOVA_API_USAGE.md) has been replaced with a source-of-truth notice. Use the FIN-11 v3 guides below for product contracts, while reconciling them with the repository’s actual code before implementing.

### Reported broken flows — reproduce and automate

| Flow | Evidence in the current source / user report | Required behavior and regression test |
|---|---|---|
| Calendar/date range | `DashboardPage.tsx` renders a fixed date string inside a styled `motion.div` without a click/keyboard handler. | Replace with an accessible date-range button/popover; validate start/end and timezone; update URL state and the supported API query; refresh every dependent KPI, chart and row from the same range. Test selection, cancel, clear, invalid range, keyboard use, reload/deep link and empty/error states. |
| Bar/area charts | Dashboard chart heights/months, path, peak label, growth percentages and some totals are literals. Monthly/Annually only changes selected-pill state. | Charts must use API-provided bucketed series for the selected run/date range. No chart if series are absent; show an honest empty/error state. Test that changing period changes request parameters, accessible table/summary values and plotted values—not just button styling. |
| Notifications | `AppLayout.tsx` sends every bell click directly to `/exceptions` and always renders a green unread dot. | Populate from actual notification/event data, or remove/disable the bell until there is a real source. Each notification must open its specific supported case/run target, mark read through the backend, and show a true count; empty state has no fake dot. Test multiple targets, read state, role access, and API error. |
| Logout/session | `AuthContext.tsx` seeds a local demo user when storage is empty; `frontend/src/api/auth.ts` falls back to a locally generated demo token if the API fails. The header then calls `logout()` and navigates to `/login`. | No auto-login or offline credential fallback in production. Revoke server session where supported; clear client state/query cache and redirect to `/login`. After refresh/back navigation, protected routes must remain signed out. Reproduce the user-reported Merchant Details landing; `App.tsx` has no such route, so trace and test the actual deployed route rather than assuming the current `navigate('/login')` is sufficient. |
| Wrong-page navigation | `App.tsx` routes every unknown path to `/dashboard`, hiding invalid links; the shell and dashboard also contain separate navigation layers. | Create an explicit route/interaction map; use a not-found view for unknown routes (and intentional aliases for old paths). Every nav, notification, card shortcut, export, and browser-back action must preserve the intended entity/run. Test all paths from the signed-in shell and a not-found route. |
| Direct route/refresh | Public deep links currently return host 404 even though React Router declares the routes. | Test direct request and browser refresh for `/login`, `/dashboard`, `/timeline`, `/nova`, `/exceptions`, `/settlement`, and `/report` on Vercel and Railway. Every valid path must serve the SPA shell and then the correct route; unknown paths should show the app's 404, not redirect to Dashboard. |

## 2. Source-of-truth order

1. The provider’s current official Nova documentation and actual response contract determine endpoint names, authentication, pagination, limits, and provenance. Do not invent these details.
2. Project requirements live in the [FIN-11 Main Guide](fin11/FIN-11_0_Main_Guide_End_to_End.md), [Data Guide](fin11/FIN-11_1_Data_Guide_Nova_and_Synthetic.md), [Backend Guide](fin11/FIN-11_3_Backend_Guide.md), [Frontend Guide](fin11/FIN-11_5_Frontend_Guide.md), [AWS Deployment Guide](fin11/FIN-11_6_Deployment_Guide_AWS.md), and [User Journey and Screens](fin11/FIN-11_8_User_Journey_and_Screens.md).
3. The current checked-out source determines what is actually implemented today. If the code and v3 guides disagree, write a short architecture/contract decision and resolve it in a reviewed change—do not pretend either one is already implemented.
4. Gallery examples and skill repositories are design/review aids, not validated LedgerSense workflows. Adapt patterns; do not copy pages, screenshots, branding, prose, or assets.

## 3. Non-negotiable product rules

### Data truth and Nova

- **No seeded/sample/static transaction rows, fallback KPIs, random metrics, or hard-coded financial rates in the production build.** When there is no run or the API is unavailable, show an honest empty/error state with a next step; never “fill” the page with demo values.
- Synthetic fixtures are permitted only in automated tests or an explicit local development mode that is visibly labelled. They must never be tagged, described, or displayed as a Nova import.
- The user wants the Aczen/Nova API source even if the provider describes its dataset as synthetic. Preserve the provider’s exact source/provenance label; do not independently claim data is “real” or “synthetic” without documentation.
- Keep `NOVA_API_KEY` only in the server-side API deployment’s private variables. The browser must call LedgerSense endpoints, never the Nova provider. Never place it in `VITE_*`, `NEXT_PUBLIC_*`, source, prompts, screenshots, URLs, client logs, or error messages.
- Distinguish `health reachable`, `credentials accepted`, `metadata readable`, `import completed`, and `batch persisted`. A key being present is not a connected status.
- Verify current provider docs and implement a server-side client with bounded timeouts, pagination, rate-limit handling, schema validation, safe errors, and redacted logs. Use a test HTTP adapter/fixture for repeatable automated tests; use the real credential only from Railway for a separate staging smoke test.
- Follow the v3 `/api/nova/status`, `/api/nova/import`, import history, and SSE contract where it fits the current codebase. Reconcile legacy `/api/nova/sync` rather than layering another mock endpoint over it.
- Persist an imported batch and provenance in PostgreSQL. In production, fail visibly if the database is unconfigured/unavailable; do not silently claim a memory write is durable. After a service restart, the imported batch and reconciliation result must still be present.
- Every KPI and row must trace to a selected API run/batch and include source, run/import ID, freshness/as-of time, and applicable rules/config version. Amounts remain exact integer paise values internally; use the shared formatter for display.

### Authentication, authorization, and privacy

- The current API login has hard-coded demo users, and the latest Antigravity report exposes demo presets. Remove those from production; use real persisted users and secure password/session handling. Keep test accounts only in test fixtures or explicit local demo mode.
- Remove query-string bearer-token authentication, including CSV/export URLs; URLs leak to browser history, logs, referrers, and screenshots. Use the existing approved server-side session/auth pattern (prefer secure HttpOnly cookies plus CSRF protection where applicable) and test it.
- Enforce roles on API routes, not only by hiding UI controls. Do not expose customer payloads or secrets in logs, exports, URLs, or status responses.
- Keep the rotated database URL and new signing secrets in the hosting provider’s private variables. The credential cleanup does not rewrite Git history; do not put any old secret into new commits, screenshots, issue text, or prompts.
- Treat any one-click claim/authorization URL in a deployment report as a capability credential. Do not reuse or publish such URLs; revoke/expire them if they may still be active.

### UI and interaction

- Organize each route around a real operator job: what needs review, supporting evidence, amount/impact, and next safe action. Every control must do something real, have a clear disabled reason, or not be rendered.
- Remove duplicate navigation rails and eliminate labels that do not describe LedgerSense work. Do not expose assistant/agent slash commands (for example, `/goal`, `/browser`, `/boost`, or skill commands) as user-facing UI text.
- Use the actual API for all production data. No fake “live” dots, automatic-success states, invented connection health, or auto-sync on page view. Import/reconcile actions should be explicit and report progress/errors from the server.
- Design loading, empty, stale, error, permission-denied, success, and retry states—not only the ideal data-filled screenshot. Preserve filter/selection context through list → detail → decision → audit.

## 4. Recommended design system

### Direction

Use a **light-first, precise reconciliation workbench**: quiet paper/neutral surfaces, ink/slate text, a restrained LedgerSense forest-green accent, and clear semantic status colors. Keep visual personality in typography, composition, and precise interaction details—not gradients, glass panels, neon, or a repeated wall of equal cards. A dark mode is optional and should only ship if its contrast and table readability are tested independently.

### Tokens and components

Define tokens centrally in the current Vite/Tailwind/CSS setup before restyling every screen:

- Color: `canvas`, `surface`, `surface-subtle`, `text-primary`, `text-secondary`, `border`, `accent`, `focus`, and semantic `matched`, `partial`, `exception`, `pending`, `info`.
- Type: one readable UI family, a compact fixed rem scale, consistent weights, and tabular numerals for dates, counts, money, and signed variances. Use typography/alignment—not tiny all-caps labels—to create hierarchy.
- Spacing: a compact repeatable scale (for example 4/8/12/16/24/32 px); tighter inside rows, more space between work areas.
- Surfaces: thin meaningful dividers and whitespace first; selective elevation only for a modal, active detail drawer, or overlay. Use one consistent radius family; avoid nested cards.
- Status: text plus icon or another non-color cue; never red/green alone. Show the sign, currency, precision, and as-of timestamp for financial values.
- Tables: semantic table/grid markup, right-aligned monetary columns, stable row density, visible sort/filter/selection state, and identifiers that remain inspectable. Use pagination/virtualization for large sets; do not truncate away reconciliation references.
- Motion: short user-triggered transitions only; no ambient pulsing or count-up animation that can imply changing financial truth. Respect `prefers-reduced-motion`.

### Screen hierarchy

1. **Shared shell:** one role-aware primary navigation, one top context bar for merchant/account, close period, data freshness and user/session controls. On narrow screens collapse navigation intentionally rather than duplicate it.
2. **Dashboard/overview:** current run and data freshness; unmatched/exception count; amount at risk; settlement/match totals; the highest-priority queue below. Every summary links to its underlying filtered records. Do not invent revenue, engagement, rate, or cycle metrics.
3. **Work queue/exceptions:** the scan-first surface: sortable/searchable records, explicit status, variance and age, source pair, risk and next action. Filters should cover only fields the API supports and should persist in the URL without leaking sensitive data.
4. **Exception detail:** compare the source record with the candidate ledger/settlement record side by side; show IDs, date/timezone, exact amount/currency, variance, match rationale, provenance, history, and a clear review/resolve/escalate action. A confidence score is never proof.
5. **Timeline/run console:** show actual run state/events and source provenance. No fabricated progress; handle reconnect/failure/complete, and support direct load/refresh on the route.
6. **Nova/data sources:** reachable/authenticated/last import states, import history, counts/rejects, dataset/source information when supplied by Nova, and an explicit admin-only import action. Never show the full key.
7. **Settlements, reporting, and audit:** prioritize balance-to-zero, variance direction, linked records, reproducible export, and immutable actor/time/run evidence. Do not present a chart instead of the records.
8. **Login:** production login is a real auth flow with no public demo presets or prefilled passwords. Keep test-user affordances inside test/demo builds only.

### Accessibility and responsive requirements

Target WCAG AA: at least 4.5:1 for normal text and 3:1 for large text and important UI graphics/components. Provide semantic labels, names for icon-only buttons, visible keyboard focus, logical focus order, keyboard-operable dialogs/tables, associated field errors, live status announcements, reduced-motion support, and useful zoom/reflow behavior. Test narrow phones, tablet, laptop, and wide desktop; do not solve mobile by shrinking text or forcing page-level horizontal scroll. Automated scans are one signal, not proof of usable keyboard or assistive-technology behavior.

## 5. Work in phases, not one giant code dump

| Phase | Deliverable | Gate |
|---|---|---|
| 0 — Baseline audit | Route map, deployed build/source mapping, component/data-flow map, production-vs-test fallback inventory, accessibility and security findings, Railway/Vercel project-root/build settings to verify. No code changes yet. | The report names the exact file/API responsible for every visible metric and every Nova row; it identifies why deep routes return 404. |
| 1 — Contract and safe architecture | Short ADR resolving Vite/Next.js docs drift; production auth and PostgreSQL expectations; Nova provider contract confirmed from official docs; source-of-truth data types and error semantics. | No invented endpoint/schema, no silent production fallback, no secrets in source. |
| 2 — Real backend data path | Authenticated server-only Nova client; connection status; idempotent import/history/progress; validated persistence and source provenance; no memory fallback in production. | Fixture-backed tests pass and an authorized Railway staging smoke confirms auth → import → DB persistence → run. If no key exists, stop at “credential required” without claiming live data. |
| 3 — Design foundation and shell | Tokenized design system, single navigation, responsive shell, typography, accessible primitives, loading/empty/error states. | Screenshots at 375/768/1440/1920 px, keyboard check, no duplicated navigation, no console errors. |
| 4 — Product screens | Rebuild current Dashboard, Timeline, Exceptions, Nova Explorer, Settlements, Reports and Login using real API state; keep domain actions, tests, URLs and source badges coherent. | No page displays a fake fallback; every action has server-backed outcome or is clearly unavailable. |
| 5 — Verification and deploy | Browser E2E, deep-link/refresh tests, accessibility review, dependency remediation plan, Vercel routing fix, separate Railway UI/API deployment plan and smoke test. | Both Vercel and Railway direct routes work; data survives restart; screenshots and test evidence are attached to the PR. |

## 6. Copy/paste master prompt for Antigravity

> Work in the existing repository `Sathvik1533/Finathon-hackathon` and make LedgerSense a complete, accurate reconciliation workbench—not a static redesign or screenshot-only demo. Start by reading `docs/ANTIGRAVITY_REBUILD_BRIEF.md` and the FIN-11 Main, Data, Backend, Frontend, Deployment, and User Journey guides. Inspect the current source and current live deployment before changing code.
>
> **Keep the current stack unless you produce and get approval for an architecture decision:** the repository currently builds a Vite/React app from `frontend/` and an Express/TypeScript API from `api/`; the v3 frontend guide’s Next.js `/web` architecture does not match this source tree. Do not silently migrate frameworks, invent routes/contracts, or commit generated/stale frontend bundles as the only source of truth.
>
> **Hard rules:** no mock/static/sample financial rows, hard-coded rates/KPIs, or synthetic fallbacks in production; test fixtures stay in tests, and a missing run/source is an honest empty/error state. The browser never calls Nova and never sees `NOVA_API_KEY`. Follow the provider’s current official documentation for auth, endpoints, pagination and schemas. A public `/health` response is not proof of authenticated data access. Persist successful imports/runs to the configured production database with source/import/run provenance; fail clearly if production credentials or persistence are unavailable. Never log secrets or full financial payloads. Replace demo auth in production with persisted users and secure sessions, remove query-string token auth, and enforce roles server-side.
>
> The design should feel like a distinctive, light-first financial operations workbench: the exception queue and source-to-ledger evidence are primary; one navigation system; restrained forest-green accent; aligned tabular amounts; purposeful labels and states; no decorative KPI wall, generic engagement metrics, fake health dots, glass/neon gradients, hidden actions, or assistant slash-command text in the UI. Adapt the cited skills and galleries; do not copy any page, brand, screenshot, source asset or marketing copy.
>
>
> **Fix the exact reported interactions:** the calendar must actually select a range and drive every dependent request/chart; the bar and area charts must be derived from the same API data/range, not hard-coded bars or percentages; the notification bell must open real notification data and each item’s correct case/run target (or be removed until supported), not always send everyone to Exceptions; logout must revoke/clear session state and remain on Login after refresh/back, not recreate a demo user or land on Merchant Details; every navigation/card/export destination must resolve to the intended route. The checked-in app currently has an inert fixed-date pill, literal chart values, an always-on notification dot, a default demo session, a local credential fallback, and a catch-all redirect to Dashboard. Add browser tests for all of these. The user reports that Nova may now be working—preserve it if a real authenticated import succeeds; first identify the actual runtime API base and prove the source of the visible rows, because the checked-in frontend currently falls back to fixed Nova-labelled data.
>
> Work in the phases in this brief. First provide the Phase 0 evidence-based audit and the short architecture/contract decision. Then proceed phase by phase without stopping at a plan, unless a real permission, missing credential, provider contract ambiguity, or billable Railway resource blocks the next action. If Nova credentials are unavailable, implement and test the real server-side client with an injectable test adapter, mark live auth/import as **unverified**, and stop before claiming production readiness. Keep changes on a feature branch, show test output and before/after screenshots. Do not rewrite Git history or change hosting-account ownership, access, billing, or security settings; application authentication changes in the repository are in scope. Never expose or use any one-click hosting claim link.
>
> Before calling the work complete, all acceptance checks in this brief must pass. The current site’s `/dashboard`, `/timeline`, and `/exceptions` deep links return host 404s; test direct navigation and refresh, not just `/`. The current API “E2E” suite uses fixed test records and in-memory persistence, so add real browser-flow coverage and a separately documented staging smoke for Nova/PostgreSQL. For Railway, the root `railway.json` is API-only; deploy a separate frontend service or document a deliberate combined service, use the same app source, and verify SPA fallback plus API CORS/origin. Keep the existing Vercel site available until the Railway preview and data flow pass.

## 7. Phase-specific prompts

### Phase 0 — read-only audit

> Do not edit or deploy yet. Trace every current screen/route and visible metric/row back to its component, API request, API handler, persistence layer, and fallback. Compare the live root and each direct route with the configured Vercel project root, `vercel.json`, `web/vercel.json`, and `frontend/vercel.json`. Determine why `/dashboard`, `/timeline`, and `/exceptions` return 404. Verify what `GET /api/nova/status` actually checks and whether the API makes an authenticated upstream request. Inventory demo auth, query-token usage, fixed fallback values, and all current Railway service build/start commands. Reproduce the date selector, monthly/annual chart toggles, notification bell, sign-out, and reported Merchant Details landing. Test all navigation shortcuts and unknown paths; note that a user-reported wrong target is not explained away because a route is absent from this checked-in tree. Return a concise table with evidence file/line, user impact, and a phase order; mark anything you cannot verify as unknown. Do not repeat any secret or open any hosting claim/auth link.

### Phase 2 — Nova data path

> Implement the Nova path only after confirming the provider’s current official API contract. Keep the client server-side and injectable for tests. Implement truthful `reachable` vs `authenticated` vs `imported` status; bounded requests; validated/paginated data; explicit failures; import history/progress; idempotency; PostgreSQL persistence; and provenance. No automatic synthetic fallback. Add tests for no key, invalid key, timeout, rate limit, malformed records, duplicate import, valid import, persisted restart, and redacted errors. Then run an authorized small read-only import on Railway staging using the already configured private `NOVA_API_KEY`; never print or reveal it. If the key or official schema is missing, stop at that exact blocker and report the needed environment variable or provider document—never substitute fake data.

### Phase 3–4 — UI system and route work

> Establish design tokens and shared accessible primitives in the existing Vite app. Consolidate navigation, define source/status badges and server-state handling, then update one route at a time. Start with Dashboard + Exceptions + Exception Detail, then Nova Sources + Timeline, then Settlements/Reports/Login. Use real selected-run/batch API data only; implement loading, empty, stale, error, 403, success and retry states. Make the date picker, chart period controls, notifications, sign-out, browser history and every shortcut work end to end. Preserve URL filters and route context. Add mobile/table/tablet layouts and reduced-motion behavior. After each route, run typecheck/build and browser tests; take the four viewport screenshots and record what API fields power each visible number.

### Phase 5 — Railway and release verification

> Inspect the existing Railway project and deployment settings before provisioning. The current root config deploys only the API. Use the existing project where possible; if a new service/resource would add billing or require a new domain/access permission, pause and report before creating it. Deploy a Railway frontend preview separately (or propose a clearly justified combined deployment), bind the static server to `0.0.0.0:$PORT`, provide SPA fallback, configure `VITE_API_BASE` securely at build time, and verify API CORS. Keep Vercel available. Run the full acceptance checklist below and report exact deployment URLs, commit SHA, route statuses, test results, and anything still unverified; do not claim Nova is live without a successful authenticated import and persistent batch check.

## 8. Completion checklist

- [ ] Vercel `/`, `/login`, `/dashboard`, `/timeline`, `/nova`, `/exceptions`, `/settlement`, and `/report` load the correct app route on direct request and browser refresh; no host 404 or silent redirect to Dashboard for unknown paths.
- [ ] Equivalent deep links and refreshes work on the Railway UI URL, and the Railway frontend reaches the correct API origin.
- [ ] Calendar selection changes a real date range, URL/request parameters, chart buckets, KPIs, and row sets consistently; keyboard and clear/cancel paths work.
- [ ] Charts have no literal series, percentages, fake peak labels, or fallback values in production; changing the selected range/period causes API-backed series to change and exposes accessible chart data.
- [ ] Notification state/count comes from a real backend source; each item resolves to its exact authorized case/run, is markable as read, and API errors do not show a fake green dot.
- [ ] Logout remains signed out across page refresh, browser back, protected-route navigation, and AuthProvider remount; no demo session is recreated and no Merchant Details page appears after sign-out.
- [ ] Each nav item, dashboard shortcut, notification, and export has an explicit expected route/action; unknown routes render a not-found view instead of being redirected to Dashboard.
- [ ] No `/goal`, `/browser`, `/boost`, `/impeccable` or other agent skill/slash text appears in rendered UI or production bundles.
- [ ] No user-facing fake metrics, seeded example rows, silent fallback data, hard-coded rates or hard-coded account/merchant IDs in production paths.
- [ ] Nova status distinguishes public reachability, authenticated access, and last successful import. A valid import records provider source, IDs/counts/timestamps, rejections and relevant rule version; the batch persists across API restart.
- [ ] If Nova is unavailable, the UI shows the specific failure and next safe action; it never relabels fixtures as Nova data.
- [ ] All financial values come from API response fields, retain exact paise precision internally, and display the correct currency/time/as-of context.
- [ ] Production authentication is database-backed; role checks run on the API; no default demo credentials/presets are shipped; tokens do not appear in URLs or localStorage; API keys are absent from JS/CSS/HTML/source maps/logs.
- [ ] API unit/integration tests pass, new browser E2E tests cover login → import/run → exception review → decision/audit → report/export, and real provider/Postgres smoke results are kept separate from fixture test results.
- [ ] Keyboard-only exception resolution, focus, form errors, announcements, contrast, reduced motion, zoom/reflow, and representative empty/loading/error/success states are checked; automated accessibility scans are not presented as full user validation.
- [ ] `npm audit` advisories are reviewed and documented/remediated without blind major-version upgrades; builds and tests pass afterward.
- [ ] PR includes route screenshots at 375/768/1440/1920 px, API/data-flow evidence, exact commit, and a clear list of remaining unknowns. Do not merge/deploy to the existing production target while required environment variables are missing.

## 9. Reference shelf: apply, do not imitate

### Design and agent skills

- [Anthropic Frontend Design](https://github.com/anthropics/skills/tree/main/skills/frontend-design): choose visuals from product context; be distinctive without generic dashboard decoration.
- [Vercel Web Design Guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines): semantic controls, keyboard/focus, URL state, clear errors, responsive behavior.
- [Vercel React Best Practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices): parallelize only independent requests, lazy-load heavy inspectors, keep expensive filtering responsive.
- [Vercel Composition Patterns](https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns): use explicit workflow variants and shared provider contracts instead of boolean-prop sprawl. The current repository path is `composition-patterns`; do not assume the older `react-composition-patterns` path exists.
- [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill): useful broad design/accessibility/chart heuristics, not a finance-specific template.
- [Bencium marketplace UX skill](https://github.com/bencium/bencium-marketplace): collaborative alternatives and accessibility; the requested older repo name may redirect/rename.
- [AccessLint Claude Marketplace](https://github.com/accesslint/claude-marketplace): audit representative flows and report untested criteria as unknown; automated checks do not prove usability.
- [Hallmark](https://github.com/Nutlope/hallmark), [Impeccable](https://github.com/pbakaus/impeccable), and [Design Taste](https://github.com/h3nryprod01/design-taste): use their design critique, state, hierarchy, and anti-template methods. Their aesthetic prescriptions differ; do not copy any one skill’s dark/paper theme as a mandatory LedgerSense look.

### Galleries, examples, and tools supplied by the user

- [Awwwards Finance](https://www.awwwards.com/websites/finance/), [Dribbble finance dashboards](https://dribbble.com/search/finance-dashboard) / [bank reconciliation](https://dribbble.com/search/bank-reconciliation), and [Mobbin Finance](https://mobbin.com/explore/web/app-categories/finance): visual and interaction references only; gallery screenshots are not usability evidence or permission to copy.
- [EasePrint](https://github.com/KARTHIK-BATTIPROLU/EasePrint): inspect its unified operations queue, transaction ledger, and records/audit separation; adapt those patterns to reconciliation, not its print-shop fields or branding.
- Supporting resources named in the user’s brief: [Wegic](https://wegic.ai/), [Framer](https://www.framer.com/), [Fontjoy](https://fontjoy.com/), [Lucide](https://lucide.dev/), [Color Hunt](https://colorhunt.co/), [React Bits](https://www.reactbits.dev/), and [Aceternity UI](https://ui.aceternity.com/). Use icons/components/palette ideas selectively; verify licensing, keyboard behavior, bundle cost, contrast, and reduced-motion support. “Motion Sites” and “Awesome Design.md” were named without an unambiguous specific URL/document—verify the exact reference before relying on it.
- The supplied `mastepanoski/claude-skills` link points to GitHub’s [ux-ui-design topic](https://github.com/topics/ux-ui-design), not to one specific audited skill repository. Do not treat the topic page or star counts as a design specification.

The Claude `.md` files are agent guidance, not a web UI package. Antigravity may read and apply their principles, but skill commands belong in the agent workflow—not in LedgerSense screens. Do not install untrusted skills or copy large code/assets without reviewing their source, license, and compatibility.

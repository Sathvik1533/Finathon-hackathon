# LedgerSense redesign — handoff for another Manus account

**Updated:** 2026-10-01
**Repository:** [Sathvik1533/Finathon-hackathon](https://github.com/Sathvik1533/Finathon-hackathon)
**Review branch:** `fix/security-remove-active-credentials`
**Review PR:** [#2 — Security cleanup and Antigravity rebuild brief](https://github.com/Sathvik1533/Finathon-hackathon/pull/2)
**Scope:** reviewable branch/PR only. Do not merge or deploy without separate authorization.

## Why this handoff exists

The user rejected the current site's default-looking font/typography and generic, AI-template dashboard treatment. The public root must be a clear, premium product landing page explaining LedgerSense before sign-in. The app needs deliberate desktop and mobile-native interactions. Reported bugs include sign-out ending on merchant details, static charts/date ranges, misleading notifications and wrong route behavior.

The user also supplied a screenshot of the account drawer showing example merchant/bank/GSTIN information and unsupported trust language, plus a source screenshot showing fixed payment and gateway arrays inside `api/src/novaClient.ts`. This is direct evidence that populated UI and passing demo tests were being confused with a live data integration.

Antigravity's latest user-pasted status claims a Nova test suite, dynamic `/api/reconcile/analytics`, real payment history, persisted notifications and a fixed logout flow. Those claims are **not verified**: on 2026-10-01, `origin/main` and `origin/develop` were both `acd14bd` and the open PR head was `a0d4950`; none contained `api/src/test_nova.ts` or `api/src/test_full_system.ts`, and no matching analytics/notification routes were found in those refs. Antigravity may have these changes in an uncommitted workspace, which is not visible from this Sandbox. Ask it to provide the actual diff/branch and evidence before accepting the report. Its suggested push to `main` and `develop` and live deployment are **not authorized**; keep the existing review-only PR.

## What the review branch changes

- Adds a public `/` landing page with a clear one-sentence product explanation, a custom illustrative order → gateway → bank flow, three-step explanation and sign-in action. The illustration is labeled as illustrative, not a live data preview.
- Replaces the generic visual treatment with the design direction in [`ideas.md`](../ideas.md): Newsreader headlines, Instrument Sans product UI, IBM Plex Mono only for identifiers and tabular values, warm paper/ink/forest/rust palette, ledger-like rules and restrained surfaces.
- Rebuilds the desktop workspace around one navigation rail and the mobile workspace around touch-sized, safe-area-aware bottom navigation and responsive table cards.
- Adds real root/unknown routes and Vercel SPA catch-all rewrites; updates auth restoration/logout, and removes client-side fake successful fallback data.
- Production `web/index.html` was still referencing the old `index-CCDR2V5Z.js` / `index-gsB6rAZJ.css`, while the current frontend build emitted different hashes. Root `npm run build` now compiles API + frontend and synchronizes the fresh Vite output into `web/`, omitting source maps. The Vercel project must use the **repository root**, not `web`, so that build/API handler runs; set `VITE_API_BASE` to the verified Railway API origin. Project settings and production were not changed.
- Reworks dashboard, Timeline, Nova explorer, settlements, report and exception review so missing/error data is not replaced with local sample rows or claimed as a perfect match. Settlement matching now depends on returned bank/gateway rows; unavailable bank variance stays `null`, not zero.
- Moves the FIN-11 example records into [`api/src/fixtures/novaDemo.ts`](../api/src/fixtures/novaDemo.ts). The API defaults to `NOVA_MODE=unconfigured`; fixture mode requires explicit `NOVA_MODE=demo`, is disabled in production, and is selected by API test scripts only. Guarded data routes return HTTP 503 when unconfigured. The frontend announces this state.
- Adds [`api/.env.example`](../api/.env.example), updates the Nova status notice and Antigravity brief, and links this handoff from the root README.

## Critical source-of-truth: live Nova is still not implemented

Do **not** tell the user or Antigravity that the project now ingests live Nova data. The branch makes the prior behavior safer and more honest; it does not create a working upstream client.

- The source screenshot shows sample `pay_001` / `ORD-101` and gateway rows being returned directly from the old `NovaClient` methods. They are now kept in a named demonstration-fixture module.
- Current source has no authenticated Nova HTTP importer. `NOVA_MODE=nova` does not activate an importer; it remains unconfigured. The default is unconfigured.
- The current sandbox has no `NOVA_API_KEY`, and no authenticated provider read, import, database persistence, or live runtime connection was verified.
- The FIN-11 Data Guide specifies a server-side Bearer key, `www` base URL, sequential pagination/rate-limit rules and known resource names, but marks some response fields/identifiers for discovery. Follow the provider's current official contract and discovery process; do not guess those fields.
- A public `/health` response or UI rows is not proof of authentication/import/persistence. The earlier public Vercel API paths returned 404. Old asset hashes plus those 404s are consistent with the Vercel project serving `web/` directly and bypassing the root build/API handler. Set Vercel Root Directory to `.` and `VITE_API_BASE` to the verified Railway origin; this was not changed or deployed here.
- Keep a provider key only in private API-host variables (e.g. Railway). Do not request or put it in chat, source, `VITE_*`, screenshots, logs, or a URL.

Authoritative details: [`docs/NOVA_API_USAGE.md`](NOVA_API_USAGE.md), [`docs/fin11/FIN-11_1_Data_Guide_Nova_and_Synthetic.md`](fin11/FIN-11_1_Data_Guide_Nova_and_Synthetic.md), [`docs/ANTIGRAVITY_REBUILD_BRIEF.md`](ANTIGRAVITY_REBUILD_BRIEF.md), and the [copy/paste no-mock-data prompt](ANTIGRAVITY_NO_MOCK_DATA_PROMPT.md).

## Validation and what it means

The API unit suite (12 checks), end-to-end script (7 scenarios), frontend build, and repository-root build have been run locally. The API test scripts explicitly set `NODE_ENV=test NOVA_MODE=demo`; their sample orders and zero-variance assertions validate deterministic fixtures and code paths only. A separate local no-source smoke returned `503/unconfigured` for Nova sync, latest reconciliation, payments and settlements. A production-mode check with `NOVA_MODE=demo` returned `unconfigured` and zero payment rows. Headless Chromium previews were inspected at 1440×1100 and 390×844 for the public landing page. **None of these checks validate a live Nova key, real merchant data, Railway configuration, durable production persistence, or the authenticated logged-in browser flows.**

Before calling the UI finished, manually verify `/`, `/login`, sign-in, sign-out, browser back/refresh, unknown routes, `/dashboard`, exception decisions/errors, and all supported feed/report routes at both desktop and phone widths. A public landing screenshot/build is not a logged-in workflow pass.

## Suggested next work for the receiving agent

1. Recheck the current execution environment and repository state; do not assume this Sandbox path is available in your session.
2. Fetch the review branch/PR from the GitHub URL above, or apply the included `repo-delta.patch` to the matching repository base. Inspect rather than blindly trust the diff.
3. Run API tests, E2E script and frontend build. Add explicit tests for default unconfigured mode returning 503, and demo-only test mode returning the visibly labelled fixtures.
4. Use a browser at desktop and phone widths to verify landing-page hierarchy, typography, one desktop nav, mobile bottom nav, responsive data tables, sign-out to `/login`, and direct-route refresh. Check keyboard focus, Escape, touch sizes and no horizontal page overflow.
5. Implement a live Nova adapter only after reviewing the provider's current docs and discovering the marked fields. Use a private API-host secret and a staging read-only/import/persistence test. Distinguish source reachability, authentication, import completion and persisted provenance. Do not replace the old hardcoded arrays with another mock presented as live.
6. Verify API origin and Vercel/Railway routing in the real deployment. No deployment or PR merge was authorized in the current task.

## Key files

| Purpose | Files |
|---|---|
| Product/typography direction | `ideas.md`, `frontend/src/index.css`, `frontend/tailwind.config.ts`, `frontend/index.html` |
| Public entry/login/routes | `frontend/src/pages/LandingPage.tsx`, `frontend/src/pages/LoginPage.tsx`, `frontend/src/App.tsx` |
| Shared shell/responsive tables | `frontend/src/components/layout/AppLayout.tsx`, `frontend/src/components/layout/PageShell.tsx`, `frontend/src/components/ui/DataTable.tsx`, `frontend/src/components/ui/ExceptionDrawer.tsx` |
| API-backed product pages | `frontend/src/pages/DashboardPage.tsx`, `TimelinePage.tsx`, `NovaExplorerPage.tsx`, `SettlementPage.tsx`, `ReportPage.tsx` |
| Data mode and fixture boundary | `api/src/config.ts`, `api/src/novaClient.ts`, `api/src/fixtures/novaDemo.ts`, `api/src/server.ts`, `api/.env.example` |
| Build/routing | `package.json`, `scripts/sync-web-build.mjs`, `vercel.json`, `web/vercel.json`, `frontend/vercel.json`, `deploy/README.md` |
| Detailed product requirements | `docs/ANTIGRAVITY_REBUILD_BRIEF.md`, `docs/NOVA_API_USAGE.md`, `docs/fin11/` |

## Handoff archive contents

The companion ZIP includes this document, the strict Antigravity prompt, the design and Nova/Antigravity source-of-truth docs, the FIN-11 data guide, a repository delta patch and a small manifest. It does not contain credentials, a live provider key or the user's screenshot.

# Architecture Decision Record (ADR): Canonical Vite/React SPA + Express API Stack

**Date:** 2026-10-01  
**Status:** Accepted  

## Context
1. The repository FIN-11 documentation referenced Next.js under `/web`, while the actual codebase implemented a React 18 application with Vite and Tailwind in `frontend/` (dist in `web/`), and an Express 5 + TypeScript server in `api/`.
2. Silent framework migration to Next.js mid-project carries severe regression risks for the verified 11 FIN-11 modules and existing working components.
3. Live Vercel deployments had broken deep links (`/dashboard`, `/timeline`, `/exceptions` returning 404) due to regex negative lookaheads and `cleanUrls: true` in `web/vercel.json`.
4. Authentication had demo fallbacks in both client and server, auto-seeded demo user sessions in `localStorage`, and token exposure in query parameters.

## Decisions

### 1. Canonical Stack Confirmation
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS (`frontend/`), building to production distribution in `web/`.
- **Backend:** Node.js + Express 5 + TypeScript (`api/`), serving RESTful endpoints with distributed Redis caching/mutex locks and PostgreSQL persistence.
- **Documentation Alignment:** All references to Next.js in operational guides are formally superseded by this Vite/React architecture.

### 2. Vercel Edge SPA Routing Contract
- Standardize all Vercel configurations (`web/vercel.json`, `vercel.json`, `frontend/vercel.json`) to the verified path-to-regexp SPA rewrite:
  ```json
  {
    "version": 2,
    "cleanUrls": false,
    "rewrites": [
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```
- All client-side route paths (`/login`, `/dashboard`, `/timeline`, `/nova`, `/exceptions`, `/settlement`, `/report`) are served by `index.html` on direct hit and refresh. Unknown routes display an in-app `NotFoundPage` (HTTP 404 equivalent).

### 3. Authentication & Privacy Policy
- Remove client-side auto-seeding of demo accounts (`priya` / `jwt-demo-session-token`) from `AuthContext`.
- Remove query-string bearer token handling (`?token=...`) across API endpoints and CSV download URLs to prevent token leakage in referrers and browser history.
- Ensure `logout()` completely purges client tokens, resets state, and redirects to `/login`. Upon refresh or browser-back, protected routes stay locked to `/login`.
- Remove simulated credential fallbacks in production. Missing credentials return an explicit `401 Unauthorized`.

### 4. Data Truth & Nova Contract
- Server-side only: the browser never communicates with Aczen Nova directly and never receives `NOVA_API_KEY`.
- Truthful status reporting: distinguish `reachable` (public preflight `/health`), `authenticated` (`/me` with valid key), and `imported` (records ingested into Postgres).
- No silent synthetic fallbacks in production builds. If `NOVA_API_KEY` is unset or invalid, the API and UI stop at an explicit `CREDENTIAL_REQUIRED` or `CONNECTION_ERROR` state.

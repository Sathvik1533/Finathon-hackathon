# Nova API usage — source-of-truth notice

**Status:** This page is not the API contract. The old examples and claims in this file were superseded and must not be used to implement or describe a production Nova integration.

## Authoritative project references

- [FIN-11 Main Guide](fin11/FIN-11_0_Main_Guide_End_to_End.md)
- [FIN-11 Data Guide: Nova and Synthetic](fin11/FIN-11_1_Data_Guide_Nova_and_Synthetic.md)
- [FIN-11 Backend Guide](fin11/FIN-11_3_Backend_Guide.md)
- [FIN-11 Frontend Guide](fin11/FIN-11_5_Frontend_Guide.md)
- [Antigravity rebuild brief](ANTIGRAVITY_REBUILD_BRIEF.md)

If the current provider contract disagrees with these project guides, verify the provider's official documentation and update the contract in a reviewed change before changing implementation. Do not invent fields, endpoints, or authentication headers.

## Verified status as of 2026-10-01

- The configured base URL is `https://www.aczen.in/nova-api/v1`.
- An unauthenticated `GET /health` returned HTTP 200 with `{"status":"ok"}` during review. This proves only that the public health endpoint was reachable; it does **not** verify a key, dataset access, imports, or persistence.
- In the checked-in source at commit `ae36dbc`, `api/src/novaClient.ts` still returns fixed example records, and its status response can describe the connection as live without making an authenticated upstream request.
- The frontend's `frontend/src/api/nova.ts` contains a static fallback that can be labelled as an Aczen/Nova source after an error. That fallback must never be used or presented as Nova data in production.
- The user reports Nova may now be working. This Sandbox had no `NOVA_API_KEY`; the public Vercel `/api/nova/status` and `/api/health` routes returned 404 during review. That does not prove the Railway API is down, but neither does visible UI data prove a successful import: the checked-in client can return fixtures after an API failure. Before changing Nova code, identify the actual runtime `API_BASE`, make a successful authenticated read/import to the currently configured backend, and preserve the verified connector. Record clearly if this runtime verification cannot be performed.
- Do not send a key in chat, commit it, include it in a screenshot, or put it in a `VITE_*`/browser variable.

## Production rules

1. Keep the provider credential only in the server-side API deployment's secret variables (for example, Railway Variables). The browser must call the LedgerSense API, never Nova directly.
2. Distinguish provider reachability from successful authentication and from a successful data import. Show an accurate connection state and the time/source of the last verified import.
3. Do not silently fall back to seeded, generated, or cached example rows after an upstream failure. Return a clear error state. An empty provider dataset is an empty state, not a prompt to fill the screen with demo values.
4. Keep deterministic fixtures only in tests or in an explicitly selected, visibly labelled local development mode. Never tag fixtures or simulator output as a Nova import.
5. Preserve provenance for every imported batch and record: source name, provider dataset/slice when available, import/run IDs, imported time, as-of date, record counts, rejected-record counts, and the reconciliation rule/config version.
6. Do not state that a dataset is real or synthetic unless the provider's current documentation identifies it that way; use the provider's own provenance label.
7. Do not log authorization headers, API keys, raw sensitive payloads, or full customer data. Redact request and error logs.

## Safe verification sequence

1. Check the public `/health` endpoint without a key.
2. Configure `NOVA_API_KEY` only in the API service's private environment. Follow the provider's current documentation for the authentication scheme, permissions, limits, pagination, and response schema.
3. From the API service, verify authenticated metadata and a small read-only sample without printing the key or full records.
4. Run an import into a staging database, verify persisted counts and provenance, restart the service, then confirm the batch and its records remain available.
5. Test invalid/missing credentials and upstream timeouts. The UI must show an actionable unavailable/error state and must not display sample rows as live data.

For implementation order, acceptance criteria, and the Railway/Vercel routing checks, use the [Antigravity rebuild brief](ANTIGRAVITY_REBUILD_BRIEF.md).

# LedgerSense design direction

## Direction

Create an **editorial operations workspace**: a quiet, trustworthy financial tool that feels composed and authored rather than like a generic fintech template. The product should explain itself in plain language before asking anyone to sign in. The user's screenshot is evidence of what to correct, not a visual target to reproduce.

## Brand and visual language

- Warm paper canvas (`#F7F6F2`), white work surfaces, deep ink (`#17211C`), forest green for primary actions, and muted rust only for exceptions or risk.
- Use color semantically: green means matched/success, amber means pending, rust/red means action required. Avoid decorative gradients, glowing status dots, glass effects, oversized pill navigation, floating-card stacks, or repeated rounded containers.
- Make structure through generous whitespace, aligned columns, thin ledger-like rules, and clear section headings. Keep corners restrained; use elevation only when it clarifies layering.
- Use one consistent, quiet line-icon vocabulary; no emoji as interface icons.

## Typography

- **Newsreader** for large editorial headlines and occasional section titles.
- **Instrument Sans** for all product UI and body copy; use a readable 16px body baseline, 14px controls, and metadata no smaller than 12px.
- **IBM Plex Mono** only for transaction IDs, references, and aligned monetary numerals. Use tabular figures for values; do not render ordinary labels, paragraphs, or every badge in monospace.
- Desktop hero headline: roughly 56px with tight line length; mobile: roughly 40px. Keep comfortable line-height and avoid uppercase micro-labels as the primary hierarchy.

## Landing page and product truth

- `/` is a real public LedgerSense landing page, not a dashboard redirect or login wall. Explain in one clear sentence that LedgerSense compares order, gateway, and bank records, then surfaces mismatches for review.
- Show a custom, accessible flow diagram (orders → gateway → bank → matched / needs review) rather than stock photography or fabricated dashboard metrics. Follow with a short three-step explanation, the real app capabilities, and a single clear sign-in/workspace action.
- Do not invent customer names, usage numbers, conversion claims, bank partnerships, performance promises, security guarantees, certification badges, or live-data statuses. State only what the current product and its connected API can substantiate. The “Acme” merchant, example GSTIN/bank details, “SOC2 Immutable”, J.P. Morgan reference, and other demo-only proof points must not be presented as real. In this review branch the backend defaults to `NOVA_MODE=unconfigured`; fixture rows require explicit non-production `NOVA_MODE=demo` and are not live API records.
- `/login` is a focused, calm form with no prefilled credentials or production demo shortcuts. Unavailable service and invalid credentials must be explained honestly.

## Desktop and mobile behavior

- Treat this as one responsive web application with a mobile-native interaction model; this is not a separate iOS/Android application.
- Desktop: one persistent left navigation rail, one work area, concise top bar, aligned work queue and summary. No duplicated navigation.
- Mobile: compact top bar plus a fixed, safe-area-aware bottom navigation for the highest-value destinations and a clearly labeled “More” sheet for secondary routes. Never simply shrink the desktop sidebar or squeeze a desktop table.
- Keep touch targets at least 44×44 CSS px (prefer 48px for primary actions), make dialogs/drawers become mobile sheets where appropriate, use cards only where row-to-row column comparison is not essential, and preserve a visible way to reach every route.
- Support keyboard focus, escape-to-close for overlays, reduced motion, readable contrast, and narrow widths without horizontal page overflow.

## Product reference principles

- [DesignRevision — fintech landing patterns](https://designrevision.com/blog/fintech-saas-landing-pages): use a specific problem statement, a clear product visual, and one primary CTA; ignore its conversion/compliance suggestions unless real proof exists.
- [AdminLTE — fintech dashboard examples](https://adminlte.io/blog/fintech-dashboard-design-examples/): keep finance tables legible, align tabular figures, use status color only for status, and prioritize review work over decorative chart walls.
- [Toptal — mobile dashboard UI](https://www.toptal.com/designers/dashboard-design/mobile-dashboard-ui): prioritize key destinations on mobile, adapt data to its comparison task, and make touch controls comfortably tappable.

## Acceptance bar

At `/`, a new visitor can understand the product and find sign-in. In the workspace, every visible number, alert, merchant detail, and status is either backed by an API response or explicitly shown as unavailable/empty. Live Nova ingestion is not yet implemented; do not imply otherwise. A sign-out leaves the user on the login page with no restored demo session. At phone and desktop widths the hierarchy remains deliberate, controls are usable by touch and keyboard, and charts/tables never imply data that the application did not load.

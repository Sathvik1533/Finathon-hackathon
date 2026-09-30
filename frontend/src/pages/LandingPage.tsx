import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BrandMark = () => (
  <span className="flex h-10 w-10 items-center justify-center border border-ink rounded-sm" aria-hidden="true">
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-forest" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 5.5h14M5 10.5h9M5 15.5h14M5 20.5h9" />
      <path d="m15.5 11.5 2.2 2.2 3.8-4" />
    </svg>
  </span>
);

const FlowIllustration = () => (
  <div className="relative border border-line bg-white p-5 sm:p-7 shadow-[0_16px_48px_rgba(23,33,28,0.06)]">
    <div className="flex items-center justify-between border-b border-line pb-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">The reconciliation path</p>
        <p className="mt-1 text-sm text-ink">One view across three records</p>
      </div>
      <span className="font-mono text-xs text-muted">FIN-11</span>
    </div>

    <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
      {[
        { code: '01', title: 'Order record', detail: 'What was expected' },
        { code: '02', title: 'Gateway', detail: 'What was captured' },
        { code: '03', title: 'Bank credit', detail: 'What arrived' },
      ].map((step, index) => (
        <div key={step.code} className="relative min-h-[108px] border border-line bg-paper p-3 sm:p-4">
          <span className="font-mono text-xs text-forest">{step.code}</span>
          <p className="mt-4 text-sm font-semibold leading-tight text-ink">{step.title}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{step.detail}</p>
          {index < 2 && <span className="absolute -right-2.5 top-1/2 z-10 hidden h-px w-3 bg-forest sm:block" aria-hidden="true" />}
        </div>
      ))}
    </div>

    <div className="my-5 flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-line" />
      <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">Compare · explain · review</span>
      <span className="h-px flex-1 bg-line" />
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div className="border-l-2 border-forest bg-paper px-4 py-3">
        <p className="text-sm font-semibold text-ink">Matched</p>
        <p className="mt-1 text-xs leading-5 text-muted">Records agree and can be traced.</p>
      </div>
      <div className="border-l-2 border-rust bg-paper px-4 py-3">
        <p className="text-sm font-semibold text-ink">Needs review</p>
        <p className="mt-1 text-xs leading-5 text-muted">Differences are sent to a human queue.</p>
      </div>
    </div>
    <p className="mt-4 text-[11px] leading-5 text-muted">Illustrative workflow — not a live data preview.</p>
  </div>
);

export const LandingPage: React.FC = () => {
  const { user, ready } = useAuth();
  const workspaceHref = ready && user ? '/dashboard' : '/login';
  const workspaceLabel = ready && user ? 'Open workspace' : 'Sign in';

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link to="/" className="flex items-center gap-3" aria-label="LedgerSense home">
          <BrandMark />
          <span className="text-lg font-semibold tracking-[-0.04em]">LedgerSense</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex" aria-label="Main navigation">
          <a className="transition-colors hover:text-ink" href="#how-it-works">How it works</a>
          <a className="transition-colors hover:text-ink" href="#workspace">Workspace</a>
        </nav>
        <Link to={workspaceHref} className="inline-flex min-h-11 items-center justify-center border border-ink bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-forest hover:border-forest">
          {workspaceLabel}
        </Link>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16 lg:grid-cols-[1fr_0.92fr] lg:gap-16 lg:px-12 lg:pb-28 lg:pt-20">
        <div className="max-w-2xl">
          <p className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-forest">
            <span className="h-px w-8 bg-forest" /> Payment reconciliation, made legible
          </p>
          <h1 className="font-display text-[2.75rem] leading-[0.99] tracking-[-0.045em] text-ink sm:text-6xl lg:text-[4.5rem]">
            Know where every payout stands.
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
            LedgerSense compares your order, payment-gateway, and bank records—then gives finance teams a clear place to review what does not match.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to={workspaceHref} className="inline-flex min-h-12 items-center justify-center gap-3 bg-forest px-6 text-sm font-semibold text-white transition-colors hover:bg-ink">
              {workspaceLabel}
              <span aria-hidden="true">→</span>
            </Link>
            <a href="#how-it-works" className="inline-flex min-h-12 items-center justify-center border border-line px-6 text-sm font-semibold text-ink transition-colors hover:border-ink">
              See how it works
            </a>
          </div>
          <p className="mt-5 text-xs leading-5 text-muted">A FIN-11 reconciliation project. No customer or certification claims are implied.</p>
        </div>
        <FlowIllustration />
      </section>

      <section id="how-it-works" className="border-y border-line bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest">How it works</p>
              <h2 className="mt-4 max-w-md font-display text-4xl leading-tight tracking-[-0.035em] sm:text-5xl">Three records. One reviewable close.</h2>
            </div>
            <div className="grid gap-0 sm:grid-cols-3">
              {[
                ['01', 'Bring records together', 'Compare internal orders with payment-gateway and bank-settlement records.'],
                ['02', 'Match with context', 'Follow references and amounts through the reconciliation path.'],
                ['03', 'Resolve the differences', 'Send unmatched items to a queue where a person can review the evidence.'],
              ].map(([number, title, body]) => (
                <article key={number} className="border-t border-line py-5 sm:border-l sm:border-t-0 sm:px-5 sm:first:border-l-0 sm:first:pl-0">
                  <span className="font-mono text-xs text-forest">{number}</span>
                  <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="workspace" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest">Inside the workspace</p>
            <h2 className="mt-4 max-w-xl font-display text-4xl leading-tight tracking-[-0.035em] sm:text-5xl">Built around the work, not a wall of charts.</h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-muted">Trace transactions across feeds, review exceptions, inspect settlement groups, and export a reconciliation report. The workspace shows only records returned by the API; it does not fill missing data with invented success states.</p>
        </div>
        <div className="mt-10 grid gap-0 border-y border-line sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Trace', 'Follow an order through its gateway and bank references.'],
            ['Review', 'Inspect discrepancies and record a decision.'],
            ['Settle', 'Compare settlement groups with bank credits.'],
            ['Report', 'Export the report returned by the API.'],
          ].map(([title, body]) => (
            <div key={title} className="border-b border-line py-5 sm:border-r sm:px-5 sm:last:border-r-0 lg:border-b-0 lg:first:pl-0">
              <h3 className="text-sm font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-4 border-l-2 border-rust bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-3xl text-sm leading-6 text-muted"><strong className="font-semibold text-ink">Data transparency.</strong> Live Nova ingestion is not implemented in the current backend. Bundled demonstration records are available only in explicitly selected non-production demo/test mode and are not live merchant or bank data.</p>
          <Link to={workspaceHref} className="inline-flex min-h-11 shrink-0 items-center justify-center border border-ink px-5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white">{workspaceLabel}</Link>
        </div>
      </section>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <span className="font-semibold text-ink">LedgerSense</span>
          <span>FIN-11 reconciliation project · Live source integration is not yet available in this build.</span>
        </div>
      </footer>
    </main>
  );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#17211C] selection:bg-[#1B4332]/10 selection:text-[#1B4332]">
      {/* Top Navigation Bar */}
      <header className="border-b border-[#E5E3DA] bg-[#F7F6F2]/90 backdrop-blur-xs sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded border border-[#17211C] bg-[#17211C] text-[#F7F6F2] flex items-center justify-center font-serif text-sm font-bold">
              L
            </div>
            <div>
              <span className="font-semibold tracking-tight text-sm text-[#17211C]">LedgerSense</span>
              <span className="ml-2 text-xs text-[#526058] font-mono">FIN-11</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B4332] hover:bg-[#143225] text-white text-xs font-medium rounded transition-colors cursor-pointer"
              >
                <span>Enter Workspace</span>
                <span>→</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B4332] hover:bg-[#143225] text-white text-xs font-medium rounded transition-colors cursor-pointer"
              >
                <span>Sign In</span>
                <span>→</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 space-y-16 sm:space-y-24">
        
        {/* Editorial Hero */}
        <section className="space-y-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#EAF2EC] border border-[#C8DFD1] text-[#1B4332] text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1B4332]" />
            <span>Deterministic Three-Way Reconciliation</span>
          </div>

          <h1 className="font-editorial text-4xl sm:text-5xl lg:text-6xl text-[#17211C] font-normal leading-[1.15] tracking-tight">
            LedgerSense compares order, gateway, and bank records, then surfaces mismatches for review.
          </h1>

          <p className="text-base sm:text-lg text-[#526058] leading-relaxed">
            A single payment generates events across multiple disconnected platforms. LedgerSense reconstructs
            the financial lifecycle from internal ERP capture to bank statement credit, pinpointing fee variances,
            timing lags, and missing credits with complete provenance.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <button
              onClick={() => navigate(user ? '/dashboard' : '/login')}
              className="w-full sm:w-auto px-6 py-3 bg-[#1B4332] hover:bg-[#143225] text-white text-sm font-medium rounded transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{user ? 'Go to Workbench' : 'Sign In to Operations Workspace'}</span>
              <span>→</span>
            </button>
            <span className="text-xs text-[#7E8C84]">
              Role-based access · Reviewer & Admin permissions
            </span>
          </div>
        </section>

        {/* Custom Accessible Flow Diagram */}
        <section className="space-y-4">
          <div className="border-b border-[#E5E3DA] pb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#526058]">
              Lifecycle Reconstruction Flow
            </h2>
          </div>

          <div className="bg-white border border-[#E5E3DA] rounded-lg p-6 sm:p-8 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              
              {/* Step 1: Internal Orders */}
              <div className="p-4 rounded border border-[#E5E3DA] bg-[#F7F6F2]/50 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[#7E8C84]">STREAM 01</span>
                  <span className="text-[11px] font-medium text-[#526058]">Source ERP</span>
                </div>
                <div className="font-semibold text-sm text-[#17211C]">Internal Orders</div>
                <p className="text-xs text-[#526058] leading-relaxed">
                  Merchant order identifiers, customer IDs, and expected gross transaction amounts.
                </p>
                <div className="pt-2 text-[11px] font-mono text-[#7E8C84] border-t border-[#E5E3DA]">
                  /api/payments
                </div>
              </div>

              {/* Step 2: Gateway Records */}
              <div className="p-4 rounded border border-[#E5E3DA] bg-[#F7F6F2]/50 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[#7E8C84]">STREAM 02</span>
                  <span className="text-[11px] font-medium text-[#526058]">Processor</span>
                </div>
                <div className="font-semibold text-sm text-[#17211C]">Gateway Captures</div>
                <p className="text-xs text-[#526058] leading-relaxed">
                  Processor payment IDs, MDR fee schedules, GST deductions, and net expected payouts.
                </p>
                <div className="pt-2 text-[11px] font-mono text-[#7E8C84] border-t border-[#E5E3DA]">
                  /api/gateway-transactions
                </div>
              </div>

              {/* Step 3: Bank Clearing */}
              <div className="p-4 rounded border border-[#E5E3DA] bg-[#F7F6F2]/50 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[#7E8C84]">STREAM 03</span>
                  <span className="text-[11px] font-medium text-[#526058]">Clearing</span>
                </div>
                <div className="font-semibold text-sm text-[#17211C]">Bank Statement Credits</div>
                <p className="text-xs text-[#526058] leading-relaxed">
                  Actual credited amounts, UTR reference codes, and settlement narration strings.
                </p>
                <div className="pt-2 text-[11px] font-mono text-[#7E8C84] border-t border-[#E5E3DA]">
                  /api/bank-transactions
                </div>
              </div>

              {/* Step 4: Reconciliation Outcome */}
              <div className="p-4 rounded border border-[#1B4332] bg-[#EAF2EC]/40 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[#1B4332] font-semibold">STAGE 07</span>
                  <span className="text-[11px] font-medium text-[#1B4332]">LedgerSense Engine</span>
                </div>
                <div className="font-semibold text-sm text-[#17211C]">Reconciliation Status</div>
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 rounded-full bg-[#1B4332] shrink-0" />
                    <span className="text-[#17211C] font-medium">Matched: Verified Settlement</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 rounded-full bg-[#B45309] shrink-0" />
                    <span className="text-[#17211C] font-medium">Pending: T+2 In-Flight Window</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 rounded-full bg-[#A34338] shrink-0" />
                    <span className="text-[#17211C] font-medium">Needs Review: Fee Mismatch / Gap</span>
                  </div>
                </div>
                <div className="pt-2 text-[11px] font-mono text-[#1B4332] border-t border-[#C8DFD1]">
                  /api/reconcile/run
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 3-Step Operations Walkthrough */}
        <section className="space-y-8">
          <div className="border-b border-[#E5E3DA] pb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#526058]">
              Operating Model
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="text-xs font-mono font-semibold text-[#1B4332]">01 / INGESTION</div>
              <h3 className="font-editorial text-xl text-[#17211C]">Multi-Source Stream Ingestion</h3>
              <p className="text-sm text-[#526058] leading-relaxed">
                Connects to payment processor and banking interfaces via authenticated feeds.
                Ingested batches retain exact timestamps, batch identifiers, and record-level provenance.
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-mono font-semibold text-[#1B4332]">02 / ENGINE</div>
              <h3 className="font-editorial text-xl text-[#17211C]">Deterministic 7-Stage Rules</h3>
              <p className="text-sm text-[#526058] leading-relaxed">
                Matches transactions through exact reference equality, UTR regex extraction, and weighted partial heuristics.
                Recalculates MDR fee and GST schedules with exact integer paise precision.
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-mono font-semibold text-[#1B4332]">03 / EXCEPTION</div>
              <h3 className="font-editorial text-xl text-[#17211C]">Audited Discrepancy Resolution</h3>
              <p className="text-sm text-[#526058] leading-relaxed">
                Reviewers evaluate flagged discrepancies in an exception queue with side-by-side evidence.
                Every decision (Approve, Reject, Escalate) is permanently recorded in an append-only audit trail.
              </p>
            </div>
          </div>
        </section>

        {/* Real App Capabilities */}
        <section className="space-y-6">
          <div className="border-b border-[#E5E3DA] pb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#526058]">
              Verified System Capabilities
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-[#E5E3DA] rounded">
              <div className="text-xs font-mono font-semibold text-[#17211C] mb-1">Zero Penny Rounding Drift</div>
              <p className="text-xs text-[#526058] leading-relaxed">
                All monetary computations use integer paise representations internally, eliminating floating-point rounding errors across high volumes.
              </p>
            </div>

            <div className="p-4 bg-white border border-[#E5E3DA] rounded">
              <div className="text-xs font-mono font-semibold text-[#17211C] mb-1">1:N Settlement Matching</div>
              <p className="text-xs text-[#526058] leading-relaxed">
                Aggregates individual payment captures into lump-sum bank settlement batches and verifies net credit equality with zero balance variance.
              </p>
            </div>

            <div className="p-4 bg-white border border-[#E5E3DA] rounded">
              <div className="text-xs font-mono font-semibold text-[#17211C] mb-1">Distributed Mutex Locking</div>
              <p className="text-xs text-[#526058] leading-relaxed">
                Prevents concurrent reconciliation runs across operators using atomic lock leases with safe local fallback.
              </p>
            </div>

            <div className="p-4 bg-white border border-[#E5E3DA] rounded">
              <div className="text-xs font-mono font-semibold text-[#17211C] mb-1">Append-Only Audit Trail</div>
              <p className="text-xs text-[#526058] leading-relaxed">
                Every operator review action, ingestion event, and reconciliation run generates an immutable audit record with user identity and timestamp.
              </p>
            </div>

            <div className="p-4 bg-white border border-[#E5E3DA] rounded">
              <div className="text-xs font-mono font-semibold text-[#17211C] mb-1">Formula-Safe CSV Exports</div>
              <p className="text-xs text-[#526058] leading-relaxed">
                Exported reconciliation reports neutralize spreadsheet formula injection characters to ensure safe analysis in Excel or Google Sheets.
              </p>
            </div>

            <div className="p-4 bg-white border border-[#E5E3DA] rounded">
              <div className="text-xs font-mono font-semibold text-[#17211C] mb-1">Source Contract Transparency</div>
              <p className="text-xs text-[#526058] leading-relaxed">
                Defaults to an explicit unconfigured state when external credentials are absent, rather than masking gaps with unauthenticated mock data.
              </p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="bg-white border border-[#E5E3DA] rounded-lg p-8 sm:p-12 text-center space-y-4">
          <h2 className="font-editorial text-2xl sm:text-3xl text-[#17211C]">
            Ready to inspect reconciliation records?
          </h2>
          <p className="text-xs sm:text-sm text-[#526058] max-w-xl mx-auto">
            Sign in to the operations workbench to review transaction streams, execute reconciliation runs, and inspect flagged discrepancies.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate(user ? '/dashboard' : '/login')}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1B4332] hover:bg-[#143225] text-white text-xs font-medium rounded transition-colors cursor-pointer"
            >
              <span>{user ? 'Return to Workbench' : 'Sign In to LedgerSense'}</span>
              <span>→</span>
            </button>
          </div>
        </section>

      </main>

      {/* Grounded Editorial Footer */}
      <footer className="border-t border-[#E5E3DA] bg-[#F7F6F2] py-8 text-xs text-[#7E8C84]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#17211C]">LedgerSense</span>
            <span>—</span>
            <span>FIN-11 End-to-End Payment Reconciliation & Settlement Engine</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono">Exact Paise Precision</span>
            <span>·</span>
            <button
              onClick={() => navigate('/login')}
              className="text-[#1B4332] hover:underline cursor-pointer font-medium"
            >
              Operator Sign In
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

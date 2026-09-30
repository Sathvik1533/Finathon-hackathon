import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { DiscrepancyCase } from '../../api/reconcile';
import { StatusBadge } from './StatusBadge';
import { DecisionForm } from '../forms/DecisionForm';

interface ExceptionDrawerProps {
  case_: DiscrepancyCase | null;
  onClose: () => void;
  onDecision: (caseId: string, decision: 'APPROVED' | 'REJECTED' | 'ESCALATED', rationale: string) => Promise<void>;
}

const money = (value: number) => `₹${(value / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const ExceptionDrawer: React.FC<ExceptionDrawerProps> = ({ case_, onClose, onDecision }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    if (!case_) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !submitting) onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [case_, onClose, submitting]);

  const handleDecision = async (decision: 'APPROVED' | 'REJECTED' | 'ESCALATED', rationale: string) => {
    if (!case_) return;
    setSubmitting(true); setError('');
    try {
      await onDecision(case_.caseId, decision, rationale);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The decision could not be saved.');
    } finally { setSubmitting(false); }
  };

  return (
    <AnimatePresence>
      {case_ && <>
        <motion.button key="exception-backdrop" type="button" aria-label="Close exception details" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 cursor-default bg-ink/35" />
        <motion.section key={`exception-${case_.caseId}`} role="dialog" aria-modal="true" aria-labelledby="exception-title" initial={{ y: '8%' }} animate={{ y: 0 }} exit={{ y: '8%' }} transition={{ duration: 0.2 }} className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col border-t border-line bg-white pb-[env(safe-area-inset-bottom)] shadow-soft sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-full sm:max-w-lg sm:border-l sm:border-t-0">
          <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div className="min-w-0"><p className="text-xs text-muted">Exception detail</p><div className="mt-1 flex flex-wrap items-center gap-2"><h2 id="exception-title" className="font-mono text-base font-semibold">{case_.caseId}</h2><StatusBadge status={case_.status} /></div></div>
            <button type="button" onClick={onClose} disabled={submitting} className="touch-target grid shrink-0 place-items-center border border-line text-muted hover:text-ink disabled:opacity-50" aria-label="Close exception detail"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            <section className="border border-line bg-paper p-4" aria-label="Record details">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted">Record</p>
              <Row label="Order reference" value={case_.orderId} mono />
              {case_.gatewayRef && <Row label="Gateway reference" value={case_.gatewayRef} mono />}
              <Row label="Detection stage" value={`Stage ${case_.stageIdentified}`} />
              <Row label="Discrepancy type" value={case_.discrepancyType.replace(/_/g, ' ').toLowerCase()} />
            </section>

            <section className="border-l-2 border-rust bg-[#faf2ee] p-4" aria-label="Amount details">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-rust">Amount details</p>
              <Row label="Amount at risk" value={money(case_.amountAtRisk)} mono emphasis />
              <Row label="Expected amount" value={money(case_.expectedAmount)} mono />
              <Row label="Actual amount" value={money(case_.actualAmount)} mono />
              <p className="mt-3 border-t border-[#e8d4cb] pt-3 text-sm leading-6 text-muted">{case_.details}</p>
            </section>

            <section className="border border-line p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Current API status</p>
              <div className="mt-2"><StatusBadge status={case_.status} size="md" /></div>
              {case_.status !== 'PENDING_REVIEW' && <p className="mt-3 text-sm leading-6 text-muted">The API returned this decision state. Audit persistence is determined by the configured backend.</p>}
            </section>

            {case_.status === 'PENDING_REVIEW' && <section>
              <h3 className="mb-3 text-sm font-semibold">Record a review decision</h3>
              {error && <p role="alert" className="mb-3 border-l-2 border-rust bg-[#faf2ee] px-3 py-2 text-sm leading-5 text-rust">{error}</p>}
              <DecisionForm onSubmit={handleDecision} submitting={submitting} />
            </section>}
          </div>
        </motion.section>
      </>}
    </AnimatePresence>
  );
};

function Row({ label, value, mono = false, emphasis = false }: { label: string; value: string; mono?: boolean; emphasis?: boolean }) {
  return <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-3 py-1.5 text-sm"><span className="text-muted">{label}</span><span className={`break-words text-right text-ink ${mono ? 'font-mono tabular-nums' : ''} ${emphasis ? 'font-semibold text-rust' : ''}`}>{value}</span></div>;
}

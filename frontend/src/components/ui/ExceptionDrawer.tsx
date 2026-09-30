import React, { useState } from 'react';
import type { DiscrepancyCase } from '../../api/reconcile';
import { StatusBadge } from './StatusBadge';
import { DecisionForm } from '../forms/DecisionForm';

interface ExceptionDrawerProps {
  case_: DiscrepancyCase | null;
  onClose: () => void;
  onDecision: (caseId: string, decision: 'APPROVED' | 'REJECTED' | 'ESCALATED', rationale: string) => Promise<void>;
}

export const ExceptionDrawer: React.FC<ExceptionDrawerProps> = ({ case_, onClose, onDecision }) => {
  const [submitting, setSubmitting] = useState(false);

  if (!case_) return null;

  const handleDecision = async (decision: 'APPROVED' | 'REJECTED' | 'ESCALATED', rationale: string) => {
    setSubmitting(true);
    try {
      await onDecision(case_.caseId, decision, rationale);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const paise = (v: number) => `₹${(v / 100).toFixed(2)}`;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-mono">{case_.caseId}</h2>
            <StatusBadge status={case_.discrepancyType} size="sm" />
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl p-1 rounded-lg hover:bg-slate-100 transition-colors">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Order info */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
            <Row label="Order ID" value={case_.orderId} mono />
            {case_.gatewayRef && <Row label="Gateway Ref" value={case_.gatewayRef} mono />}
            <Row label="Stage Identified" value={`Stage ${case_.stageIdentified}`} />
          </div>

          {/* Financial discrepancy */}
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-2.5">
            <div className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Financial Impact</div>
            <Row label="Amount at Risk" value={paise(case_.amountAtRisk)} mono valueClass="font-bold text-rose-700" />
            <Row label="Expected Amount" value={paise(case_.expectedAmount)} mono />
            <Row label="Actual Amount" value={paise(case_.actualAmount)} mono />
            <div className="pt-1 border-t border-rose-200 text-xs text-rose-600">{case_.details}</div>
          </div>

          {/* Current status */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">Current Status:</span>
            <StatusBadge status={case_.status} size="md" />
          </div>

          {/* Decision form */}
          {case_.status === 'PENDING_REVIEW' && (
            <DecisionForm onSubmit={handleDecision} submitting={submitting} />
          )}
          {case_.status !== 'PENDING_REVIEW' && (
            <div className="p-3 bg-slate-100 rounded-lg text-xs text-slate-500 text-center">
              Decision already recorded: <strong>{case_.status}</strong>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const Row: React.FC<{ label: string; value: string; mono?: boolean; valueClass?: string }> = ({
  label, value, mono, valueClass,
}) => (
  <div className="flex justify-between items-center text-xs">
    <span className="text-slate-500">{label}</span>
    <span className={`font-medium text-slate-900 ${mono ? 'font-mono tabular-nums' : ''} ${valueClass ?? ''}`}>
      {value}
    </span>
  </div>
);

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DiscrepancyCase } from '../../api/reconcile';
import { StatusBadge } from './StatusBadge';
import { DecisionForm } from '../forms/DecisionForm';
import { CANONICAL_EASE } from '../../utils/motion';

interface ExceptionDrawerProps {
  case_: DiscrepancyCase | null;
  onClose: () => void;
  onDecision: (caseId: string, decision: 'APPROVED' | 'REJECTED' | 'ESCALATED', rationale: string) => Promise<void>;
}

export const ExceptionDrawer: React.FC<ExceptionDrawerProps> = ({ case_, onClose, onDecision }) => {
  const [submitting, setSubmitting] = useState(false);

  const handleDecision = async (decision: 'APPROVED' | 'REJECTED' | 'ESCALATED', rationale: string) => {
    if (!case_) return;
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
    <AnimatePresence>
      {case_ && (
        <>
          {/* Backdrop with Fade */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40"
            onClick={onClose}
          />

          {/* Drawer with Slide-In matching DESIGN-BIBLE Part 5 */}
          <motion.div
            key="drawer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.35, ease: CANONICAL_EASE }}
            className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#f4f5f7]">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 font-mono">{case_.caseId}</h2>
                  <span className="text-[10px] font-mono uppercase bg-[#e6f7ef] text-[#006241] border border-[#c1ebd5] px-2 py-0.5 rounded-full font-bold">
                    Stage {case_.stageIdentified}
                  </span>
                </div>
                <div className="mt-1">
                  <StatusBadge status={case_.discrepancyType} size="sm" />
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-white transition-colors cursor-pointer text-sm"
              >
                ✕
              </motion.button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Order info */}
              <div className="bg-[#f4f5f7] rounded-2xl p-4 space-y-2.5 border border-slate-200/70">
                <Row label="Order ID" value={case_.orderId} mono />
                {case_.gatewayRef && <Row label="Gateway Ref" value={case_.gatewayRef} mono />}
                <Row label="Detection Stage" value={`Stage ${case_.stageIdentified} Deterministic Engine`} />
              </div>

              {/* Financial discrepancy */}
              <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 space-y-2.5">
                <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Financial Risk Exposure</div>
                <Row label="Amount at Risk" value={paise(case_.amountAtRisk)} mono valueClass="font-bold text-rose-700 text-sm" />
                <Row label="Expected Amount" value={paise(case_.expectedAmount)} mono />
                <Row label="Actual Captured" value={paise(case_.actualAmount)} mono />
                <div className="pt-2 border-t border-rose-200/60 text-xs text-rose-700 leading-relaxed">{case_.details}</div>
              </div>

              {/* Current status */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-xs text-slate-500 font-semibold">Governance Status</span>
                <StatusBadge status={case_.status} size="md" />
              </div>

              {/* Decision form */}
              {case_.status === 'PENDING_REVIEW' && (
                <div className="pt-2">
                  <div className="text-xs font-bold text-slate-800 mb-3">Record Operational Decision</div>
                  <DecisionForm onSubmit={handleDecision} submitting={submitting} />
                </div>
              )}
              {case_.status !== 'PENDING_REVIEW' && (
                <div className="p-4 bg-[#e6f7ef] border border-[#c1ebd5] rounded-2xl text-xs text-[#006241] text-center font-medium">
                  ✓ Decision logged permanently in tamper-proof audit trail: <strong>{case_.status}</strong>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const Row: React.FC<{ label: string; value: string; mono?: boolean; valueClass?: string }> = ({
  label, value, mono, valueClass,
}) => (
  <div className="flex justify-between items-center text-xs">
    <span className="text-slate-500 font-medium">{label}</span>
    <span className={`text-slate-900 ${mono ? 'font-mono tabular-nums font-semibold' : ''} ${valueClass ?? ''}`}>
      {value}
    </span>
  </div>
);

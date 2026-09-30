import React from 'react';

const STAGES = [
  { key: 'txn_id_match',    label: 'ID Match',      desc: 'Exact order_ref' },
  { key: 'reference_match', label: 'Ref Match',      desc: 'UTR regex' },
  { key: 'partial_match',   label: 'Partial Match',  desc: 'Weighted score' },
  { key: 'fee_calculation', label: 'Fee Calc',       desc: 'MDR + GST' },
  { key: 'refund_handling', label: 'Refunds',        desc: 'Reversal netting' },
  { key: 'settlement_match','label': 'Settlement',    desc: '1:N grouping' },
  { key: 'classification',  label: 'Risk Rank',      desc: 'Sort by exposure' },
];

interface StageProgressProps {
  completedStages?: number;
  activeStage?: string;
}

export const StageProgress: React.FC<StageProgressProps> = ({
  completedStages = 0,
  activeStage,
}) => (
  <div className="w-full">
    <div className="flex items-start gap-0">
      {STAGES.map((stage, idx) => {
        const done = idx < completedStages;
        const active = stage.key === activeStage || idx === completedStages;
        return (
          <React.Fragment key={stage.key}>
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                done
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : active && completedStages > 0
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-slate-300 text-slate-400'
              }`}>
                {done ? '✓' : idx + 1}
              </div>
              <div className={`text-[10px] mt-1.5 font-semibold text-center leading-tight ${done ? 'text-emerald-600' : active ? 'text-blue-600' : 'text-slate-400'}`}>
                {stage.label}
              </div>
              <div className="text-[9px] text-slate-400 text-center">{stage.desc}</div>
            </div>
            {idx < STAGES.length - 1 && (
              <div className={`flex-none h-0.5 w-4 mt-4 ${idx < completedStages ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

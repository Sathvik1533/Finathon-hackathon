import React, { useState } from 'react';

interface DecisionFormProps {
  onSubmit: (decision: 'APPROVED' | 'REJECTED' | 'ESCALATED', rationale: string) => Promise<void>;
  submitting: boolean;
}

export const DecisionForm: React.FC<DecisionFormProps> = ({ onSubmit, submitting }) => {
  const [rationale, setRationale] = useState('');
  const [selected, setSelected] = useState<'APPROVED' | 'REJECTED' | 'ESCALATED' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    await onSubmit(selected, rationale);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-slate-200 rounded-xl p-4 bg-white">
      <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Record Your Decision</div>

      {/* Decision buttons */}
      <div className="grid grid-cols-3 gap-2">
        {(['APPROVED', 'REJECTED', 'ESCALATED'] as const).map(d => (
          <button
            key={d}
            type="button"
            onClick={() => setSelected(d)}
            className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all ${
              selected === d
                ? d === 'APPROVED'
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : d === 'REJECTED'
                  ? 'bg-rose-600 border-rose-600 text-white'
                  : 'bg-purple-600 border-purple-600 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Rationale */}
      <div>
        <label className="block text-xs text-slate-500 mb-1.5">Rationale (required)</label>
        <textarea
          value={rationale}
          onChange={e => setRationale(e.target.value)}
          rows={3}
          required
          placeholder="Explain your decision..."
          className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={!selected || !rationale.trim() || submitting}
        className="w-full py-2 px-4 rounded-lg bg-blue-600 text-white text-xs font-bold disabled:opacity-40 hover:bg-blue-700 transition-colors"
      >
        {submitting ? 'Saving...' : 'Confirm Decision'}
      </button>
    </form>
  );
};

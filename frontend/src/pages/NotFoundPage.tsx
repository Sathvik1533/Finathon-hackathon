import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { buttonPressProps } from '../utils/motion';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center p-4 antialiased text-slate-900 selection:bg-[#006241]/20 selection:text-[#006241]">
      <div className="w-full max-w-lg bg-white rounded-3xl p-8 sm:p-10 shadow-card border border-slate-200 text-center space-y-6">
        
        {/* Error Code & Icon */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-mono font-bold tracking-wide">
            HTTP 404 · NOT FOUND
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
            Resource Not Located
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
            The requested reconciliation path or financial record does not exist on this LedgerSense host.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <motion.button
            {...buttonPressProps}
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#006241] hover:bg-[#004e34] text-white rounded-full text-xs font-semibold shadow-pill transition-colors cursor-pointer"
          >
            ← Return to Workbench
          </motion.button>
          <motion.button
            {...buttonPressProps}
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-xs font-semibold transition-colors cursor-pointer"
          >
            Go to Sign In
          </motion.button>
        </div>

        {/* Diagnostic Footer */}
        <div className="pt-4 border-t border-slate-100 text-[11px] font-mono text-slate-400 flex items-center justify-between">
          <span>FIN-11 Engine Router</span>
          <span>Deterministic Fallback</span>
        </div>

      </div>
    </div>
  );
};

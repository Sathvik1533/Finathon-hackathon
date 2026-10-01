import React from 'react';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center p-4 text-[#17211C]">
      <div className="w-full max-w-md bg-white rounded-lg p-8 border border-[#E5E3DA] shadow-xs text-center space-y-6">
        
        {/* Error Code */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#F7F6F2] border border-[#E5E3DA] text-[#526058] text-xs font-mono">
            HTTP 404 · NOT FOUND
          </div>
          <h1 className="font-editorial text-3xl text-[#17211C] font-normal pt-1">
            Resource Not Located
          </h1>
          <p className="text-xs text-[#526058] leading-relaxed max-w-sm mx-auto">
            The requested reconciliation path, batch identifier, or financial record does not exist on this LedgerSense host.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#1B4332] hover:bg-[#143225] text-white rounded text-xs font-medium transition-colors cursor-pointer"
          >
            ← Return to Workbench
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-[#F7F6F2] border border-[#E5E3DA] text-[#526058] rounded text-xs font-medium transition-colors cursor-pointer"
          >
            Product Overview
          </button>
        </div>

        {/* Diagnostic Footer */}
        <div className="pt-4 border-t border-[#E5E3DA] text-[11px] font-mono text-[#7E8C84] flex items-center justify-between">
          <span>FIN-11 Engine Router</span>
          <span>Deterministic Path</span>
        </div>

      </div>
    </div>
  );
};

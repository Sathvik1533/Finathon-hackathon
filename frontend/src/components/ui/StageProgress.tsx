import React from 'react';
export const StageProgress = ({ stage }: { stage: number }) => (
  <div className="w-full bg-gray-200 rounded-full h-2.5">
    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(stage / 7) * 100}%` }}></div>
  </div>
);

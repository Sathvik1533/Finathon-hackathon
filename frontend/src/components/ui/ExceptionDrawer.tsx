import React from 'react';
export const ExceptionDrawer = ({ isOpen, onClose, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l border-[#e2e8f0] p-6 z-50">
      <button onClick={onClose} className="mb-4 text-gray-500">Close</button>
      {children}
    </div>
  );
};

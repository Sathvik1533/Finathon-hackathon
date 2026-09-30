import React, { useState } from 'react';
export const DecisionForm = ({ onSubmit }: any) => {
  const [decision, setDecision] = useState('APPROVE');
  return (
    <div className="flex flex-col gap-4 mt-4">
      <select className="border p-2 rounded" value={decision} onChange={e => setDecision(e.target.value)}>
        <option value="APPROVE">Approve</option>
        <option value="REJECT">Reject</option>
        <option value="ESCALATE">Escalate</option>
      </select>
      <button onClick={() => onSubmit(decision)} className="bg-blue-600 text-white p-2 rounded">Submit Decision</button>
    </div>
  );
};

import React from 'react';
import { PageShell } from '../components/layout/PageShell';
export const TimelinePage = () => (
  <PageShell title="Multi-Stream Timeline">
    <p>Select ORD-101 to see 4 data streams side by side.</p>
    <div className="grid grid-cols-4 gap-4 mt-4">
      <div className="border p-4 bg-gray-50">Internal Order</div>
      <div className="border p-4 bg-gray-50">Gateway Capture</div>
      <div className="border p-4 bg-gray-50">Refund/Reversal</div>
      <div className="border p-4 bg-gray-50">Bank Settlement</div>
    </div>
  </PageShell>
);

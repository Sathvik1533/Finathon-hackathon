import React, { useState } from 'react';
import { PageShell } from '../components/layout/PageShell';
import { DataTable } from '../components/ui/DataTable';
import { ExceptionDrawer } from '../components/ui/ExceptionDrawer';
import { DecisionForm } from '../components/forms/DecisionForm';
export const ExceptionsPage = () => {
  const [open, setOpen] = useState(false);
  return (
    <PageShell title="Exceptions Queue">
      <DataTable columns={[{key: 'id', label: 'ID'}, {key: 'type', label: 'Type'}, {key: 'amount', label: 'Amount Risk'}]} data={[]} />
      <button onClick={() => setOpen(true)} className="mt-4 bg-gray-200 px-4 py-2 rounded">Open Drawer</button>
      <ExceptionDrawer isOpen={open} onClose={() => setOpen(false)}>
        <h3 className="font-bold text-lg">Review Case</h3>
        <DecisionForm onSubmit={(d: string) => { console.log(d); setOpen(false); }} />
      </ExceptionDrawer>
    </PageShell>
  );
};

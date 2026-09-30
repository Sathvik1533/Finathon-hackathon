import React from 'react';
import { PageShell } from '../components/layout/PageShell';
import { NovaStreamCard } from '../components/ui/NovaStreamCard';
export const NovaExplorerPage = () => (
  <PageShell title="Nova 4-Source Explorer">
    <div className="grid grid-cols-2 gap-4">
      <NovaStreamCard title="/payments" data={[]} />
      <NovaStreamCard title="/gateway-transactions" data={[]} />
      <NovaStreamCard title="/bank-transactions" data={[]} />
      <NovaStreamCard title="/settlements" data={[]} />
    </div>
  </PageShell>
);
